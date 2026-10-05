import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping } from '../payments/entities/shipping.entity';
import { PaymentEffectOutbox, PaymentEffectType } from '../payments/entities/payment-effect-outbox.entity';
import { NotificationLog } from '../notification/entities/notification-log.entity';
import { MessageEffectOutbox } from '../notification/entities/message-effect-outbox.entity';
import { MessageNotificationService } from '../notification/message-notification.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { AuditAction } from '../audit-logs/entities/audit-log.entity';

@Controller('admin/orders/:orderId/message-deliveries')
@Roles('admin', 'super_admin')
export class AdminMessageDeliveriesController {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(Shipping) private readonly shippings: Repository<Shipping>,
    @InjectRepository(NotificationLog) private readonly logs: Repository<NotificationLog>,
    @InjectRepository(MessageEffectOutbox) private readonly effects: Repository<MessageEffectOutbox>,
    @InjectRepository(PaymentEffectOutbox) private readonly paymentEffects: Repository<PaymentEffectOutbox>,
    private readonly dataSource: DataSource,
    private readonly messageNotifications: MessageNotificationService,
    private readonly auditLogs: AuditLogService,
  ) {}

  @Get()
  async list(@Param('orderId', ParseIntPipe) orderId: number) {
    if (!await this.orders.findOne({ where: { id: orderId } })) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }
    const [payments, shippings, effects, paymentEffects] = await Promise.all([
      this.payments.find({ where: { orderId } }),
      this.shippings.find({ where: { orderId } }),
      this.effects.find({ where: { orderId }, order: { createdAt: 'DESC' } }),
      this.paymentEffects.find({
        where: [
          { orderId, effectType: PaymentEffectType.MEMBER_MESSAGE_NOTIFICATION },
          { orderId, effectType: PaymentEffectType.GUEST_MESSAGE_NOTIFICATION },
        ],
        order: { createdAt: 'DESC' },
      }),
    ]);
    const where: { resourceType: NotificationLog['resourceType']; resourceId: number }[] = [
      { resourceType: 'order', resourceId: orderId },
      ...payments.map((payment) => ({ resourceType: 'payment' as const, resourceId: Number(payment.id) })),
      ...shippings.map((shipping) => ({ resourceType: 'shipping' as const, resourceId: Number(shipping.id) })),
    ];
    const logs = await this.logs.find({ where, order: { createdAt: 'DESC' }, take: 50 });
    return {
      logs: logs.map((log) => ({
        id: log.id,
        eventType: log.eventType,
        channel: log.channel,
        provider: log.provider,
        templateKey: log.templateKey,
        providerMessageId: log.providerMessageId,
        effectKey: log.effectKey,
        status: log.status,
        errorMessage: log.errorMessage,
        sentAt: log.sentAt,
        createdAt: log.createdAt,
        recipientPhoneMasked: log.recipientPhoneMasked,
      })),
      effects: [...effects.map((effect) => ({
        id: effect.id,
        effectKey: `message-effect:${effect.id}`,
        eventType: effect.eventType,
        state: effect.state,
        attemptCount: effect.attemptCount,
        nextAttemptAt: effect.nextAttemptAt,
        lastError: effect.lastError,
        createdAt: effect.createdAt,
      })), ...paymentEffects.map((effect) => ({
        id: effect.id,
        effectKey: `payment-effect:${effect.id}`,
        eventType: 'payment.confirmed',
        state: effect.state,
        attemptCount: effect.attemptCount,
        nextAttemptAt: effect.nextAttemptAt,
        lastError: effect.lastError,
        createdAt: effect.createdAt,
      }))],
    };
  }

  @Post(':effectKey/reconcile')
  async reconcile(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('effectKey') effectKey: string,
    @Body('reason') reason: string,
    @Body('providerMessageId') providerMessageId: string,
    @CurrentUser() actor: { id: number; role: string },
  ): Promise<{ reconciled: boolean }> {
    if (!reason?.trim() || !providerMessageId?.trim()) {
      throw new BadRequestException('정합화 사유와 제공자 메시지 ID가 필요합니다.');
    }
    await this.dataSource.transaction(async (manager) => {
      const log = await manager.getRepository(NotificationLog).findOne({ where: { effectKey } });
      const messageId = /^message-effect:(\d+)$/.exec(effectKey)?.[1];
      const paymentId = /^payment-effect:(\d+)$/.exec(effectKey)?.[1];
      const effect = messageId
        ? await manager.getRepository(MessageEffectOutbox).findOne({ where: { id: Number(messageId), orderId } })
        : paymentId
          ? await manager.getRepository(PaymentEffectOutbox).findOne({ where: { id: Number(paymentId), orderId } })
          : null;
      if (!effect || effect.state !== 'MANUAL_REVIEW') {
        throw new BadRequestException('주문과 연결된 수동 확인 대상 메시지 작업이 아닙니다.');
      }
      if (!log || !['manual_review', 'sent'].includes(log.status)) {
        throw new BadRequestException('수동 확인 대상 메시지를 찾을 수 없습니다.');
      }

      const reconciled = await this.messageNotifications.reconcileDelivered(effectKey, providerMessageId.trim(), manager);
      if (!reconciled) throw new BadRequestException('메시지 전달 상태가 이미 변경됐습니다.');
      await this.auditLogs.logWithManager(manager, {
        actorId: Number(actor.id), actorRole: actor.role, action: AuditAction.ORDER_STATUS_UPDATE,
        resourceType: 'message_delivery', resourceId: orderId,
        beforeJson: { effectKey, status: log.status },
        afterJson: { effectKey, providerMessageId: providerMessageId.trim(), reason: reason.trim(), status: 'sent' },
      });
    });
    return { reconciled: true };
  }
}
