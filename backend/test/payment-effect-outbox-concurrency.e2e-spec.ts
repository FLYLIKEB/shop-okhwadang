import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, QueryRunner } from 'typeorm';
import { AppModule } from '../src/app.module';
import {
  PaymentEffectOutbox,
  PaymentEffectState,
  PaymentEffectType,
} from '../src/modules/payments/entities/payment-effect-outbox.entity';
import { PaymentEffectOutboxService } from '../src/modules/payments/services/payment-effect-outbox.service';

const TEST_TIMEOUT_MS = 10_000;
const RUN_ID = `payment-effect-outbox-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const MAX_ATTEMPTS = 3;

describe('payment effect outbox exhaustion concurrency (MySQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let orderId: number;

  const repository = () => dataSource.getRepository(PaymentEffectOutbox);

  async function seed(
    offset: number,
    state: PaymentEffectState,
    attemptCount: number,
    options: Partial<PaymentEffectOutbox> = {},
  ): Promise<PaymentEffectOutbox> {
    return repository().save({
      orderId: orderId + offset,
      effectType: PaymentEffectType.ORDER_COMPLETED_EVENT,
      state,
      payload: { runId: RUN_ID, offset },
      evidence: { runId: RUN_ID, offset },
      attemptCount,
      nextAttemptAt: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      lastError: null,
      processedAt: null,
      ...options,
    });
  }

  async function exhaustWithRunner(runner: QueryRunner, now: Date): Promise<number> {
    return new PaymentEffectOutboxService(
      runner.manager.getRepository(PaymentEffectOutbox),
    ).exhaustDueRetries(MAX_ATTEMPTS, now);
  }

  beforeAll(async () => {
    jest.setTimeout(TEST_TIMEOUT_MS);
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    orderId = Date.now() * 10;
  });

  afterEach(async () => {
    if (dataSource) {
      await repository().createQueryBuilder().delete()
        .where('order_id >= :start AND order_id < :end', { start: orderId, end: orderId + 10 })
        .execute();
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('allows one MySQL terminalization winner and preserves the provider diagnostic', async () => {
    const now = new Date('2026-08-17T00:00:00.000Z');
    const providerFailure = 'provider timeout: request req_123 was not acknowledged';
    const target = await seed(1, PaymentEffectState.PROCESSING, MAX_ATTEMPTS, {
      leaseOwner: 'dead-worker',
      leaseExpiresAt: new Date(now.getTime() - 1_000),
      lastError: providerFailure,
    });
    const activeProcessing = await seed(2, PaymentEffectState.PROCESSING, MAX_ATTEMPTS, {
      leaseOwner: 'live-worker',
      leaseExpiresAt: new Date(now.getTime() + 60_000),
      lastError: 'active lease diagnostic',
    });
    const succeeded = await seed(3, PaymentEffectState.SUCCEEDED, MAX_ATTEMPTS, {
      lastError: 'success terminal diagnostic',
      processedAt: now,
    });
    const manualReview = await seed(4, PaymentEffectState.MANUAL_REVIEW, MAX_ATTEMPTS, {
      lastError: 'manual terminal diagnostic',
    });
    const pendingBelowMax = await seed(5, PaymentEffectState.PENDING, MAX_ATTEMPTS - 1, {
      lastError: 'pending diagnostic',
    });
    const failedNotDue = await seed(6, PaymentEffectState.FAILED, MAX_ATTEMPTS, {
      nextAttemptAt: new Date(now.getTime() + 60_000),
      lastError: 'not due diagnostic',
    });

    const first = dataSource.createQueryRunner();
    const second = dataSource.createQueryRunner();
    await Promise.all([first.connect(), second.connect()]);
    try {
      const results = await Promise.all([
        exhaustWithRunner(first, now),
        exhaustWithRunner(second, now),
      ]);
      expect(results.sort((a, b) => a - b)).toEqual([0, 1]);
    } finally {
      await Promise.all([first.release(), second.release()]);
    }

    const rows = await repository().findByIds([
      target.id,
      activeProcessing.id,
      succeeded.id,
      manualReview.id,
      pendingBelowMax.id,
      failedNotDue.id,
    ]);
    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    const exhausted = byId.get(Number(target.id))!;
    expect(exhausted).toMatchObject({
      state: PaymentEffectState.MANUAL_REVIEW,
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
      lastError: providerFailure,
    });
    expect(byId.get(Number(activeProcessing.id))).toMatchObject({
      state: PaymentEffectState.PROCESSING,
      leaseOwner: 'live-worker',
      lastError: 'active lease diagnostic',
    });
    expect(byId.get(Number(succeeded.id))).toMatchObject({ state: PaymentEffectState.SUCCEEDED });
    expect(byId.get(Number(manualReview.id))).toMatchObject({ state: PaymentEffectState.MANUAL_REVIEW });
    expect(byId.get(Number(failedNotDue.id))).toMatchObject({ state: PaymentEffectState.FAILED });

    const claims = await new PaymentEffectOutboxService(repository()).claimDue({
      owner: 'later-worker',
      limit: 1_000,
      maxAttempts: MAX_ATTEMPTS,
      leaseMs: 1_000,
      now: new Date(now.getTime() + 1_000),
    });
    const claimedIds = claims.map((effect) => Number(effect.id));
    expect(claimedIds).toContain(Number(pendingBelowMax.id));
    expect(claimedIds).not.toContain(Number(target.id));
    expect(claimedIds).not.toContain(Number(activeProcessing.id));
    expect(claimedIds).not.toContain(Number(succeeded.id));
    expect(claimedIds).not.toContain(Number(manualReview.id));
    expect(claimedIds).not.toContain(Number(failedNotDue.id));
  }, TEST_TIMEOUT_MS);
});
