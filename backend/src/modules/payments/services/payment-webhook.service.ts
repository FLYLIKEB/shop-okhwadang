import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType } from '../entities/payment.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import {
  PaymentWebhookEvent,
  PaymentWebhookResult,
  PaymentWebhookState,
} from '../entities/payment-webhook-event.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { resolveWebhookTransition } from './payment-webhook-transition.policy';
import { canOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';
import { PointsService } from '../../points/points.service';
import { runFirstTerminalTransitionRecovery } from './order-terminal-recovery.util';
import {
  extractWebhookIdempotencyKey,
  isDuplicateKeyError,
} from './webhook-idempotency.util';
import { PaymentEffectType } from '../entities/payment-effect-outbox.entity';
import { PaymentEffectOutboxService } from './payment-effect-outbox.service';

interface PaymentWebhookDependencies {
  gateway: PaymentGateway;
  gatewayType: PaymentGatewayType;
  paymentRepository: Repository<Payment>;
  orderRepository?: Repository<Order>;
  webhookEventRepository: Repository<PaymentWebhookEvent>;
  dataSource: DataSource;
  logger: Logger;
  pointsService: Pick<PointsService, 'lockUserForPointChanges' | 'creditFifo'>;
  effectOutbox: PaymentEffectOutboxService;
  defaultCarrier?: string;
}

/**
 * 결제 웹훅 처리 (issue #725)
 *
 * 멱등성:
 *   - 모든 수신 이벤트는 (gateway, event_id) UNIQUE 제약을 가진 `payment_webhook_events` 에 먼저 기록.
 *   - 중복 ER_DUP_ENTRY → IGNORED 로 처리.
 *
 * 결과 분류:
 *   - SUCCESS: 상태 전이가 실제로 수행됨
 *   - IGNORED: 차단 전이 / 알 수 없는 이벤트 / payment 미존재 / 이미 동일 상태 / 멱등 재수신
 *   - FAILED: 처리 도중 예외 발생 — 운영자 재처리 가능하도록 raw_payload + error_message 보존
 */
export class PaymentWebhookService {
  constructor(private readonly deps: PaymentWebhookDependencies) {}

  async handleWebhook(
    payload: unknown,
    signature: string,
    rawBody?: Buffer,
    signatureHeader?: string,
  ): Promise<void> {
    const normalizedPayload = normalizeProviderEvent(this.deps.gatewayType, payload, rawBody);
    if (!normalizedPayload) {
      this.deps.logger.warn(`Webhook ignored: malformed provider event (gateway=${this.deps.gatewayType})`);
      return;
    }
    const idempotencyKey = extractWebhookIdempotencyKey(this.deps.gatewayType, normalizedPayload);
    if (!idempotencyKey) {
      this.deps.logger.warn(
        `Webhook ignored: cannot extract idempotency key (gateway=${this.deps.gatewayType})`,
      );
      return;
    }

    // A reconstructed JSON string is not the provider-signed request.  Such
    // receipts are retained for audit but deliberately cannot be replayed.
    const replayable = rawBody !== undefined;
    const eventEntity = this.deps.webhookEventRepository.create({
      gateway: idempotencyKey.gateway,
      eventId: idempotencyKey.eventId,
      eventType: idempotencyKey.eventType,
      result: PaymentWebhookResult.IGNORED,
      state: replayable ? PaymentWebhookState.PENDING : PaymentWebhookState.MANUAL_REVIEW,
      attemptCount: 0,
      maxAttempts: 8,
      providerRoute: this.deps.gatewayType,
      rawBody: rawBody ?? null,
      signatureHeader: signatureHeader ?? null,
      signatureValue: signature,
      normalizedMetadata: normalizedPayload,
      replayable,
      lastError: replayable ? null : 'Webhook raw body was unavailable; receipt cannot be replayed.',
    });
    try {
      await this.deps.webhookEventRepository.save(eventEntity);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.deps.webhookEventRepository.findOne({
          where: { gateway: idempotencyKey.gateway, eventId: idempotencyKey.eventId },
        });
        if (existing?.state === PaymentWebhookState.PENDING || existing?.state === PaymentWebhookState.PROCESSING) {
          throw new ServiceUnavailableException('웹훅 처리가 진행 중입니다.');
        }
        this.deps.logger.warn(`Webhook ignored: duplicate event (gateway=${idempotencyKey.gateway}, eventId=${idempotencyKey.eventId})`);
        return;
      }
      throw err;
    }
  }

  async processStoredWebhook(payload: unknown, transactionManager?: EntityManager): Promise<{
    result: PaymentWebhookResult;
    paymentId: number | null;
    orderId: number | null;
  }> {
    const safe = {
      orderId: (payload as Record<string, unknown>)?.orderId,
      status: (payload as Record<string, unknown>)?.status,
      type: (payload as Record<string, unknown>)?.type,
    };

    const orderReference = String(safe.orderId ?? '');
    let parsedOrderId = /^(?:0|[1-9]\d*)$/.test(orderReference)
      ? Number(orderReference)
      : NaN;
    if (!Number.isSafeInteger(parsedOrderId) && this.deps.orderRepository && orderReference) {
      const order = await this.deps.orderRepository.findOne({ where: { orderNumber: orderReference } });
      parsedOrderId = order ? Number(order.id) : NaN;
    }
    if (!Number.isSafeInteger(parsedOrderId) || parsedOrderId <= 0) {
      this.deps.logger.warn('Webhook ignored: invalid orderId');
      return { result: PaymentWebhookResult.IGNORED, paymentId: null, orderId: null };
    }

    const normalized = String(
      (payload as Record<string, unknown>)?.eventType
      ?? safe.status
      ?? safe.type
      ?? '',
    ).toUpperCase();

    if (!normalized) {
      this.deps.logger.warn(`Webhook ignored: unknown event for orderId=${parsedOrderId}`);
      return { result: PaymentWebhookResult.IGNORED, paymentId: null, orderId: parsedOrderId };
    }

    const payment = await this.deps.paymentRepository.findOne({ where: { orderId: parsedOrderId } });
    if (!payment) {
      this.deps.logger.warn(`Webhook ignored: payment not found (orderId=${parsedOrderId})`);
      return { result: PaymentWebhookResult.IGNORED, paymentId: null, orderId: parsedOrderId };
    }

    const matchedTransition = resolveWebhookTransition(normalized);
    if (!matchedTransition) {
      return {
        result: PaymentWebhookResult.IGNORED,
        paymentId: Number(payment.id),
        orderId: parsedOrderId,
      };
    }

    let didMutate = false;
    const applyMutation = async (manager: EntityManager) => {
      const isRestoreTarget =
        matchedTransition.orderStatus === OrderStatus.CANCELLED
        || matchedTransition.orderStatus === OrderStatus.REFUNDED;

      if (isRestoreTarget) {
        let lockedPayment: Payment | null = null;
        const recovery = await runFirstTerminalTransitionRecovery(manager, {
          orderId: parsedOrderId,
          nextOrderStatus: matchedTransition.orderStatus,
          pointsService: this.deps.pointsService,
          pointRestoreDescription: `주문 ${parsedOrderId} ${matchedTransition.orderStatus === OrderStatus.REFUNDED ? '환불' : '취소'} 웹훅으로 인한 적립금 복구`,
          lockBeforeRecovery: async (lockedOrder) => {
            lockedPayment = await manager.findOne(Payment, {
              where: { orderId: parsedOrderId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!lockedPayment) {
              this.deps.logger.warn(`Webhook ignored: payment not found (orderId=${parsedOrderId})`);
              return false;
            }
            if (!matchesBinding(lockedPayment, lockedOrder, payload, this.deps.gatewayType)) {
              this.deps.logger.warn(`Webhook ignored: immutable payment binding mismatch (orderId=${parsedOrderId})`);
              return false;
            }

            if (lockedPayment.status === PaymentStatus.CONFIRMING) {
              this.deps.logger.warn(
                `Webhook ignored: payment confirmation in progress (orderId=${parsedOrderId})`,
              );
              return false;
            }

            return true;
          },
          applyMutations: async (lockedOrder) => {
            if (!lockedPayment) {
              return false;
            }

            if (
              !canOrderStatusTransition(lockedOrder.status, matchedTransition.orderStatus, {
                allowSameStatus: true,
              })
            ) {
              this.deps.logger.warn(
                `Webhook ignored: blocked transition ${lockedOrder.status} → ${matchedTransition.orderStatus} (orderId=${parsedOrderId})`,
              );
              return false;
            }

            await manager.update(Payment, lockedPayment.id, {
              status: matchedTransition.paymentStatus as PaymentStatus,
              paidAt: matchedTransition.setPaidAt ? lockedPayment.paidAt ?? new Date() : lockedPayment.paidAt,
              cancelledAt: matchedTransition.setCancelledAt ? new Date() : lockedPayment.cancelledAt,
              rawResponse: payload as object,
            });
            await manager.update(Order, parsedOrderId, { status: matchedTransition.orderStatus });
            return true;
          },
        });

        if (!recovery.lockedOrder) {
          this.deps.logger.warn(`Webhook ignored: order not found (orderId=${parsedOrderId})`);
          return;
        }

        didMutate = recovery.didMutate;
        return;
      }

      const lockedOrder = await manager.findOne(Order, {
        where: { id: parsedOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      const lockedPayment = await manager.findOne(Payment, {
        where: { orderId: parsedOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder || !lockedPayment || !matchesBinding(lockedPayment, lockedOrder, payload, this.deps.gatewayType)) {
        this.deps.logger.warn(`Webhook ignored: immutable payment binding mismatch (orderId=${parsedOrderId})`);
        return;
      }

      const order = await manager.findOne(Order, { where: { id: parsedOrderId } });
      if (!order) {
        this.deps.logger.warn(`Webhook ignored: order not found (orderId=${parsedOrderId})`);
        return;
      }

      if (
        !canOrderStatusTransition(order.status, matchedTransition.orderStatus, {
          allowSameStatus: true,
        })
      ) {
        this.deps.logger.warn(
          `Webhook ignored: blocked transition ${order.status} → ${matchedTransition.orderStatus} (orderId=${parsedOrderId})`,
        );
        return;
      }

      await manager.update(Payment, payment.id, {
        status: matchedTransition.paymentStatus as PaymentStatus,
        paidAt: matchedTransition.setPaidAt ? payment.paidAt ?? new Date() : payment.paidAt,
        cancelledAt: matchedTransition.setCancelledAt ? new Date() : payment.cancelledAt,
        rawResponse: payload as object,
      });
      await manager.update(Order, parsedOrderId, { status: matchedTransition.orderStatus });

      if (matchedTransition.paymentStatus === PaymentStatus.CONFIRMED) {
        const existingShipping = await manager.findOne(Shipping, { where: { orderId: parsedOrderId } });
        if (!existingShipping) {
          await manager.save(Shipping, {
            orderId: parsedOrderId,
            carrier: this.deps.defaultCarrier ?? 'mock',
            status: ShippingStatus.PAYMENT_CONFIRMED,
          });
        }
        const isFirstPurchase = lockedOrder.userId !== null
          && await manager.count(Order, {
            where: {
              userId: lockedOrder.userId,
              status: In([
                OrderStatus.PAID,
                OrderStatus.PREPARING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
                OrderStatus.COMPLETED,
              ]),
            },
          }) <= 1;
        const payload = {
          userId: lockedOrder.userId,
          orderId: parsedOrderId,
          orderNumber: lockedOrder.orderNumber,
          recipientName: lockedOrder.recipientName,
          amount: Number(lockedPayment.amount),
          method: lockedPayment.method,
          locale: lockedOrder.orderLocale,
          customerType: lockedOrder.userId === null ? 'guest' : 'member',
          isFirstPurchase,
          guestEmail: lockedOrder.userId === null ? lockedOrder.guestEmailNormalized : null,
        };
        await this.deps.effectOutbox.enqueueWithManager(
          manager, parsedOrderId, PaymentEffectType.ORDER_COMPLETED_EVENT, payload,
        );
        await this.deps.effectOutbox.enqueueWithManager(
          manager, parsedOrderId, PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION, payload,
        );
        if (payload.customerType === 'member') {
          await this.deps.effectOutbox.enqueueWithManager(
            manager, parsedOrderId, PaymentEffectType.MEMBER_MESSAGE_NOTIFICATION, payload,
          );
        }
      }

      didMutate = true;
    };
    if (transactionManager) {
      await applyMutation(transactionManager);
    } else {
      await this.deps.dataSource.transaction(applyMutation);
    }

    return {
      result: didMutate ? PaymentWebhookResult.SUCCESS : PaymentWebhookResult.IGNORED,
      paymentId: Number(payment.id),
      orderId: parsedOrderId,
    };
  }
}

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

type NormalizedProviderEvent = Record<string, unknown> & {
  eventId: string;
  transactionId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
};

function normalizeProviderEvent(
  gateway: PaymentGatewayType,
  payload: unknown,
  rawBody?: Buffer,
): NormalizedProviderEvent | null {
  if (!isObject(payload) || Array.isArray(payload)) return null;
  const event = payload as Record<string, unknown>;
  switch (gateway) {
    case PaymentGatewayType.TOSS:
    {
      const data = record(event.data);
      if (event.eventType !== 'PAYMENT_STATUS_CHANGED' || !data) return null;
      const stableEventId = rawBody
        ? `v1:${createHash('sha256').update(rawBody).digest('hex')}`
        : stableTossEventId(event, data);
      if (!['DONE', 'CANCELED', 'CANCELLED'].includes(String(data.status))) return null;
      return normalized(
        event,
        stableEventId,
        data.paymentKey,
        data.orderId,
        data.totalAmount,
        data.currency,
        data.status,
      );
    }
    case PaymentGatewayType.STRIPE: {
      const data = record(record(event.data)?.object);
      return data
        ? normalized(event, event.id, data.id, record(data.metadata)?.orderNumber ?? record(data.metadata)?.orderId, data.amount_received, data.currency, event.type)
        : null;
    }
    case PaymentGatewayType.PAYPAL: {
      const resource = record(event.resource);
      const unit = resource && Array.isArray(resource.purchase_units) ? record(resource.purchase_units[0]) : null;
      const captures = unit ? record(unit.payments)?.captures : null;
      const capture = unit && Array.isArray(captures) && captures.length === 1
        ? record(captures[0])
        : resource;
      const money = capture && record(capture.amount);
      const relatedOrderId = resource && record(record(resource.supplementary_data)?.related_ids)?.order_id;
      const merchantReference = unit?.reference_id ?? unit?.custom_id ?? resource?.custom_id ?? resource?.invoice_id;
      return resource && capture && money
        ? normalized(event, event.id, relatedOrderId, merchantReference, money.value, money.currency_code, event.event_type)
        : null;
    }
    case PaymentGatewayType.EXIMBAY: {
      const payment = record(event.payment);
      return payment && payment.status === 'SALE'
        ? normalized(event, event.event_id, payment.transaction_id, payment.order_id, payment.amount, payment.currency, 'SALE')
        : null;
    }
    case PaymentGatewayType.MOCK:
      return normalized(event, event.eventId, event.transactionId, event.orderId, event.amount, event.currency, event.status);
    default:
      return null;
  }
}

function stableTossEventId(event: Record<string, unknown>, data: Record<string, unknown>): string | null {
  const createdAt = typeof event.createdAt === 'string' ? event.createdAt : null;
  const paymentKey = typeof data.paymentKey === 'string' ? data.paymentKey : null;
  const orderId = typeof data.orderId === 'string' ? data.orderId : null;
  const status = typeof data.status === 'string' ? data.status : null;
  const amount = typeof data.totalAmount === 'number' ? data.totalAmount : null;
  const currency = typeof data.currency === 'string' ? data.currency : null;
  if (!createdAt || !paymentKey || !orderId || !status || amount === null || !currency) return null;
  return `v1:${createHash('sha256')
    .update(JSON.stringify(['PAYMENT_STATUS_CHANGED', createdAt, paymentKey, orderId, status, amount, currency]))
    .digest('hex')}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return isObject(value) && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalized(
  raw: Record<string, unknown>, eventIdValue: unknown, transactionValue: unknown,
  orderValue: unknown, amountValue: unknown, currencyValue: unknown, statusValue: unknown,
  divisor = 1,
): NormalizedProviderEvent | null {
  const string = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
  const eventId = string(eventIdValue);
  const transactionId = string(transactionValue);
  const orderId = string(orderValue);
  const numericAmount = typeof amountValue === 'number' ? amountValue / divisor : typeof amountValue === 'string' ? Number(amountValue) / divisor : NaN;
  const currency = string(currencyValue);
  const status = string(statusValue);
  if (!eventId || !transactionId || !orderId || !Number.isFinite(numericAmount) || numericAmount < 0 || !currency || !status
    || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/.test(eventId)) return null;
  return { ...raw, eventId, transactionId, paymentKey: transactionId, orderId, amount: numericAmount, currency: currency.toUpperCase(), status, eventType: status };
}

function matchesBinding(
  payment: Payment,
  order: Order,
  payload: unknown,
  gateway: PaymentGatewayType,
): boolean {
  if (!isObject(payload)) return false;
  const event = payload as Record<string, unknown>;
  const transactionId = String(event.transactionId ?? '');
  const reference = String(event.orderId ?? '');
  const amount = Number(event.amount);
  const currency = String(event.currency ?? '').toUpperCase();
  const numericReference = /^(?:0|[1-9]\d*)$/.test(reference);
  const referenceMatches = numericReference
    ? reference === String(order.id)
    : reference === order.orderNumber;
  return payment.gateway === gateway
    && referenceMatches
    && payment.providerTransactionId != null
    && payment.paymentKey != null
    && payment.providerOrderReference != null
    && payment.localOrderReference != null
    && payment.localOrderReference === reference
    && payment.providerOrderReference === reference
    && transactionId.length > 0
    && payment.providerTransactionId === transactionId
    && payment.paymentKey === transactionId
    && payment.expectedProviderAmount != null
    && Number(payment.expectedProviderAmount) === amount
    && payment.expectedProviderCurrency != null
    && payment.expectedProviderCurrency.toUpperCase() === currency;
}
