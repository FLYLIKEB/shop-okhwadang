import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping } from '../payments/entities/shipping.entity';
import { NotificationConfig, NOTIFICATION_CONFIG } from '../../config/notification.config';
import { NotificationLog, NotificationResourceType } from './entities/notification-log.entity';
import {
  AmbiguousMessageDeliveryError,
  MessageDeliveryInProgressError,
  MessageProvider,
  MessageTemplateKey,
  TransactionalMessageChannel,
  MessageSendResult,
} from './interfaces/message-provider.interface';
import { buildTransactionalMessage } from './templates/message-templates';
import { PaymentEffectOutbox, PaymentEffectState } from '../payments/entities/payment-effect-outbox.entity';

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

  async sendPaymentConfirmed(orderId: number, paymentMethod?: string, _idempotencyKey?: string): Promise<void> {
    await this.sendPaymentConfirmedInternal(orderId, paymentMethod);
  }

  async sendPaymentConfirmedOrThrow(
    orderId: number,
    paymentMethod: string | undefined,
    idempotencyKey: string,
  ): Promise<void> {
    await this.sendPaymentConfirmedInternal(orderId, paymentMethod, idempotencyKey, true);
  }

  private async sendPaymentConfirmedInternal(
    orderId: number,
    paymentMethod?: string,
    effectKey?: string,
    strict = false,
  ): Promise<void> {
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
    }, effectKey, strict);
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

  private async dispatch(context: DispatchContext, effectKey?: string, strict = false): Promise<void> {
    if (!effectKey) return this.dispatchLegacy(context);
    const recipientPhone = this.pickRecipientPhone(context.order);
    const templateId = this.config.message.templates[context.templateKey];
    const normalizedPhone = recipientPhone ? this.normalizePhone(recipientPhone) : '';
    const recipientPhoneHash = normalizedPhone ? this.hashPhone(normalizedPhone) : null;
    const recipientPhoneMasked = normalizedPhone ? this.maskPhone(normalizedPhone) : null;
    const log = await this.reserve(effectKey, context, recipientPhoneHash, recipientPhoneMasked);
    if (!log || log.status === 'sent') return;
    if (log.status === 'manual_review') {
      if (strict) throw new AmbiguousMessageDeliveryError('Message delivery requires provider reconciliation', effectKey);
      return;
    }
    if (log.status === 'processing') {
      if (strict) throw new MessageDeliveryInProgressError(effectKey);
      return;
    }
    if (!recipientPhone || !templateId) {
      await this.transition(effectKey, 'processing', { status: 'skipped', errorMessage: recipientPhone ? `${context.templateKey} 템플릿 ID가 설정되지 않았습니다.` : '수신 가능한 전화번호가 없습니다.' });
      return;
    }
    const message = buildTransactionalMessage(context.templateKey, { order: context.order, payment: context.payment, shipping: context.shipping, paymentMethod: context.paymentMethod, cancelReason: context.cancelReason, templateId, smsFallbackEnabled: this.config.message.smsFallbackEnabled });
    let result: MessageSendResult;
    try {
      result = await this.provider.send({ to: normalizedPhone, ...message, idempotencyKey: effectKey });
    } catch (error) {
      if (error instanceof AmbiguousMessageDeliveryError) {
        if (await this.markUnknown(effectKey, error)) return;
        throw error;
      }
      await this.transition(effectKey, 'processing', { status: 'failed', errorMessage: this.errorText(error) });
      if (strict) throw error;
      return;
    }
    if (result.status === 'failed') {
      const error = new Error(result.errorMessage ?? 'Message provider rejected delivery');
      await this.transition(effectKey, 'processing', { status: 'failed', provider: result.provider, providerMessageId: result.providerMessageId || null, channel: result.channel, errorMessage: error.message });
      if (strict) throw error;
      return;
    }
    try {
      const updated = await this.transition(effectKey, 'processing', { status: 'sent', provider: result.provider, providerMessageId: result.providerMessageId, channel: result.channel, errorMessage: null, sentAt: new Date() });
      if (!updated) throw new Error('Message log was not updated after provider acceptance');
    } catch (error) {
      const ambiguous = new AmbiguousMessageDeliveryError('Provider accepted message but local delivery log is unknown', effectKey, error);
      if (await this.markUnknown(effectKey, ambiguous)) return;
      throw ambiguous;
    }
  }

  /** Reconciliation callers use the provider's stable request ID. */
  async reconcileDelivered(effectKey: string, providerMessageId?: string, manager?: EntityManager): Promise<boolean> {
    const reconcile = async (transactionManager: EntityManager): Promise<boolean> => {
      const now = new Date();
      const log = await transactionManager.getRepository(NotificationLog).update(
        { effectKey },
        { status: 'sent', providerMessageId: providerMessageId ?? null, sentAt: now, errorMessage: null },
      );
      if (log.affected !== 1) return false;
      const effectId = this.paymentEffectId(effectKey);
      if (effectId === null) return true;
      const outbox = await transactionManager.getRepository(PaymentEffectOutbox).update(
        { id: effectId, state: In([PaymentEffectState.MANUAL_REVIEW, PaymentEffectState.FAILED, PaymentEffectState.PROCESSING]) },
        { state: PaymentEffectState.SUCCEEDED, processedAt: now, leaseOwner: null, leaseExpiresAt: null, nextAttemptAt: null, lastError: null },
      );
      if (outbox.affected !== 1) {
        throw new Error(`Payment effect ${effectId} cannot be reconciled`);
      }
      return true;
    };
    return manager ? reconcile(manager) : this.dataSource.transaction(reconcile);
  }

  private async reserve(effectKey: string, context: DispatchContext, recipientPhoneHash: string | null, recipientPhoneMasked: string | null): Promise<NotificationLog | null> {
    try {
      await this.logRepository.insert({ eventType: context.eventType, channel: 'kakao_alimtalk', provider: this.config.message.provider, resourceType: context.resourceType, resourceId: context.resourceId, recipientPhoneHash, recipientPhoneMasked, templateKey: context.templateKey, providerMessageId: null, effectKey, status: 'pending', errorMessage: null, sentAt: null } as never);
    } catch (error) {
      if (!this.isDuplicateKey(error)) throw error;
    }
    const log = await this.logRepository.findOne({ where: { effectKey } });
    if (!log || log.status === 'sent' || log.status === 'manual_review') return log;
    if (log.status === 'processing') {
      if (this.isFreshProcessing(log)) return log;
      const markedManual = await this.transition(effectKey, 'processing', {
        status: 'manual_review',
        errorMessage: 'Message delivery processing lease is stale; provider correlation is required.',
      });
      if (markedManual) return { ...log, status: 'manual_review' };
      const current = await this.logRepository.findOne({ where: { effectKey } });
      if (current?.status === 'sent' || current?.status === 'manual_review') return current;
      return { ...log, status: 'processing' };
    }
    const claimed = await this.transition(effectKey, log.status, { status: 'processing' });
    return claimed ? { ...log, status: 'pending' } : null;
  }

  private async transition(effectKey: string, expected: NotificationLog['status'], values: Partial<NotificationLog>): Promise<boolean> {
    const result = await this.logRepository.update({ effectKey, status: expected }, values);
    return result.affected === 1;
  }

  private async markUnknown(effectKey: string, error: AmbiguousMessageDeliveryError): Promise<boolean> {
    try {
      const result = await this.logRepository.update(
        { effectKey, status: 'processing' },
        { status: 'manual_review', errorMessage: this.errorText(error) },
      );
      if (result.affected === 1) return false;

      const log = await this.logRepository.findOne({ where: { effectKey } });
      if (log?.status === 'sent') return true;
      if (log?.status === 'manual_review') return false;
      throw new MessageDeliveryInProgressError(effectKey);
    } catch (cause) {
      if (cause instanceof MessageDeliveryInProgressError) throw cause;
      return false; // Preserve the original ambiguity when the local state cannot be read.
    }
  }

  private async dispatchLegacy(context: DispatchContext): Promise<void> {
    // Non-outbox notifications retain the historical best-effort behavior.
    const recipientPhone = this.pickRecipientPhone(context.order);
    if (!recipientPhone) return this.saveLog(context, { status: 'skipped', channel: 'kakao_alimtalk', errorMessage: '수신 가능한 전화번호가 없습니다.' });
    const normalizedPhone = this.normalizePhone(recipientPhone);
    const recipientPhoneHash = this.hashPhone(normalizedPhone);
    const recipientPhoneMasked = this.maskPhone(normalizedPhone);
    const templateId = this.config.message.templates[context.templateKey];
    if (!templateId) return this.saveLog(context, { status: 'skipped', channel: 'kakao_alimtalk', recipientPhoneHash, recipientPhoneMasked, errorMessage: `${context.templateKey} 템플릿 ID가 설정되지 않았습니다.` });
    const duplicate = await this.logRepository.findOne({ where: { eventType: context.eventType, resourceType: context.resourceType, resourceId: context.resourceId, recipientPhoneHash, status: 'sent' } });
    if (duplicate) return;
    try {
      const message = buildTransactionalMessage(context.templateKey, { order: context.order, payment: context.payment, shipping: context.shipping, paymentMethod: context.paymentMethod, cancelReason: context.cancelReason, templateId, smsFallbackEnabled: this.config.message.smsFallbackEnabled });
      const result = await this.provider.send({ to: normalizedPhone, ...message, idempotencyKey: `notification:${context.eventType}:${context.resourceType}:${context.resourceId}:${recipientPhoneHash}` });
      await this.saveLog(context, { status: result.status, channel: result.channel, provider: result.provider, providerMessageId: result.providerMessageId, recipientPhoneHash, recipientPhoneMasked, errorMessage: result.errorMessage });
    } catch (error) {
      await this.saveLog(context, { status: 'failed', channel: 'kakao_alimtalk', recipientPhoneHash, recipientPhoneMasked, errorMessage: this.errorText(error) });
    }
  }

  private isDuplicateKey(error: unknown): boolean { return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'ER_DUP_ENTRY'; }
  private errorText(error: unknown): string { return String(error).slice(0, 500); }
  private isFreshProcessing(log: NotificationLog): boolean {
    return log.updatedAt instanceof Date && log.updatedAt.getTime() > Date.now() - 5 * 60 * 1000;
  }
  private paymentEffectId(effectKey: string): number | null {
    const match = /^payment-effect:(\d+)$/.exec(effectKey);
    return match ? Number(match[1]) : null;
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
    effectKey?: string,
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
      effectKey: effectKey ?? null,
      status: values.status,
      errorMessage: values.errorMessage ? values.errorMessage.slice(0, 500) : null,
      sentAt: values.status === 'sent' ? new Date() : null,
    });
  }
}
