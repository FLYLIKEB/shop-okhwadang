import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping } from '../payments/entities/shipping.entity';
import { NotificationConfig, NOTIFICATION_CONFIG } from '../../config/notification.config';
import { NotificationLog, NotificationResourceType } from './entities/notification-log.entity';
import {
  MessageProvider,
  MessageTemplateKey,
  TransactionalMessageChannel,
} from './interfaces/message-provider.interface';
import { buildTransactionalMessage } from './templates/message-templates';

export const MESSAGE_PROVIDER_TOKEN = 'MessageProvider';

type EventType = 'order.created' | 'payment.confirmed' | 'order.cancelled' | 'shipping.started' | 'shipping.delivered';

interface DispatchContext {
  eventType: EventType;
  templateKey: MessageTemplateKey;
  resourceType: NotificationResourceType;
  resourceId: number;
  order: Order;
  payment?: Payment | null;
  shipping?: Shipping | null;
  paymentMethod?: string;
  cancelReason?: string;
}

@Injectable()
export class MessageNotificationService {
  private readonly logger = new Logger(MessageNotificationService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
    private readonly dataSource: DataSource,
    @Inject(MESSAGE_PROVIDER_TOKEN)
    private readonly provider: MessageProvider,
    @Inject(NOTIFICATION_CONFIG)
    private readonly config: NotificationConfig,
  ) {}

  async sendOrderCreated(orderId: number): Promise<void> {
    const order = await this.findOrder(orderId);
    if (!order) return;
    await this.dispatch({
      eventType: 'order.created',
      templateKey: 'ORDER_CREATED',
      resourceType: 'order',
      resourceId: orderId,
      order,
    });
  }

  async sendPaymentConfirmed(orderId: number, paymentMethod?: string): Promise<void> {
    const [order, payment] = await Promise.all([
      this.findOrder(orderId),
      this.dataSource.getRepository(Payment).findOne({ where: { orderId } }),
    ]);
    if (!order) return;
    await this.dispatch({
      eventType: 'payment.confirmed',
      templateKey: 'PAYMENT_CONFIRMED',
      resourceType: 'payment',
      resourceId: Number(payment?.id ?? orderId),
      order,
      payment,
      paymentMethod,
    });
  }

  async sendOrderCancelled(orderId: number, cancelReason: string): Promise<void> {
    const order = await this.findOrder(orderId);
    if (!order) return;
    await this.dispatch({
      eventType: 'order.cancelled',
      templateKey: 'ORDER_CANCELLED',
      resourceType: 'order',
      resourceId: orderId,
      order,
      cancelReason,
    });
  }

  async sendShippingStarted(orderId: number): Promise<void> {
    const [order, shipping] = await Promise.all([
      this.findOrder(orderId),
      this.dataSource.getRepository(Shipping).findOne({ where: { orderId } }),
    ]);
    if (!order) return;
    await this.dispatch({
      eventType: 'shipping.started',
      templateKey: 'SHIPPING_STARTED',
      resourceType: 'shipping',
      resourceId: Number(shipping?.id ?? orderId),
      order,
      shipping,
    });
  }

  async sendShippingDelivered(orderId: number): Promise<void> {
    const [order, shipping] = await Promise.all([
      this.findOrder(orderId),
      this.dataSource.getRepository(Shipping).findOne({ where: { orderId } }),
    ]);
    if (!order) return;
    await this.dispatch({
      eventType: 'shipping.delivered',
      templateKey: 'SHIPPING_DELIVERED',
      resourceType: 'shipping',
      resourceId: Number(shipping?.id ?? orderId),
      order,
      shipping,
    });
  }

  private async dispatch(context: DispatchContext): Promise<void> {
    let recipientPhoneHash: string | undefined;
    let recipientPhoneMasked: string | undefined;

    try {
      const recipientPhone = this.pickRecipientPhone(context.order);
      const templateId = this.config.message.templates[context.templateKey];

      if (!recipientPhone) {
        await this.saveLog(context, {
          status: 'skipped',
          channel: 'kakao_alimtalk',
          errorMessage: '수신 가능한 전화번호가 없습니다.',
        });
        return;
      }

      const normalizedPhone = this.normalizePhone(recipientPhone);
      recipientPhoneHash = this.hashPhone(normalizedPhone);
      recipientPhoneMasked = this.maskPhone(normalizedPhone);

      if (!templateId) {
        await this.saveLog(context, {
          status: 'skipped',
          channel: 'kakao_alimtalk',
          recipientPhoneHash,
          recipientPhoneMasked,
          errorMessage: `${context.templateKey} 템플릿 ID가 설정되지 않았습니다.`,
        });
        return;
      }

      const duplicate = await this.logRepository.findOne({
        where: {
          eventType: context.eventType,
          resourceType: context.resourceType,
          resourceId: context.resourceId,
          recipientPhoneHash,
          status: 'sent',
        },
      });

      if (duplicate) {
        return;
      }

      const message = buildTransactionalMessage(context.templateKey, {
        order: context.order,
        payment: context.payment,
        shipping: context.shipping,
        paymentMethod: context.paymentMethod,
        cancelReason: context.cancelReason,
        templateId,
        smsFallbackEnabled: this.config.message.smsFallbackEnabled,
      });

      const result = await this.provider.send({
        to: normalizedPhone,
        ...message,
      });

      await this.saveLog(context, {
        status: result.status,
        channel: result.channel,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        recipientPhoneHash,
        recipientPhoneMasked,
        errorMessage: result.errorMessage,
      });
    } catch (err) {
      this.logger.warn(`거래 메시지 발송 실패 event=${context.eventType} resourceId=${context.resourceId}: ${String(err)}`);
      await this.saveLog(context, {
        status: 'failed',
        channel: 'kakao_alimtalk',
        recipientPhoneHash,
        recipientPhoneMasked,
        errorMessage: String(err).slice(0, 500),
      });
    }
  }

  private async findOrder(orderId: number): Promise<Order | null> {
    return this.dataSource.getRepository(Order).findOne({
      where: { id: orderId },
      relations: ['user'],
    });
  }

  private pickRecipientPhone(order: Order): string | null {
    return order.recipientPhone || order.user?.phone || null;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private hashPhone(phone: string): string {
    return createHash('sha256')
      .update(`${this.config.message.phoneHashSalt}:${phone}`)
      .digest('hex');
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) return '****';
    if (phone.length <= 7) return `${phone.slice(0, 3)}****`;
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }

  private async saveLog(
    context: DispatchContext,
    values: {
      status: 'sent' | 'failed' | 'skipped';
      channel: TransactionalMessageChannel;
      provider?: string;
      providerMessageId?: string;
      recipientPhoneHash?: string;
      recipientPhoneMasked?: string;
      errorMessage?: string;
    },
  ): Promise<void> {
    await this.logRepository.save({
      eventType: context.eventType,
      channel: values.channel,
      provider: values.provider ?? this.config.message.provider,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      recipientPhoneHash: values.recipientPhoneHash ?? null,
      recipientPhoneMasked: values.recipientPhoneMasked ?? null,
      templateKey: context.templateKey,
      providerMessageId: values.providerMessageId ?? null,
      status: values.status,
      errorMessage: values.errorMessage ? values.errorMessage.slice(0, 500) : null,
      sentAt: values.status === 'sent' ? new Date() : null,
    });
  }
}
