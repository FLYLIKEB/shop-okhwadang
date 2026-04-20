import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { User } from '../users/entities/user.entity';
import { UserAddress } from '../users/entities/user-address.entity';
import { RecentlyViewedProduct } from '../products/entities/recently-viewed-product.entity';
import { SchedulerService } from './scheduler.service';
import { SettingsModule } from '../settings/settings.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, ProductOption, Coupon, PointHistory, User, UserAddress, RecentlyViewedProduct]),
    SettingsModule,
    NotificationModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
