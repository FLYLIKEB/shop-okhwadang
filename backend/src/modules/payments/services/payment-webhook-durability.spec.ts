import { PaymentWebhookReceiptWorkerService } from './payment-webhook-receipt-worker.service';
import { PaymentWebhookResult, PaymentWebhookState } from '../entities/payment-webhook-event.entity';

const receipt = (overrides: Record<string, unknown> = {}) => ({
  id: 1, state: PaymentWebhookState.PROCESSING, leaseOwner: 'owner', replayable: true,
  rawBody: Buffer.from('{"eventId":"evt-1"}'), signatureValue: 'signature',
  normalizedMetadata: { eventId: 'evt-1' }, attemptCount: 1, maxAttempts: 3,
  ...overrides,
});

describe('PaymentWebhookReceiptWorkerService', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const build = (event = receipt()) => {
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const repository = { findOne: jest.fn().mockResolvedValue(event), update, createQueryBuilder: jest.fn() };
    const completion = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({ affected: 1 }) };
    const manager = { findOne: jest.fn().mockResolvedValue(event), createQueryBuilder: jest.fn().mockReturnValue(completion) };
    const dataSource = { transaction: jest.fn(async (fn) => fn(manager)) };
    const verify = jest.fn().mockResolvedValue(true);
    const apply = jest.fn().mockResolvedValue(PaymentWebhookResult.SUCCESS);
    return {
      worker: new PaymentWebhookReceiptWorkerService({
        repository: repository as never,
        dataSource: dataSource as never,
        verify,
        apply,
        now: () => now,
      }),
      repository,
      dataSource,
      verify,
      apply,
      completion,
    };
  };

  it('replays only immutable stored evidence and owner-fences completion', async () => {
    const { worker, verify, apply, completion } = build();
    expect(await worker.processClaimed({ id: 1, owner: 'owner' })).toBe(true);
    expect(verify).toHaveBeenCalledWith(Buffer.from('{"eventId":"evt-1"}'), 'signature', expect.anything());
    expect(apply).toHaveBeenCalledWith({ eventId: 'evt-1' }, expect.anything());
    expect(completion.where).toHaveBeenCalledWith('id = :id AND state = :state AND lease_owner = :owner', expect.objectContaining({ owner: 'owner' }));
  });

  it('rejects stale owners without applying domain changes', async () => {
    const { worker, apply } = build(receipt({ leaseOwner: 'new-owner' }));
    expect(await worker.processClaimed({ id: 1, owner: 'owner' })).toBe(false);
    expect(apply).not.toHaveBeenCalled();
  });

  it('sends missing signed evidence to manual review', async () => {
    const { worker, repository } = build(receipt({ rawBody: null }));
    expect(await worker.processClaimed({ id: 1, owner: 'owner' })).toBe(false);
    expect(repository.update).toHaveBeenCalledWith(expect.objectContaining({ leaseOwner: 'owner' }), expect.objectContaining({ state: PaymentWebhookState.MANUAL_REVIEW }));
  });

  it('backs off transient failures and preserves a crash boundary', async () => {
    const { worker, repository } = build(receipt({ attemptCount: 1, maxAttempts: 3 }));
    expect(await worker.fail({ id: 1, owner: 'owner' }, new Error('crash boundary'))).toBe(true);
    expect(repository.update).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ state: PaymentWebhookState.PENDING, nextAttemptAt: new Date('2026-01-01T00:00:01.000Z') }));
  });

  it('does not claim a receipt when the conditional update loses a race', async () => {
    const chain = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), execute: jest.fn().mockResolvedValue({ affected: 0 }) };
    const { worker, repository } = build();
    repository.createQueryBuilder.mockReturnValue(chain);
    await expect(worker.claim(1)).resolves.toBeNull();
    expect(chain.andWhere).toHaveBeenCalledTimes(2);
  });

  it('sends failed verification and verification errors through the fenced failure paths', async () => {
    const failed = build();
    failed.verify.mockResolvedValue(false);
    await expect(failed.worker.processClaimed({ id: 1, owner: 'owner' })).resolves.toBe(false);
    expect(failed.repository.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ state: PaymentWebhookState.MANUAL_REVIEW }));

    const thrown = build();
    thrown.verify.mockRejectedValue(new Error('bad verifier'));
    await expect(thrown.worker.processClaimed({ id: 1, owner: 'owner' })).rejects.toThrow('bad verifier');
    expect(thrown.repository.update).not.toHaveBeenCalled();
  });

  it('does not overwrite a receipt when failure loses its owner fence and exhausts retries into manual review', async () => {
    const stale = build();
    stale.repository.update.mockResolvedValue({ affected: 0 });
    await expect(stale.worker.fail({ id: 1, owner: 'owner' }, 'lost')).resolves.toBe(false);

    const exhausted = build(receipt({ attemptCount: 3, maxAttempts: 3 }));
    await expect(exhausted.worker.fail({ id: 1, owner: 'owner' }, 'final')).resolves.toBe(true);
    expect(exhausted.repository.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      state: PaymentWebhookState.MANUAL_REVIEW, lastError: 'final',
    }));
  });

  it('does not complete domain work when the transaction lock is missing or completion is stale', async () => {
    const missing = build();
    missing.dataSource.transaction.mockImplementation(
      async (fn: (manager: { findOne: jest.Mock }) => Promise<unknown>) =>
        fn({ findOne: jest.fn().mockResolvedValue(null) }),
    );
    await expect(missing.worker.processClaimed({ id: 1, owner: 'owner' })).resolves.toBe(false);
    expect(missing.apply).not.toHaveBeenCalled();

    const stale = build();
    stale.completion.execute.mockResolvedValue({ affected: 0 });
    await expect(stale.worker.processClaimed({ id: 1, owner: 'owner' })).resolves.toBe(false);
    expect(stale.repository.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ state: PaymentWebhookState.PENDING }));
  });
});
