import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AdminOrderRefundsController } from './admin-order-refunds.controller';
import { AdminPaymentWebhooksController } from './admin-payment-webhooks.controller';
import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { NaverPayPaymentAdapter } from './adapters/naverpay.adapter';
import { PayPalPaymentAdapter } from './adapters/paypal.adapter';
import {
  PAYMENT_CONFIG,
  PaymentConfig,
  paymentConfigProvider,
} from '../../config/payment.config';

export function resolvePaymentGateway(config: PaymentConfig): string {
  return config.gateway;
}

export type CheckoutGatewayName = 'naverpay' | 'paypal';

/**
 * 로케일 기반 결제 게이트웨이 노출 정책 (#769)
 *
 * 두 PG를 모두 제공하되 로케일별 ordering/default만 바꾼다.
 * - ko: 네이버페이 기본, PayPal 추가 선택지
 * - 그 외: PayPal 기본, 네이버페이 추가 선택지
 */
export function getAvailableGatewaysByLocale(locale: string): CheckoutGatewayName[] {
  return locale === 'ko' ? ['naverpay', 'paypal'] : ['paypal', 'naverpay'];
}

export function resolveGatewayByLocale(locale: string): CheckoutGatewayName {
  return getAvailableGatewaysByLocale(locale)[0];
}

export function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return value === 'naverpay' || value === 'paypal';
}

const gatewayProviders = [
  paymentConfigProvider,
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
  KGInicisPaymentAdapter,
  NaverPayPaymentAdapter,
  PayPalPaymentAdapter,
  {
    provide: 'PaymentGateway',
    useFactory: (
      config: PaymentConfig,
      mock: MockPaymentAdapter,
      toss: TossPaymentAdapter,
      stripe: StripePaymentAdapter,
      inicis: KGInicisPaymentAdapter,
      naverpay: NaverPayPaymentAdapter,
      paypal: PayPalPaymentAdapter,
    ) => {
      const gateway = resolvePaymentGateway(config);
      switch (gateway) {
        case 'toss':
          return toss;
        case 'stripe':
          return stripe;
        case 'inicis':
          return inicis;
        case 'naverpay':
          return naverpay;
        case 'paypal':
          return paypal;
        case 'mock':
          return mock;
        default:
          throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
      }
    },
    inject: [
      PAYMENT_CONFIG,
      MockPaymentAdapter,
      TossPaymentAdapter,
      StripePaymentAdapter,
      KGInicisPaymentAdapter,
      NaverPayPaymentAdapter,
      PayPalPaymentAdapter,
    ],
  },
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentWebhookEvent, Refund, Shipping, Order, PointHistory])],
  controllers: [PaymentsController, AdminOrderRefundsController, AdminPaymentWebhooksController],
  providers: [...gatewayProviders, PaymentsService, { provide: 'PaymentsService', useExisting: PaymentsService }],
  exports: [PaymentsService, 'PaymentsService'],
})
export class PaymentsModule {}
