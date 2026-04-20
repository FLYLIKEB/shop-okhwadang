import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointHistory } from './entities/point-history.entity';
import { CouponRule } from './entities/coupon-rule.entity';
import { CouponsController, AdminCouponsController } from './coupons.controller';
import { AdminCouponRulesController } from './coupon-rules.controller';
import { CouponsService } from './coupons.service';
import { CouponRulesService } from './coupon-rules.service';
import { PointsModule } from '../points/points.module';
import { MembershipModule } from '../membership/membership.module';
import { AuthEventsModule } from '../auth/auth-events.module';
import { OrderEventsModule } from '../orders/order-events.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Coupon, UserCoupon, PointHistory, CouponRule, User]),
    PointsModule,
    MembershipModule,
    AuthEventsModule,
    OrderEventsModule,
  ],
  controllers: [CouponsController, AdminCouponsController, AdminCouponRulesController],
  providers: [CouponsService, CouponRulesService],
  exports: [CouponsService, CouponRulesService],
})
export class CouponsModule {}
