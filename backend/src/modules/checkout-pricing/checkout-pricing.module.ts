import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CheckoutPricingController } from './checkout-pricing.controller';
import { CheckoutPricingService } from './checkout-pricing.service';

@Module({
  imports: [OrdersModule],
  controllers: [CheckoutPricingController],
  providers: [CheckoutPricingService, OptionalJwtAuthGuard],
})
export class CheckoutPricingModule {}
