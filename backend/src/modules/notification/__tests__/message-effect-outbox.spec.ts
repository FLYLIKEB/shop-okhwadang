import { AmbiguousMessageDeliveryError } from '../interfaces/message-provider.interface';
import { MessageEffectOutbox, MessageEffectState } from '../entities/message-effect-outbox.entity';
import { MessageEffectOutboxService } from '../message-effect-outbox.service';
import { MessageEffectOutboxWorker } from '../message-effect-outbox.worker';

const effect = (overrides: Partial<MessageEffectOutbox> = {}): MessageEffectOutbox => ({
  id: 7, orderId: 11, eventType: 'shipping.started', state: MessageEffectState.PROCESSING,
  attemptCount: 1, nextAttemptAt: null, leaseOwner: 'worker-a', leaseExpiresAt: new Date(),
  lastError: null, processedAt: null, createdAt: new Date(), ...overrides,
});

describe('MessageEffectOutbox', () => {
  it('returns the original intent when the same event is enqueued twice', async () => {
    const existing = effect({ state: MessageEffectState.PENDING });
    const repository = { insert: jest.fn().mockRejectedValue({ code: 'ER_DUP_ENTRY' }), findOne: jest.fn().mockResolvedValue(existing) };
    const manager = { getRepository: jest.fn().mockReturnValue(repository) };
    const service = new MessageEffectOutboxService({} as never);

    await expect(service.enqueueWithManager(manager as never, 11, 'shipping.started')).resolves.toBe(existing);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { orderId: 11, eventType: 'shipping.started' } });
    expect(repository.insert).toHaveBeenCalledWith({ orderId: 11, eventType: 'shipping.started', state: MessageEffectState.PENDING });
  });

  it('claims only the winner of a conditional lease update', async () => {
    const query = (result?: unknown) => ({
      update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([effect()]), execute: jest.fn().mockResolvedValue(result),
    });
    const exhaust = query({ affected: 0 });
    const select = query();
    const lease = query({ affected: 0 });
    const repository = { createQueryBuilder: jest.fn().mockReturnValueOnce(exhaust).mockReturnValueOnce(select).mockReturnValueOnce(lease) };
    const service = new MessageEffectOutboxService(repository as never);

    await expect(service.claimDue({ owner: 'worker-b', limit: 1, maxAttempts: 3, leaseMs: 1000 })).resolves.toEqual([]);
    expect(lease.andWhere).toHaveBeenCalledWith('attempt_count < :maxAttempts', { maxAttempts: 3 });
  });

  it('fences stale workers and caps retries', async () => {
    const update = jest.fn().mockResolvedValueOnce({ affected: 0 }).mockResolvedValueOnce({ affected: 1 });
    const service = new MessageEffectOutboxService({ update } as never);
    await expect(service.markSucceeded(7, 'worker-b')).resolves.toBe(false);
    await expect(service.markFailed(effect({ attemptCount: 3 }), 'worker-a', 3, new Error('private phone 01012345678'))).resolves.toBe(true);
    expect(update.mock.calls[1][1]).toMatchObject({ state: MessageEffectState.MANUAL_REVIEW, nextAttemptAt: null, lastError: 'Error' });
  });

  it('retries a temporary error with backoff and clears the lease on success', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const service = new MessageEffectOutboxService({ update } as never);
    const now = new Date('2026-10-05T00:00:00.000Z');

    await expect(service.markFailed(effect({ attemptCount: 2 }), 'worker-a', 3, new Error('temporary'), now)).resolves.toBe(true);
    expect(update.mock.calls[0][1]).toMatchObject({
      state: MessageEffectState.FAILED,
      nextAttemptAt: new Date(now.getTime() + 2000),
      leaseOwner: null,
      leaseExpiresAt: null,
    });
    await expect(service.markSucceeded(7, 'worker-a', now)).resolves.toBe(true);
    expect(update.mock.calls[1][1]).toMatchObject({ state: MessageEffectState.SUCCEEDED, processedAt: now, lastError: null });
  });

  it('delivers with a stable key and sends ambiguous results to manual review', async () => {
    const outbox = {
      claimDue: jest.fn().mockResolvedValue([effect()]), markSucceeded: jest.fn(), markFailed: jest.fn(), markManualReview: jest.fn(),
    };
    const delivery = { deliver: jest.fn().mockRejectedValue(new AmbiguousMessageDeliveryError('unknown', 'message-effect:7')) };
    const worker = new MessageEffectOutboxWorker(outbox as never, delivery);

    await expect(worker.drain({ owner: 'worker-a', batchSize: 10, maxAttempts: 3, leaseMs: 1000 })).resolves.toBe(1);
    expect(delivery.deliver).toHaveBeenCalledWith(11, 'shipping.started', 'message-effect:7');
    expect(outbox.markManualReview).toHaveBeenCalledWith(7, 'worker-a', expect.any(AmbiguousMessageDeliveryError));
    expect(outbox.markFailed).not.toHaveBeenCalled();
    expect(outbox.markSucceeded).not.toHaveBeenCalled();
  });
});
