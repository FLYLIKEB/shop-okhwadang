import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, PointHistory]), PointsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
