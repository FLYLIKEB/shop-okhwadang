import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';

export function resolvePaymentGateway(): string {
  const gateway = process.env.PAYMENT_GATEWAY ?? 'mock';
  if (
    process.env.NODE_ENV === 'production' &&
    (gateway === 'mock' || !process.env.PAYMENT_GATEWAY)
  ) {
    throw new Error(
      'Mock payment gateway는 프로덕션에서 사용할 수 없습니다. PAYMENT_GATEWAY 환경변수를 설정하세요.',
    );
  }
  return gateway;
}

/**
 * 로케일 기반 결제 게이트웨이 선택
 * - 한국(ko): Toss Payments
 * - 그 외: Stripe (글로벌)
 */
export function resolveGatewayByLocale(locale: string): string {
  return locale === 'ko' ? 'toss' : 'stripe';
}

const gatewayProviders = [
  {
    provide: 'PaymentGateway',
    useFactory: () => {
      const gateway = resolvePaymentGateway();
      switch (gateway) {
        case 'toss':
          return new TossPaymentAdapter();
        case 'stripe':
          return new StripePaymentAdapter();
        case 'mock':
          return new MockPaymentAdapter();
        default:
          throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
      }
    },
  },
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Shipping, Order, User])],
  controllers: [PaymentsController],
  providers: [...gatewayProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
