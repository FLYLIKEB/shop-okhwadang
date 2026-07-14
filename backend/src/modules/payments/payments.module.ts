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

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentWebhookEvent, Refund, Shipping, Order, PointHistory]), OrderEventsModule],
  controllers: [PaymentsController, AdminOrderRefundsController, AdminPaymentWebhooksController],
  providers: [...gatewayProviders, PaymentsService, { provide: 'PaymentsService', useExisting: PaymentsService }],
  exports: [PaymentsService, 'PaymentsService'],
})
export class PaymentsModule {}
