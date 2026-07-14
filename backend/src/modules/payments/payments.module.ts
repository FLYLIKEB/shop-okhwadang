import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderEventsModule } from '../orders/order-events.module';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AdminOrderRefundsController } from './admin-order-refunds.controller';
import { AdminPaymentWebhooksController } from './admin-payment-webhooks.controller';
import { gatewayProviders } from './payment-gateway.provider';
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
  imports: [TypeOrmModule.forFeature([Payment, PaymentWebhookEvent, Refund, Shipping, Order, PointHistory]), OrderEventsModule],
  controllers: [PaymentsController, AdminOrderRefundsController, AdminPaymentWebhooksController],
  providers: [...gatewayProviders, PaymentsService, { provide: 'PaymentsService', useExisting: PaymentsService }],
  exports: [PaymentsService, 'PaymentsService'],
})
export class PaymentsModule {}
