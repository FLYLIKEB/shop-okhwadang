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
