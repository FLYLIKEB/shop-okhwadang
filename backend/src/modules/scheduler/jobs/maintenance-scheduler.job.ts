import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Coupon } from '../../coupons/entities/coupon.entity';

interface MaintenanceSchedulerJobDependencies {
  couponRepo: Repository<Coupon>;
  logger: Logger;
}

export class MaintenanceSchedulerJob {
  constructor(private readonly deps: MaintenanceSchedulerJobDependencies) {}

  async handleCouponExpiry(): Promise<void> {
    const now = new Date();

    const result = await this.deps.couponRepo
      .createQueryBuilder()
      .update(Coupon)
      .set({ isActive: false })
      .where('is_active = :isActive', { isActive: true })
      .andWhere('expires_at < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.deps.logger.log(`[cron:coupon-expiry] Deactivated ${result.affected} expired coupons`);
    } else {
      this.deps.logger.debug('[cron:coupon-expiry] No expired coupons to deactivate');
    }
  }
}

