import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipping } from '../payments/entities/shipping.entity';
import { Order } from '../orders/entities/order.entity';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { MockShippingAdapter } from './adapters/mock-shipping.adapter';
import { CjShippingAdapter } from './adapters/cj-shipping.adapter';
import { ShippingFeeCalculatorService } from './services/shipping-fee-calculator.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Shipping, Order]), SettingsModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingFeeCalculatorService, MockShippingAdapter, CjShippingAdapter],
  exports: [ShippingService, ShippingFeeCalculatorService],
})
export class ShippingModule {}
