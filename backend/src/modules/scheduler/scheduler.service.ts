import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { User } from '../users/entities/user.entity';
import { RecentlyViewedProduct } from '../products/entities/recently-viewed-product.entity';
import { NotificationService } from '../notification/notification.service';
import { SettingsService } from '../settings/settings.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { MembershipService } from '../membership/membership.service';
import { OrderSchedulerJob } from './jobs/order-scheduler.job';
import { MaintenanceSchedulerJob } from './jobs/maintenance-scheduler.job';
import { PointSchedulerJob } from './jobs/point-scheduler.job';
import { UserLifecycleSchedulerJob } from './jobs/user-lifecycle-scheduler.job';
import { SchedulerLockService } from '../../common/services/scheduler-lock.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly orderSchedulerJob: OrderSchedulerJob;
  private readonly maintenanceSchedulerJob: MaintenanceSchedulerJob;
  private readonly pointSchedulerJob: PointSchedulerJob;
  private readonly userLifecycleSchedulerJob: UserLifecycleSchedulerJob;

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductOption)
    private readonly productOptionRepo: Repository<ProductOption>,
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RecentlyViewedProduct)
    private readonly recentlyViewedRepo: Repository<RecentlyViewedProduct>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly settingsService: SettingsService,
    private readonly membershipService: MembershipService,
    private readonly schedulerLockService: SchedulerLockService,
  ) {
    this.orderSchedulerJob = new OrderSchedulerJob({
      orderRepo: this.orderRepo,
      userRepo: this.userRepo,
      dataSource: this.dataSource,
      notificationService: this.notificationService,
      settingsService: this.settingsService,
      membershipService: this.membershipService,
      logger: this.logger,
    });
    this.maintenanceSchedulerJob = new MaintenanceSchedulerJob({
      couponRepo: this.couponRepo,
      logger: this.logger,
    });
    this.pointSchedulerJob = new PointSchedulerJob({
      dataSource: this.dataSource,
      logger: this.logger,
      notificationService: this.notificationService,
      pointHistoryRepo: this.pointHistoryRepo,
      userRepo: this.userRepo,
    });
    this.userLifecycleSchedulerJob = new UserLifecycleSchedulerJob({
      userRepo: this.userRepo,
      recentlyViewedRepo: this.recentlyViewedRepo,
      dataSource: this.dataSource,
      notificationService: this.notificationService,
      membershipService: this.membershipService,
      logger: this.logger,
    });

    void this.orderItemRepo;
    void this.productRepo;
    void this.productOptionRepo;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handlePendingOrderCancellation(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:pending-order-cancel', ttlMinutes: 55 },
      () => this.orderSchedulerJob.handlePendingOrderCancellation(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeliveredOrderAutoConfirm(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:delivered-order-confirm', ttlMinutes: 55 },
      () => this.orderSchedulerJob.handleDeliveredOrderAutoConfirm(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCouponExpiry(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:coupon-expiry', ttlMinutes: 55 },
      () => this.maintenanceSchedulerJob.handleCouponExpiry(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handlePointExpiry(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:point-expiry', ttlMinutes: 55 },
      () => this.pointSchedulerJob.handlePointExpiry(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handlePointExpiryNotification(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:point-expiry-notification', ttlMinutes: 55 },
      () => this.pointSchedulerJob.handlePointExpiryNotification(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleScheduledAccountDeletion(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:account-deletion', ttlMinutes: 55 },
      () => this.userLifecycleSchedulerJob.handleScheduledAccountDeletion(),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleRecentlyViewedCleanup(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:recently-viewed-cleanup', ttlMinutes: 55 },
      () => this.userLifecycleSchedulerJob.handleRecentlyViewedCleanup(),
    );
  }

  @Cron('0 3 1 * *') // 01st of every month at 03:00
  async handleMonthlyTierEvaluation(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:monthly-tier-evaluation', ttlMinutes: 55 },
      () => this.userLifecycleSchedulerJob.handleMonthlyTierEvaluation(),
    );
  }

  private async getSettingNumber(key: string, defaultValue: number): Promise<number> {
    try {
      const settings = await this.settingsService.getMap();
      const value = settings[key];
      return value ? parseInt(value, 10) : defaultValue;
    } catch {
      return defaultValue;
    }
  }
}
