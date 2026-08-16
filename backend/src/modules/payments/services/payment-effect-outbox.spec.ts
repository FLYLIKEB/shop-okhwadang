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
