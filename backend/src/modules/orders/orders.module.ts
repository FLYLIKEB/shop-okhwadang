import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderServiceRequest } from './entities/order-service-request.entity';
import { OrderItem } from './entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PolicyConsent } from '../pages/entities/policy-consent.entity';
import { Payment } from '../payments/entities/payment.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrderServiceRequestsController, OrderServiceRequestsController } from './order-service-requests.controller';
import { PointsModule } from '../points/points.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderEventsModule } from './order-events.module';
import { OrderServiceRequestsService } from './order-service-requests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderServiceRequest, PointHistory, PolicyConsent, Payment]),
    PointsModule,
    CouponsModule,
    ShippingModule,
    OrderEventsModule,
  ],
  controllers: [OrdersController, OrderServiceRequestsController, AdminOrderServiceRequestsController],
  providers: [OrdersService, OrderServiceRequestsService],
  exports: [OrdersService, OrderServiceRequestsService, OrderEventsModule],
})
export class OrdersModule {}
