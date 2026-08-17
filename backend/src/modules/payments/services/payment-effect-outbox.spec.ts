import { PaymentEffectOutbox, PaymentEffectState, PaymentEffectType } from '../entities/payment-effect-outbox.entity';
import { PaymentEffectOutboxService } from './payment-effect-outbox.service';
import { PaymentEffectOutboxWorker } from './payment-effect-outbox.worker';
import { AmbiguousMessageDeliveryError, MessageDeliveryInProgressError } from '../../notification/interfaces/message-provider.interface';

const effect = (overrides: Partial<PaymentEffectOutbox> = {}): PaymentEffectOutbox => ({
  id: 7, orderId: 11, effectType: PaymentEffectType.ORDER_COMPLETED_EVENT,
  state: PaymentEffectState.PROCESSING, payload: { orderNumber: 'ORD-1' }, evidence: { orderNumber: 'ORD-1' },
  attemptCount: 1, nextAttemptAt: null, leaseOwner: 'worker-a', leaseExpiresAt: new Date(), lastError: null,
  processedAt: null, createdAt: new Date(), ...overrides,
});

describe('PaymentEffectOutbox core', () => {
  it('keeps one immutable intent when confirmation and webhook enqueue the same effect', async () => {
    const existing = effect({ state: PaymentEffectState.PENDING, payload: { source: 'confirmation' } });
    const repository = {
      insert: jest.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' }),
      create: jest.fn((value) => value),
      findOne: jest.fn().mockResolvedValue(existing),
    };
    const service = new PaymentEffectOutboxService({} as never);
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const result = await service.enqueueWithManager(manager as never, 11, PaymentEffectType.ORDER_COMPLETED_EVENT, { source: 'webhook' });
    expect(result).toBe(existing);
    expect(repository.insert).toHaveBeenCalledTimes(1);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { orderId: 11, effectType: PaymentEffectType.ORDER_COMPLETED_EVENT } });
    expect(existing.payload).toEqual({ source: 'confirmation' });
  });

  it('returns the inserted row, propagates non-duplicate inserts, and detects a vanished duplicate row', async () => {
    const created = effect({ id: 99 });
    const repository = {
      insert: jest.fn().mockResolvedValue({ identifiers: [{ id: 99 }] }),
      create: jest.fn((value) => value),
      findOne: jest.fn().mockResolvedValue(created),
    };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const service = new PaymentEffectOutboxService({} as never);
    await expect(service.enqueueWithManager(manager as never, 11, PaymentEffectType.ORDER_COMPLETED_EVENT, { nested: { value: 1 } })).resolves.toBe(created);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 99 } });

    repository.insert.mockRejectedValueOnce(new Error('db unavailable'));
    await expect(service.enqueueWithManager(manager as never, 11, PaymentEffectType.ORDER_COMPLETED_EVENT, {})).rejects.toThrow('db unavailable');
    repository.insert.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });
    repository.findOne.mockResolvedValueOnce(null);
    await expect(service.enqueueWithManager(manager as never, 11, PaymentEffectType.ORDER_COMPLETED_EVENT, {})).rejects.toThrow('did not return a row');
  });

  it('returns no claim for an empty queue and skips candidates whose conditional lease update loses', async () => {
    const exhaust = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const select = { where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(), getMany: jest.fn().mockResolvedValue([]) };
    const repository = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(exhaust)
        .mockReturnValueOnce(select),
    };
    const service = new PaymentEffectOutboxService(repository as never);
    await expect(service.claimDue({ owner: 'a', limit: 2, maxAttempts: 3, leaseMs: 100, now: new Date() })).resolves.toEqual([]);

    const update = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({ affected: 0 }) };
    select.getMany.mockResolvedValue([effect({ state: PaymentEffectState.FAILED })]);
    repository.createQueryBuilder
      .mockReturnValueOnce(exhaust)
      .mockReturnValueOnce(select)
      .mockReturnValueOnce(update);
    await expect(service.claimDue({ owner: 'a', limit: 2, maxAttempts: 3, leaseMs: 100, now: new Date() })).resolves.toEqual([]);
    expect(update.andWhere).toHaveBeenCalledTimes(2);
  });

  it('terminalizes exhausted dead-worker leases once and never reclaims them', async () => {
    const now = new Date('2026-08-17T00:00:00.000Z');
    const exhaust = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn()
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 }),
    };
    const select = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(exhaust)
        .mockReturnValueOnce(select)
        .mockReturnValueOnce(exhaust)
        .mockReturnValueOnce(select),
    };
    const service = new PaymentEffectOutboxService(repository as never);

    await expect(service.claimDue({
      owner: 'worker-b',
      limit: 10,
      maxAttempts: 3,
      leaseMs: 1000,
      now,
    })).resolves.toEqual([]);
    await expect(service.claimDue({
      owner: 'worker-c',
      limit: 10,
      maxAttempts: 3,
      leaseMs: 1000,
      now,
    })).resolves.toEqual([]);

    expect(exhaust.execute).toHaveBeenCalledTimes(2);
    expect(exhaust.set).toHaveBeenCalledWith(expect.objectContaining({
      state: PaymentEffectState.MANUAL_REVIEW,
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
    }));
    expect(exhaust.set.mock.calls[0][0]).not.toHaveProperty('lastError');
    expect(exhaust.where).toHaveBeenCalledWith(
      'attempt_count >= :maxAttempts',
      { maxAttempts: 3 },
    );
  });

  it('allows only one concurrent exhaustion sweep winner', async () => {
    const execute = jest.fn()
      .mockResolvedValueOnce({ affected: 1 })
      .mockResolvedValueOnce({ affected: 0 });
    const makeQuery = () => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute,
    });
    const repository = { createQueryBuilder: jest.fn(() => makeQuery()) };
    const service = new PaymentEffectOutboxService(repository as never);

    const results = await Promise.all([
      service.exhaustDueRetries(3, new Date()),
      service.exhaustDueRetries(3, new Date()),
    ]);

    expect(results.sort()).toEqual([0, 1]);
  });

  it.each([
    ['a pending effect', PaymentEffectState.PENDING, null, null],
    ['a failed effect due for retry', PaymentEffectState.FAILED, new Date('2026-08-17T00:00:00.000Z'), null],
    ['an expired processing lease', PaymentEffectState.PROCESSING, null, new Date('2026-08-17T00:00:00.000Z')],
  ])('targets exhausted %s while preserving a null diagnostic', async (_description, _state, _nextAttemptAt, _leaseExpiresAt) => {
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new PaymentEffectOutboxService({ createQueryBuilder: jest.fn().mockReturnValue(query) } as never);

    await expect(service.exhaustDueRetries(3, new Date('2026-08-17T00:00:01.000Z'))).resolves.toBe(1);

    expect(query.set).toHaveBeenCalledWith({
      state: PaymentEffectState.MANUAL_REVIEW,
      leaseOwner: null,
      leaseExpiresAt: null,
      nextAttemptAt: null,
    });
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('state = :pending'),
      expect.objectContaining({
        pending: PaymentEffectState.PENDING,
        failed: PaymentEffectState.FAILED,
        processing: PaymentEffectState.PROCESSING,
      }),
    );
  });

  it('limits exhaustion to due states at the attempt ceiling and leaves the existing diagnostic untouched', async () => {
    const query = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    const service = new PaymentEffectOutboxService({ createQueryBuilder: jest.fn().mockReturnValue(query) } as never);

    await expect(service.exhaustDueRetries(3, new Date('2026-08-17T00:00:00.000Z'))).resolves.toBe(0);

    expect(query.where).toHaveBeenCalledWith('attempt_count >= :maxAttempts', { maxAttempts: 3 });
    expect(query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('lease_expires_at <= :now'),
      expect.objectContaining({ now: new Date('2026-08-17T00:00:00.000Z') }),
    );
    expect(query.set.mock.calls[0][0]).not.toHaveProperty('lastError');
  });

  it('fences stale workers and sends exhausted effects to manual review', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 0 });
    const service = new PaymentEffectOutboxService({ update } as never);
    await expect(service.markSucceeded(7, 'worker-b')).resolves.toBe(false);
    expect(update).toHaveBeenCalledWith(
      { id: 7, state: PaymentEffectState.PROCESSING, leaseOwner: 'worker-b' }, expect.any(Object),
    );
    update.mockResolvedValue({ affected: 1 });
    await service.markFailed(effect({ attemptCount: 3 }), 'worker-a', 3, new Error('boom'));
    expect(update.mock.calls[1][1]).toMatchObject({ state: PaymentEffectState.MANUAL_REVIEW, nextAttemptAt: null });
  });

  it('uses a bounded claim, retries throwing effects, and supplies an idempotency key', async () => {
    const claimed = effect();
    const outbox = {
      claimDue: jest.fn().mockResolvedValue([claimed]),
      markSucceeded: jest.fn(),
      markFailed: jest.fn(),
    };
    const collaborators = {
      orderCompleted: { deliver: jest.fn().mockRejectedValue(new Error('temporary')) },
      paymentConfirmedNotification: { deliver: jest.fn() },
      memberMessageNotification: { deliver: jest.fn() },
    };
    const worker = new PaymentEffectOutboxWorker(outbox as never, collaborators);
    await expect(worker.drain({ owner: 'worker-a', batchSize: 10, maxAttempts: 3, leaseMs: 1000 })).resolves.toBe(1);
    expect(outbox.claimDue).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, maxAttempts: 3 }));
    expect(collaborators.orderCompleted.deliver).toHaveBeenCalledWith({ orderNumber: 'ORD-1' }, 'payment-effect:7');
    expect(outbox.markFailed).toHaveBeenCalledWith(claimed, 'worker-a', 3, expect.any(Error));
  });
  it('moves an ambiguous message effect directly to manual review without a retry', async () => {
    const claimed = effect({ effectType: PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION });
    const outbox = { claimDue: jest.fn().mockResolvedValue([claimed]), markSucceeded: jest.fn(), markFailed: jest.fn(), markManualReview: jest.fn() };
    const collaborators = { orderCompleted: { deliver: jest.fn() }, paymentConfirmedNotification: { deliver: jest.fn().mockRejectedValue(new AmbiguousMessageDeliveryError('unknown', 'payment-effect:7')) }, memberMessageNotification: { deliver: jest.fn() } };
    const worker = new PaymentEffectOutboxWorker(outbox as never, collaborators);
    await worker.drain({ owner: 'worker-a', batchSize: 10, maxAttempts: 3, leaseMs: 1000 });
    expect(outbox.markManualReview).toHaveBeenCalledWith(7, 'worker-a', expect.any(AmbiguousMessageDeliveryError));
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });

  it('retries a fresh message processing reservation instead of marking it delivered', async () => {
    const claimed = effect({ effectType: PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION });
    const outbox = { claimDue: jest.fn().mockResolvedValue([claimed]), markSucceeded: jest.fn(), markFailed: jest.fn(), markManualReview: jest.fn() };
    const collaborators = {
      orderCompleted: { deliver: jest.fn() },
      paymentConfirmedNotification: { deliver: jest.fn().mockRejectedValue(new MessageDeliveryInProgressError('payment-effect:7')) },
      memberMessageNotification: { deliver: jest.fn() },
    };
    const worker = new PaymentEffectOutboxWorker(outbox as never, collaborators);

    await worker.drain({ owner: 'worker-b', batchSize: 10, maxAttempts: 3, leaseMs: 1000 });

    expect(outbox.markFailed).toHaveBeenCalledWith(claimed, 'worker-b', 3, expect.any(MessageDeliveryInProgressError));
    expect(outbox.markSucceeded).not.toHaveBeenCalled();
    expect(outbox.markManualReview).not.toHaveBeenCalled();
  });

  it('moves an ambiguous message effect directly to manual review without a retry', async () => {
    const claimed = effect({ effectType: PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION });
    const outbox = { claimDue: jest.fn().mockResolvedValue([claimed]), markSucceeded: jest.fn(), markFailed: jest.fn(), markManualReview: jest.fn() };
    const collaborators = { orderCompleted: { deliver: jest.fn() }, paymentConfirmedNotification: { deliver: jest.fn().mockRejectedValue(new AmbiguousMessageDeliveryError('unknown', 'payment-effect:7')) }, memberMessageNotification: { deliver: jest.fn() } };
    const worker = new PaymentEffectOutboxWorker(outbox as never, collaborators);
    await worker.drain({ owner: 'worker-a', batchSize: 10, maxAttempts: 3, leaseMs: 1000 });
    expect(outbox.markManualReview).toHaveBeenCalledWith(7, 'worker-a', expect.any(AmbiguousMessageDeliveryError));
    expect(outbox.markFailed).not.toHaveBeenCalled();
  });
});
