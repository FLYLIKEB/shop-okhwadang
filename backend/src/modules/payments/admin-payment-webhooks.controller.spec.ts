import { BadRequestException } from '@nestjs/common';
import { AdminPaymentWebhooksController } from './admin-payment-webhooks.controller';
import { PaymentWebhookState } from './entities/payment-webhook-event.entity';

const receipt = (overrides: Record<string, unknown> = {}) => ({
  id: 4, replayable: true, rawBody: Buffer.from('{}'), signatureValue: 'sig', normalizedMetadata: {},
  state: PaymentWebhookState.FAILED, result: null, attemptCount: 2, ...overrides,
});

describe('AdminPaymentWebhooksController durability actions', () => {
  const build = (event: ReturnType<typeof receipt> | null = receipt(), affected = 1) => {
    const execute = jest.fn().mockResolvedValue({ affected });
    const qb = { update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), execute };
    const manager = { findOne: jest.fn().mockResolvedValue(event), getRepository: jest.fn().mockReturnValue({ createQueryBuilder: jest.fn().mockReturnValue(qb) }) };
    const repo = {
      manager: {
        transaction: jest.fn(
          async (fn: (transactionManager: typeof manager) => Promise<unknown>) => fn(manager),
        ),
      },
      createQueryBuilder: jest.fn(),
    };
    const audit = { logWithManager: jest.fn() };
    const messages = { reconcileDelivered: jest.fn().mockResolvedValue(true) };
    return { controller: new AdminPaymentWebhooksController(repo as never, audit as never, messages as never), manager, execute, audit, messages };
  };
  const actor = { id: 9, role: 'admin' };

  it('rejects blank replay reasons and missing, unsigned, or wrong-state receipts', async () => {
    await expect(build().controller.replay(4, ' ', actor)).rejects.toBeInstanceOf(BadRequestException);
    for (const event of [null, receipt({ rawBody: null }), receipt({ state: PaymentWebhookState.SUCCEEDED })]) {
      await expect(build(event).controller.replay(4, 'recover', actor)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('queues a signed failed receipt and audits the transition', async () => {
    const { controller, audit, execute } = build();
    await expect(controller.replay(4, ' recover ', actor)).resolves.toEqual({ queued: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(audit.logWithManager).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ resourceId: 4, afterJson: expect.objectContaining({ reason: 'recover' }) }));
  });

  it('rejects a replay CAS loss before writing an audit record', async () => {
    const { controller, audit } = build(receipt(), 0);
    await expect(controller.replay(4, 'recover', actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(audit.logWithManager).not.toHaveBeenCalled();
  });

  it('requires reconciliation evidence and rolls back when no delivery can be reconciled', async () => {
    await expect(build().controller.reconcileMessageDelivery('effect', ' ', 'provider', actor)).rejects.toBeInstanceOf(BadRequestException);
    const absent = build(); absent.messages.reconcileDelivered.mockResolvedValue(false);
    await expect(absent.controller.reconcileMessageDelivery('effect', 'reason', ' provider ', actor)).rejects.toBeInstanceOf(BadRequestException);
    expect(absent.audit.logWithManager).not.toHaveBeenCalled();
  });

  it('reconciles a provider delivery and audits normalized operator evidence', async () => {
    const { controller, messages, audit } = build();
    await expect(controller.reconcileMessageDelivery('effect', ' reason ', ' provider ', actor)).resolves.toEqual({ reconciled: true });
    expect(messages.reconcileDelivered).toHaveBeenCalledWith('effect', 'provider', expect.anything());
    expect(audit.logWithManager).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ afterJson: expect.objectContaining({ reason: 'reason', providerMessageId: 'provider' }) }));
  });
});
