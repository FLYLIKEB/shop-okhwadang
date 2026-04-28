import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PointsModule } from '../points/points.module';
import { CouponsModule } from '../coupons/coupons.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderEventsModule } from './order-events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, PointHistory]),
    PointsModule,
    CouponsModule,
    ShippingModule,
    OrderEventsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService, OrderEventsModule],
})
export class OrdersModule {}
