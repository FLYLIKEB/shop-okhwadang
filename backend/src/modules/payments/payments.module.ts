import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentEffectOutbox } from './entities/payment-effect-outbox.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderEventsModule } from '../orders/order-events.module';
import { OrdersModule } from '../orders/orders.module';
import { PointsModule } from '../points/points.module';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { GuestPaymentsController } from './guest-payments.controller';
import { GuestPaymentsService } from './guest-payments.service';
import { AdminOrderRefundsController } from './admin-order-refunds.controller';
import { AdminPaymentWebhooksController } from './admin-payment-webhooks.controller';
import { gatewayProviders } from './payment-gateway.provider';
import { PaymentConfirmationService } from './services/payment-confirmation.service';
import { PaymentEffectOutboxService } from './services/payment-effect-outbox.service';
import { PaymentWebhookReceiptWorkerService } from './services/payment-webhook-receipt-worker.service';
import { PaymentEffectOutboxWorker } from './services/payment-effect-outbox.worker';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { IdempotencyOperation } from '../../common/entities/idempotency-operation.entity';
import { IdempotencyService } from '../../common/services/idempotency.service';
import {
  getCheckoutGatewayOptions,
  getDefaultCheckoutGateway,
  isCheckoutGatewayName,
  type CheckoutGatewayName,
} from '../../config/checkout-gateway-contract';

/**
 * 국가/로케일 기반 결제 게이트웨이 노출 정책 (#1066, #1110)
 *
 * 단일 소스: backend/src/config/checkout-gateway-contract.ts
 */
export function getAvailableGatewaysByLocale(locale: string): CheckoutGatewayName[] {
  return getCheckoutGatewayOptions(locale, process.env.CHECKOUT_ENABLED_GATEWAYS);
}

export function resolveGatewayByLocale(locale: string): CheckoutGatewayName {
  return getDefaultCheckoutGateway(locale, process.env.CHECKOUT_ENABLED_GATEWAYS);
}

export { isCheckoutGatewayName };

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, PaymentWebhookEvent, PaymentEffectOutbox, Refund, Shipping, Order, PointHistory, IdempotencyOperation]),
    OrderEventsModule,
    OrdersModule,
    PointsModule,
    AuditLogModule,
  ],
  controllers: [
    PaymentsController,
    GuestPaymentsController,
    AdminOrderRefundsController,
    AdminPaymentWebhooksController,
  ],
  providers: [
    ...gatewayProviders,
    PaymentConfirmationService,
    PaymentEffectOutboxService,
    {
      provide: PaymentEffectOutboxWorker,
      inject: [PaymentEffectOutboxService, PaymentConfirmationService],
      useFactory: (
        outbox: PaymentEffectOutboxService,
        confirmation: PaymentConfirmationService,
      ) => new PaymentEffectOutboxWorker(outbox, {
        orderCompleted: {
          deliver: (payload, idempotencyKey) =>
            confirmation.deliverOrderCompleted(payload as never, idempotencyKey),
        },
        paymentConfirmedNotification: {
          deliver: (payload, idempotencyKey) =>
            confirmation.deliverPaymentConfirmedNotification(payload as never, idempotencyKey),
        },
        memberMessageNotification: {
          deliver: (payload, idempotencyKey) =>
            confirmation.deliverMemberMessageNotification(payload as never, idempotencyKey),
        },
      }),
    },
    PaymentsService,
    GuestPaymentsService,
    IdempotencyService,
    {
      provide: PaymentWebhookReceiptWorkerService,
      inject: [getRepositoryToken(PaymentWebhookEvent), DataSource, PaymentsService],
      useFactory: (
        repository: Repository<PaymentWebhookEvent>,
        dataSource: DataSource,
        payments: PaymentsService,
      ) => new PaymentWebhookReceiptWorkerService({
        repository,
        dataSource,
        verify: (rawBody, signature, receipt) =>
          payments.verifyStoredWebhook(rawBody, signature, receipt.providerRoute),
        apply: (metadata, manager) =>
          payments.processStoredWebhook(
            String((metadata as { providerRoute?: unknown }).providerRoute ?? ''),
            metadata,
            manager,
          ),
      }),
    },
    { provide: 'PaymentsService', useExisting: PaymentsService },
  ],
  exports: [PaymentsService, 'PaymentsService'],
})
export class PaymentsModule {}
