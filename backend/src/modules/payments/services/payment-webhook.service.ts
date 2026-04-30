import { UnauthorizedException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { PAYMENT_WEBHOOK_TRANSITIONS } from './payment-webhook-transition.policy';
import { canOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';
import { restoreOrderStock } from '../../orders/order-stock.util';

interface PaymentWebhookDependencies {
  gateway: PaymentGateway;
  paymentRepository: Repository<Payment>;
  dataSource: DataSource;
  logger: Logger;
}

export class PaymentWebhookService {
  constructor(private readonly deps: PaymentWebhookDependencies) {}

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!this.deps.gateway.verifyWebhook(payload, signature)) {
      throw new UnauthorizedException('웹훅 서명 검증 실패');
    }
    const safe = {
      orderId: (payload as Record<string, unknown>)?.orderId,
      status: (payload as Record<string, unknown>)?.status,
      type: (payload as Record<string, unknown>)?.type,
    };
    this.deps.logger.log(`Webhook received: ${JSON.stringify(safe)}`);

    const parsedOrderId = Number(safe.orderId);
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      this.deps.logger.warn('Webhook ignored: invalid orderId');
      return;
    }

    const normalized = String(
      (payload as Record<string, unknown>)?.eventType
      ?? safe.status
      ?? safe.type
      ?? '',
    ).toUpperCase();

    if (!normalized) {
      this.deps.logger.warn(`Webhook ignored: unknown event for orderId=${parsedOrderId}`);
      return;
    }

    const payment = await this.deps.paymentRepository.findOne({ where: { orderId: parsedOrderId } });
    if (!payment) {
      this.deps.logger.warn(`Webhook ignored: payment not found (orderId=${parsedOrderId})`);
      return;
    }

    const matchedTransition = PAYMENT_WEBHOOK_TRANSITIONS.find((transition) =>
      transition.keywords.some((keyword) => normalized.includes(keyword)),
    );
    if (!matchedTransition) {
      return;
    }

    await this.deps.dataSource.transaction(async (manager) => {
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

      // 재고 복구 정책 (issue #723):
      // 취소·환불로 진입할 때만 한 번 복구. 이미 cancelled/refunded 였던 주문 (allowSameStatus 진입) 은
      // 이중 복구를 막기 위해 스킵한다.
      const isRestoreTarget =
        matchedTransition.orderStatus === OrderStatus.CANCELLED
        || matchedTransition.orderStatus === OrderStatus.REFUNDED;
      const wasAlreadyTerminal =
        order.status === OrderStatus.CANCELLED
        || order.status === OrderStatus.REFUNDED;
      if (isRestoreTarget && !wasAlreadyTerminal) {
        await restoreOrderStock(manager, parsedOrderId);
      }
    });
  }
}
