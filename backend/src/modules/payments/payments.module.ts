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
import {
  PAYMENT_CONFIG,
  PaymentConfig,
  paymentConfigProvider,
} from '../../config/payment.config';

export function resolvePaymentGateway(config: PaymentConfig): string {
  return config.gateway;
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
  paymentConfigProvider,
  MockPaymentAdapter,
  TossPaymentAdapter,
  StripePaymentAdapter,
  {
    provide: 'PaymentGateway',
    useFactory: (
      config: PaymentConfig,
      mock: MockPaymentAdapter,
      toss: TossPaymentAdapter,
      stripe: StripePaymentAdapter,
    ) => {
      const gateway = resolvePaymentGateway(config);
      switch (gateway) {
        case 'toss':
          return toss;
        case 'stripe':
          return stripe;
        case 'mock':
          return mock;
        default:
          throw new Error(`Unknown PAYMENT_GATEWAY: ${gateway}`);
      }
    },
    inject: [PAYMENT_CONFIG, MockPaymentAdapter, TossPaymentAdapter, StripePaymentAdapter],
  },
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Refund, Shipping, Order])],
  controllers: [PaymentsController, AdminOrderRefundsController],
  providers: [...gatewayProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
