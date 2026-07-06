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
import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { NaverPayPaymentAdapter } from './adapters/naverpay.adapter';
import { PayPalPaymentAdapter } from './adapters/paypal.adapter';
import { EximbayPaymentAdapter } from './adapters/eximbay.adapter';
import {
  PAYMENT_CONFIG,
  PaymentConfig,
  paymentConfigProvider,
} from '../../config/payment.config';

export function resolvePaymentGateway(config: PaymentConfig): string {
  return config.gateway;
}

export type CheckoutGatewayName = 'naverpay' | 'eximbay' | 'paypal';

/**
 * 국가/로케일 기반 결제 게이트웨이 노출 정책 (#1066)
 *
 * 간편결제를 우선 노출하고, 국내 전용 수단은 해외 사이트에서 숨긴다.
 * - ko/KR: 네이버페이 기본, PayPal, Eximbay 카드
 * - 글로벌: PayPal 기본, Eximbay 카드 (네이버페이 숨김)
 */
function getEnabledCheckoutGateways(env: NodeJS.ProcessEnv = process.env): CheckoutGatewayName[] {
  const configured = env.CHECKOUT_ENABLED_GATEWAYS;
  if (!configured || configured.trim() === '') return ['naverpay', 'eximbay', 'paypal'];

  const gateways = configured
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(isCheckoutGatewayName);

  return [...new Set(gateways)];
}

export function getAvailableGatewaysByLocale(locale: string): CheckoutGatewayName[] {
  const localeOrder: CheckoutGatewayName[] = locale === 'ko'
    ? ['naverpay', 'paypal', 'eximbay']
    : ['paypal', 'eximbay'];
  const enabled = getEnabledCheckoutGateways();
  return localeOrder.filter((gateway) => enabled.includes(gateway));
}

export function resolveGatewayByLocale(locale: string): CheckoutGatewayName {
  return getAvailableGatewaysByLocale(locale)[0];
}

export function isCheckoutGatewayName(value: string): value is CheckoutGatewayName {
  return value === 'naverpay' || value === 'eximbay' || value === 'paypal';
}

const gatewayProviders = [
  paymentConfigProvider,
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
  KGInicisPaymentAdapter,
  NaverPayPaymentAdapter,
  PayPalPaymentAdapter,
  EximbayPaymentAdapter,
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
      eximbay: EximbayPaymentAdapter,
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
        case 'eximbay':
          return eximbay;
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
      EximbayPaymentAdapter,
    ],
  },
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentWebhookEvent, Refund, Shipping, Order, PointHistory]), OrderEventsModule],
  controllers: [PaymentsController, AdminOrderRefundsController, AdminPaymentWebhooksController],
  providers: [...gatewayProviders, PaymentsService, { provide: 'PaymentsService', useExisting: PaymentsService }],
  exports: [PaymentsService, 'PaymentsService'],
})
export class PaymentsModule {}
