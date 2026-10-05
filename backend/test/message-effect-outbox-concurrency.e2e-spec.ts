import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { MessageEffectOutbox, MessageEffectState } from '../src/modules/notification/entities/message-effect-outbox.entity';
import { MessageEffectOutboxService } from '../src/modules/notification/message-effect-outbox.service';

describe('message effect outbox concurrency (MySQL)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let outbox: MessageEffectOutboxService;
  const orderId = Date.now() * 10;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    outbox = app.get(MessageEffectOutboxService);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.getRepository(MessageEffectOutbox).delete({ orderId });
    }
    await app?.close();
  });

  it('persists one order event and gives its delivery lease to only one worker', async () => {
    const first = await dataSource.transaction((manager) =>
      outbox.enqueueWithManager(manager, orderId, 'order.created'));
    const replay = await dataSource.transaction((manager) =>
      outbox.enqueueWithManager(manager, orderId, 'order.created'));
    expect(Number(replay.id)).toBe(Number(first.id));

    const options = { limit: 100, maxAttempts: 8, leaseMs: 60_000 };
    const [a, b] = await Promise.all([
      outbox.claimDue({ ...options, owner: 'worker-a' }),
      outbox.claimDue({ ...options, owner: 'worker-b' }),
    ]);
    const claims = [...a, ...b].filter((effect) => Number(effect.id) === Number(first.id));
    expect(claims).toHaveLength(1);
    expect(await dataSource.getRepository(MessageEffectOutbox).findOne({ where: { id: first.id } }))
      .toMatchObject({ state: MessageEffectState.PROCESSING, attemptCount: 1 });
  });
});
