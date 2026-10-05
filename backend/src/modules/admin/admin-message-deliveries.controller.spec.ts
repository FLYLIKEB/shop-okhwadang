import { BadRequestException } from '@nestjs/common';
import { AdminMessageDeliveriesController } from './admin-message-deliveries.controller';
import { NotificationLog } from '../notification/entities/notification-log.entity';
import { MessageEffectOutbox } from '../notification/entities/message-effect-outbox.entity';

describe('AdminMessageDeliveriesController', () => {
  const orders = { findOne: jest.fn() };
  const payments = { find: jest.fn() };
  const shippings = { find: jest.fn() };
  const logs = { find: jest.fn(), findOne: jest.fn() };
  const effects = { find: jest.fn(), findOne: jest.fn() };
  const paymentEffects = { find: jest.fn() };
  const auditLogs = { logWithManager: jest.fn() };
  const messageNotifications = { reconcileDelivered: jest.fn() };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === NotificationLog) return logs;
      if (entity === MessageEffectOutbox) return effects;
      throw new Error('Unexpected entity');
    }),
  };
  const dataSource = { transaction: jest.fn(async (work: (value: typeof manager) => Promise<unknown>) => work(manager)) };
  let controller: AdminMessageDeliveriesController;

  beforeEach(() => {
    jest.clearAllMocks();
    orders.findOne.mockResolvedValue({ id: 12 });
    payments.find.mockResolvedValue([{ id: 22 }]);
    shippings.find.mockResolvedValue([{ id: 32 }]);
    effects.find.mockResolvedValue([{ id: 5, orderId: 12, eventType: 'shipping.started', state: 'PENDING' }]);
    paymentEffects.find.mockResolvedValue([{ id: 5, orderId: 12, state: 'FAILED' }]);
    effects.findOne.mockResolvedValue({ id: 5, orderId: 12, state: 'MANUAL_REVIEW' });
    logs.find.mockResolvedValue([{ id: 7, eventType: 'shipping.started', status: 'manual_review', recipientPhoneMasked: '010****1234', recipientPhoneHash: 'private-hash' }]);
    logs.findOne.mockResolvedValue({ id: 7, effectKey: 'message-effect:5', status: 'manual_review' });
    messageNotifications.reconcileDelivered.mockResolvedValue(true);
    auditLogs.logWithManager.mockResolvedValue(undefined);
    controller = new AdminMessageDeliveriesController(
      orders as never, payments as never, shippings as never, logs as never,
      effects as never, paymentEffects as never, dataSource as never, messageNotifications as never, auditLogs as never,
    );
  });

  it('lists order, payment and shipping delivery logs without phone hashes', async () => {
    const result = await controller.list(12);

    expect(logs.find).toHaveBeenCalledWith(expect.objectContaining({
      where: [
        { resourceType: 'order', resourceId: 12 },
        { resourceType: 'payment', resourceId: 22 },
        { resourceType: 'shipping', resourceId: 32 },
      ],
    }));
    expect(result.effects.map((effect) => effect.effectKey)).toEqual(['message-effect:5', 'payment-effect:5']);
    expect(JSON.stringify(result)).not.toContain('private-hash');
  });

  it('rejects reconciliation for a different order effect', async () => {
    effects.findOne.mockResolvedValue(null);

    await expect(controller.reconcile(12, 'message-effect:5', 'confirmed', 'solapi-5', { id: 1, role: 'admin' }))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(messageNotifications.reconcileDelivered).not.toHaveBeenCalled();
    expect(auditLogs.logWithManager).not.toHaveBeenCalled();
  });

  it('reconciles a manual-review delivery and writes an audit event', async () => {
    await expect(controller.reconcile(12, 'message-effect:5', 'provider confirmed', ' solapi-5 ', { id: 1, role: 'admin' }))
      .resolves.toEqual({ reconciled: true });
    expect(messageNotifications.reconcileDelivered).toHaveBeenCalledWith('message-effect:5', 'solapi-5', manager);
    expect(auditLogs.logWithManager).toHaveBeenCalledWith(manager, expect.objectContaining({
      resourceType: 'message_delivery', resourceId: 12,
    }));
  });

  it('settles a manual-review effect whose provider acceptance was already logged', async () => {
    logs.findOne.mockResolvedValue({ id: 7, effectKey: 'message-effect:5', status: 'sent' });

    await expect(controller.reconcile(12, 'message-effect:5', 'accepted before worker crash', 'solapi-5', { id: 1, role: 'admin' }))
      .resolves.toEqual({ reconciled: true });
    expect(messageNotifications.reconcileDelivered).toHaveBeenCalledWith('message-effect:5', 'solapi-5', manager);
  });
});
