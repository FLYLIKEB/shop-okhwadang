import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipping } from '../payments/entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { ShippingService } from './shipping.service';
import { ShippingController, AdminShippingController } from './shipping.controller';
import { MockShippingAdapter } from './adapters/mock-shipping.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([Shipping, Order, User])],
  controllers: [ShippingController, AdminShippingController],
  providers: [ShippingService, MockShippingAdapter],
  exports: [ShippingService],
})
export class ShippingModule {}
