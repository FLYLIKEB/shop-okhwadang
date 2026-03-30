import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Shipping } from './entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MockPaymentAdapter } from './adapters/mock.adapter';
import { TossPaymentAdapter } from './adapters/toss.adapter';

const gatewayProviders = [
  {
    provide: 'PaymentGateway',
    useFactory: () => {
      const gateway = process.env.PAYMENT_GATEWAY ?? 'mock';
      if (process.env.NODE_ENV === 'production' && (gateway === 'mock' || !process.env.PAYMENT_GATEWAY)) {
        throw new Error('Mock payment gateway는 프로덕션에서 사용할 수 없습니다. PAYMENT_GATEWAY 환경변수를 설정하세요.');
      }
      return gateway === 'toss'
        ? new TossPaymentAdapter()
        : new MockPaymentAdapter();
    },
  },
  MockPaymentAdapter,
  TossPaymentAdapter,
];

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Shipping, Order])],
  controllers: [PaymentsController],
  providers: [...gatewayProviders, PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
