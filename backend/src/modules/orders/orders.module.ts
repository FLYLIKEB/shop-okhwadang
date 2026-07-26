import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderServiceRequest } from './entities/order-service-request.entity';
import { OrderItem } from './entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PolicyConsent } from '../pages/entities/policy-consent.entity';
import { Payment } from '../payments/entities/payment.entity';
import { GuestOrderAccess } from './entities/guest-order-access.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { AdminOrderServiceRequestsController, OrderServiceRequestsController } from './order-service-requests.controller';
import { PointsModule } from '../points/points.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderEventsModule } from './order-events.module';
import { GuestOrdersController } from './guest-orders.controller';
import { GuestOrdersService } from './guest-orders.service';
import { GuestOrderCreationWorkflowService } from './guest-order-creation.workflow.service';
import { GuestOrderAccessService } from './guest-order-access.service';
import { OrderServiceRequestsService } from './order-service-requests.service';
import { OrderCreationWorkflowService } from './order-creation.workflow.service';
import { OrderPostCommitService } from './order-post-commit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderServiceRequest, PointHistory, PolicyConsent, Payment, GuestOrderAccess]),
    PointsModule,
    CouponsModule,
    ShippingModule,
    OrderEventsModule,
  ],
  controllers: [
    OrdersController,
    GuestOrdersController,
    OrderServiceRequestsController,
    AdminOrderServiceRequestsController,
  ],
  providers: [
    OrdersService,
    OrderCreationWorkflowService,
    GuestOrdersService,
    GuestOrderCreationWorkflowService,
    GuestOrderAccessService,
    OrderPostCommitService,
    OrderServiceRequestsService,
  ],
  exports: [OrdersService, OrderCreationWorkflowService, GuestOrderAccessService, OrderServiceRequestsService, OrderEventsModule],
})
export class OrdersModule {}
