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
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipping, Order, Product, ProductOption]), SettingsModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShippingFeeCalculatorService, MockShippingAdapter, CjShippingAdapter],
  exports: [ShippingService, ShippingFeeCalculatorService],
})
export class ShippingModule {}
