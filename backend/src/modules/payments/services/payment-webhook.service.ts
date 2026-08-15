import { UnauthorizedException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType } from '../entities/payment.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import {
  PaymentWebhookEvent,
  PaymentWebhookResult,
} from '../entities/payment-webhook-event.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { PAYMENT_WEBHOOK_TRANSITIONS } from './payment-webhook-transition.policy';
import { canOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';
import { PointsService } from '../../points/points.service';
import { runFirstTerminalTransitionRecovery } from './order-terminal-recovery.util';
import {
  extractWebhookIdempotencyKey,
  isDuplicateKeyError,
} from './webhook-idempotency.util';

interface PaymentWebhookDependencies {
  gateway: PaymentGateway;
  gatewayType: PaymentGatewayType;
  paymentRepository: Repository<Payment>;
  webhookEventRepository: Repository<PaymentWebhookEvent>;
  dataSource: DataSource;
  logger: Logger;
  pointsService: Pick<PointsService, 'getRunningBalanceInTx'>;
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

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!(await this.deps.gateway.verifyWebhook(payload, signature))) {
      throw new UnauthorizedException('웹훅 서명 검증 실패');
    }
    const safe = {
      orderId: (payload as Record<string, unknown>)?.orderId,
      status: (payload as Record<string, unknown>)?.status,
      type: (payload as Record<string, unknown>)?.type,
    };
    this.deps.logger.log(`Webhook received: ${JSON.stringify(safe)}`);

    const idempotencyKey = extractWebhookIdempotencyKey(this.deps.gatewayType, payload);
    if (!idempotencyKey) {
      this.deps.logger.warn(
        `Webhook ignored: cannot extract idempotency key (gateway=${this.deps.gatewayType})`,
      );
      return;
    }

    // 1) 이벤트 행을 UNIQUE(gateway, event_id) 위반 캐치하여 즉시 중복 차단.
    const eventEntity = this.deps.webhookEventRepository.create({
      gateway: idempotencyKey.gateway,
      eventId: idempotencyKey.eventId,
      eventType: idempotencyKey.eventType,
      result: PaymentWebhookResult.IGNORED,
      rawPayload: isObject(payload) ? (payload as object) : null,
    });
    let savedEvent: PaymentWebhookEvent;
    try {
      savedEvent = await this.deps.webhookEventRepository.save(eventEntity);
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        this.deps.logger.warn(
          `Webhook ignored: duplicate event (gateway=${idempotencyKey.gateway}, eventId=${idempotencyKey.eventId})`,
        );
        return;
      }
      throw err;
    }

    // 2) 실제 처리. 결과는 try/catch 종료 후 events 테이블에 반영.
    let result: PaymentWebhookResult = PaymentWebhookResult.IGNORED;
    let errorMessage: string | null = null;
    let resolvedPaymentId: number | null = null;
    let resolvedOrderId: number | null = null;
    try {
      const outcome = await this.processWebhook(payload);
      result = outcome.result;
      resolvedPaymentId = outcome.paymentId;
      resolvedOrderId = outcome.orderId;
    } catch (err) {
      result = PaymentWebhookResult.FAILED;
      errorMessage = err instanceof Error ? err.message : String(err);
      this.deps.logger.error(
        `Webhook processing failed: gateway=${idempotencyKey.gateway}, eventId=${idempotencyKey.eventId}, error=${errorMessage}`,
      );
    }

    // #725: audit row update 자체가 실패해도 PG 재시도를 유발하지 않도록 swallow.
    // (audit INSERT 는 이미 커밋되었기 때문에, 여기서 throw 하면 PG 가 재시도하지만
    // UNIQUE 제약으로 차단되어 영구적으로 IGNORED 상태로 남음.)
    try {
      await this.deps.webhookEventRepository.update(savedEvent.id, {
        result,
        processedAt: new Date(),
        errorMessage,
        paymentId: resolvedPaymentId,
        orderId: resolvedOrderId,
      });
    } catch (updateErr) {
      this.deps.logger.error(
        `Webhook event audit row update failed: id=${savedEvent.id}, ${updateErr instanceof Error ? updateErr.message : String(updateErr)}`,
      );
    }
  }

  private async processWebhook(payload: unknown): Promise<{
    result: PaymentWebhookResult;
    paymentId: number | null;
    orderId: number | null;
  }> {
    const safe = {
      orderId: (payload as Record<string, unknown>)?.orderId,
      status: (payload as Record<string, unknown>)?.status,
      type: (payload as Record<string, unknown>)?.type,
    };

    const parsedOrderId = Number(safe.orderId);
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
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

    const matchedTransition = PAYMENT_WEBHOOK_TRANSITIONS.find((transition) =>
      transition.keywords.some((keyword) => normalized.includes(keyword)),
    );
    if (!matchedTransition) {
      return {
        result: PaymentWebhookResult.IGNORED,
        paymentId: Number(payment.id),
        orderId: parsedOrderId,
      };
    }

    // A signed event alone is not settlement evidence. Gateway callbacks have
    // heterogeneous payloads and must be normalized/retrieved by the adapter
    // before they can satisfy the immutable preparation binding. Until that
    // authoritative evidence is available, never let a webhook create PAID.
    if (matchedTransition.paymentStatus === PaymentStatus.CONFIRMED) {
      this.deps.logger.warn(
        `Webhook ignored: settlement binding evidence unavailable (orderId=${parsedOrderId})`,
      );
      return {
        result: PaymentWebhookResult.IGNORED,
        paymentId: Number(payment.id),
        orderId: parsedOrderId,
      };
    }

    let didMutate = false;
    await this.deps.dataSource.transaction(async (manager) => {
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
          lockBeforeRecovery: async () => {
            lockedPayment = await manager.findOne(Payment, {
              where: { orderId: parsedOrderId },
              lock: { mode: 'pessimistic_write' },
            });

            if (!lockedPayment) {
              this.deps.logger.warn(`Webhook ignored: payment not found (orderId=${parsedOrderId})`);
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
      }

      didMutate = true;
    });

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
