import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { AdminOrderRefundsController } from './admin-order-refunds.controller';
import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { NaverPayPaymentAdapter } from './adapters/naverpay.adapter';
import {
  PAYMENT_CONFIG,
  PaymentConfig,
  paymentConfigProvider,
} from '../../config/payment.config';

export function resolvePaymentGateway(config: PaymentConfig): string {
  return config.gateway;
}

/**
 * 로케일 기반 결제 게이트웨이 선택 (#721)
 *
 * 정책 결정:
 * - 한국(ko): Toss Payments — 기본값. 사용자가 별도 PG 선택 시 controller 단계에서
 *   덮어쓰기 가능 (`/api/payments/prepare` body 의 명시적 gateway 필드는 추후 확장).
 *   국내 PG(toss / inicis / naverpay) 어댑터가 모두 등록되어 있으므로 Phase 2 에서
 *   사용자 선택 UI 만 추가하면 된다.
 * - 그 외 locale: Stripe (글로벌)
 *
 * 자율 판단 근거: issue #721 본문은 "사용자 선택 / 관리자 설정 / locale fallback 중 결정"
 * 을 자율 판단 항목으로 명시. 가장 작은 변화(=기존 ko→toss 매핑 유지)를 선택하고,
 * 국내 3 PG 어댑터를 미리 등록해 둠으로써 추후 사용자 선택 UI 추가가 비파괴적이도록 설계.
 */
export function resolveGatewayByLocale(locale: string): string {
  return locale === 'ko' ? 'toss' : 'stripe';
}

const gatewayProviders = [
  paymentConfigProvider,
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
  KGInicisPaymentAdapter,
  NaverPayPaymentAdapter,
  {
    provide: 'PaymentGateway',
    useFactory: (
      config: PaymentConfig,
      mock: MockPaymentAdapter,
      toss: TossPaymentAdapter,
      stripe: StripePaymentAdapter,
      inicis: KGInicisPaymentAdapter,
      naverpay: NaverPayPaymentAdapter,
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
    ],
  },
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Refund, Shipping, Order])],
  controllers: [PaymentsController, AdminOrderRefundsController],
  providers: [...gatewayProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
