import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { createHash } from 'crypto';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { User } from '../users/entities/user.entity';
import { UserAddress } from '../users/entities/user-address.entity';
import { NotificationService } from '../notification/notification.service';
import { SettingsService } from '../settings/settings.service';
import { InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

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
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    private readonly settingsService: SettingsService,
  ) {}

  private async acquireLock(lockName: string, ttlMinutes: number): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    try {
      await this.dataSource.query(
        `INSERT INTO scheduler_locks (lock_name, instance_id, acquired_at, expires_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           acquired_at = IF(expires_at <= NOW(), VALUES(acquired_at), acquired_at),
           expires_at = IF(expires_at <= NOW(), VALUES(expires_at), expires_at),
           instance_id = IF(expires_at <= NOW(), VALUES(instance_id), instance_id)`,
        [lockName, process.env.INSTANCE_ID || 'default', now, expiresAt],
      );

      const lock = await this.dataSource.query(
        `SELECT instance_id FROM scheduler_locks WHERE lock_name = ? AND expires_at > NOW()`,
        [lockName],
      );

      return lock.length > 0 && lock[0].instance_id === (process.env.INSTANCE_ID || 'default');
    } catch (err) {
      this.logger.error(`Failed to acquire lock ${lockName}: ${String(err)}`);
      return false;
    }
  }

  private async releaseLock(lockName: string): Promise<void> {
    try {
      await this.dataSource.query(
        `DELETE FROM scheduler_locks WHERE lock_name = ? AND instance_id = ?`,
        [lockName, process.env.INSTANCE_ID || 'default'],
      );
    } catch (err) {
      this.logger.error(`Failed to release lock ${lockName}: ${String(err)}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handlePendingOrderCancellation(): Promise<void> {
    const lockName = 'cron:pending-order-cancel';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const intervalHours = await this.getSettingNumber('scheduler_pending_cancel_hours', 24);
      const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

      const pendingOrders = await this.orderRepo.find({
        where: { status: OrderStatus.PENDING, createdAt: LessThan(cutoff) },
        relations: { items: true },
      });

      if (pendingOrders.length === 0) {
        this.logger.debug('[cron:pending-order-cancel] No pending orders to cancel');
        return;
      }

      this.logger.log(`[cron:pending-order-cancel] Cancelling ${pendingOrders.length} pending orders`);

      for (const order of pendingOrders) {
        await this.cancelOrderAndRestoreStock(order);
      }

      this.logger.log(`[cron:pending-order-cancel] Completed cancelling ${pendingOrders.length} orders`);
    } catch (err) {
      this.logger.error(`[cron:pending-order-cancel] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  private async cancelOrderAndRestoreStock(order: Order): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of order.items) {
        if (item.productOptionId) {
          await queryRunner.manager.increment(
            ProductOption,
            { id: item.productOptionId },
            'stock',
            item.quantity,
          );
        } else {
          await queryRunner.manager.increment(
            Product,
            { id: item.productId },
            'stock',
            item.quantity,
          );
        }
      }

      await queryRunner.manager.update(Order, order.id, { status: OrderStatus.CANCELLED });

      await queryRunner.commitTransaction();

      const user = await this.userRepo.findOne({ where: { id: order.userId } });
      if (user?.email) {
        this.notificationService
          .sendEmail({
            to: user.email,
            subject: `[옥화당] 주문 자동 취소 안내`,
            text: `안녕하세요. 고객님의 주문(${order.orderNumber})이 결제 미완료로 자동 취소되었습니다.`,
            html: `<p>안녕하세요.</p><p>고객님의 주문(<strong>${order.orderNumber}</strong>)이 결제 미완료로 자동 취소되었습니다.</p>`,
          })
          .catch((err) => this.logger.warn(`Failed to send cancellation email: ${String(err)}`));
      }

      this.logger.log(`[cron:pending-order-cancel] Cancelled order ${order.orderNumber}`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`[cron:pending-order-cancel] Failed to cancel order ${order.orderNumber}: ${String(err)}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeliveredOrderAutoConfirm(): Promise<void> {
    const lockName = 'cron:delivered-order-confirm';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const intervalDays = await this.getSettingNumber('scheduler_delivered_confirm_days', 7);
      const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);

      const deliveredOrders = await this.orderRepo.find({
        where: { status: OrderStatus.DELIVERED, updatedAt: LessThan(cutoff) },
        relations: { user: true },
      });

      if (deliveredOrders.length === 0) {
        this.logger.debug('[cron:delivered-order-confirm] No delivered orders to confirm');
        return;
      }

      this.logger.log(`[cron:delivered-order-confirm] Confirming ${deliveredOrders.length} delivered orders`);

      for (const order of deliveredOrders) {
        await this.orderRepo.update(order.id, { status: OrderStatus.COMPLETED });

        if (order.user?.email) {
          this.notificationService
            .sendOrderConfirmed(order.user.email, {
              orderNumber: order.orderNumber,
              totalAmount: order.totalAmount,
              recipientName: order.recipientName,
            })
            .catch((err) => this.logger.warn(`Failed to send confirmation email: ${String(err)}`));
        }
      }

      this.logger.log(`[cron:delivered-order-confirm] Completed confirming ${deliveredOrders.length} orders`);
    } catch (err) {
      this.logger.error(`[cron:delivered-order-confirm] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCouponExpiry(): Promise<void> {
    const lockName = 'cron:coupon-expiry';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const now = new Date();

      const result = await this.couponRepo
        .createQueryBuilder()
        .update(Coupon)
        .set({ isActive: false })
        .where('is_active = :isActive', { isActive: true })
        .andWhere('expires_at < :now', { now })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`[cron:coupon-expiry] Deactivated ${result.affected} expired coupons`);
      } else {
        this.logger.debug('[cron:coupon-expiry] No expired coupons to deactivate');
      }
    } catch (err) {
      this.logger.error(`[cron:coupon-expiry] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handlePointExpiry(): Promise<void> {
    const lockName = 'cron:point-expiry';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const now = new Date();

      // Only process earn entries that have expired and have NOT yet had an expire record created.
      // We use a subquery to exclude users where an expire record already covers this expiry window.
      const expiredPoints = await this.dataSource.query<
        Array<{ id: number; user_id: number; amount: number; expires_at: string }>
      >(
        `SELECT ph.id, ph.user_id, ph.amount, ph.expires_at
         FROM point_history ph
         WHERE ph.type = 'earn'
           AND ph.expires_at IS NOT NULL
           AND ph.expires_at < ?
           AND NOT EXISTS (
             SELECT 1 FROM point_history ex
             WHERE ex.user_id = ph.user_id
               AND ex.type = 'expire'
               AND ex.description = '포인트 만료'
               AND DATE(ex.created_at) = DATE(?)
           )`,
        [now, now],
      );

      if (expiredPoints.length === 0) {
        this.logger.debug('[cron:point-expiry] No expired points to process');
        return;
      }

      this.logger.log(`[cron:point-expiry] Processing ${expiredPoints.length} expired point records`);

      const userExpiredMap = new Map<number, number>();
      for (const ph of expiredPoints) {
        const uid = Number(ph.user_id);
        const current = userExpiredMap.get(uid) || 0;
        userExpiredMap.set(uid, current + Number(ph.amount));
      }

      for (const [userId, totalExpired] of userExpiredMap) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
          const latestBalance = await queryRunner.manager.findOne(PointHistory, {
            where: { userId },
            order: { createdAt: 'DESC', id: 'DESC' },
          });

          const currentBalance = latestBalance?.balance ?? 0;
          const expireAmount = Math.min(totalExpired, currentBalance);

          if (expireAmount > 0 && currentBalance > 0) {
            await queryRunner.manager.save(PointHistory, {
              userId,
              type: 'expire',
              amount: -expireAmount,
              balance: currentBalance - expireAmount,
              description: '포인트 만료',
              expiresAt: null,
            });

            const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
            if (user?.email) {
              this.notificationService
                .sendEmail({
                  to: user.email,
                  subject: '[옥화당] 포인트 만료 안내',
                  text: `안녕하세요. 고객님의 포인트 ${expireAmount.toLocaleString()}원이 만료되었습니다.`,
                  html: `<p>안녕하세요.</p><p>고객님의 포인트 <strong>${expireAmount.toLocaleString()}원</strong>이 만료되었습니다.</p>`,
                })
                .catch((err) => this.logger.warn(`Failed to send point expiry email: ${String(err)}`));
            }
          }

          await queryRunner.commitTransaction();
          this.logger.log(`[cron:point-expiry] Expired ${expireAmount} points for user ${userId}`);
        } catch (err) {
          await queryRunner.rollbackTransaction();
          this.logger.error(`[cron:point-expiry] Failed to expire points for user ${userId}: ${String(err)}`);
        } finally {
          await queryRunner.release();
        }
      }

      this.logger.log(`[cron:point-expiry] Completed processing ${expiredPoints.length} expired point records`);
    } catch (err) {
      this.logger.error(`[cron:point-expiry] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handlePointExpiryNotification(): Promise<void> {
    const lockName = 'cron:point-expiry-notification';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const now = new Date();

      for (const daysAhead of [30, 7]) {
        const windowStart = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
        const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

        const expiringEntries = await this.dataSource.query<
          Array<{ user_id: number; total_amount: string; email: string | null; name: string | null }>
        >(
          `SELECT ph.user_id, SUM(ph.amount) AS total_amount, u.email, u.name
           FROM point_history ph
           JOIN users u ON u.id = ph.user_id
           WHERE ph.type = 'earn'
             AND ph.expires_at >= ?
             AND ph.expires_at < ?
           GROUP BY ph.user_id, u.email, u.name
           HAVING SUM(ph.amount) > 0`,
          [windowStart, windowEnd],
        );

        if (expiringEntries.length === 0) {
          this.logger.debug(`[cron:point-expiry-notification] No points expiring in ${daysAhead} days`);
          continue;
        }

        this.logger.log(
          `[cron:point-expiry-notification] Sending ${daysAhead}-day expiry notifications to ${expiringEntries.length} users`,
        );

        for (const entry of expiringEntries) {
          if (!entry.email) continue;
          const amount = Number(entry.total_amount);
          const expiryDateStr = windowStart.toLocaleDateString('ko-KR');

          this.notificationService
            .sendEmail({
              to: entry.email,
              subject: `[옥화당] 포인트 만료 ${daysAhead}일 전 안내`,
              text: `안녕하세요${entry.name ? ` ${entry.name}` : ''}님. 보유하신 포인트 ${amount.toLocaleString()}원이 ${expiryDateStr}에 만료될 예정입니다.`,
              html: `<p>안녕하세요${entry.name ? ` <strong>${entry.name}</strong>` : ''}님.</p><p>보유하신 포인트 <strong>${amount.toLocaleString()}원</strong>이 <strong>${expiryDateStr}</strong>에 만료될 예정입니다.</p><p>포인트를 사용하여 혜택을 누려보세요.</p>`,
            })
            .catch((err) =>
              this.logger.warn(`Failed to send point expiry notification email: ${String(err)}`),
            );
        }
      }

      this.logger.log('[cron:point-expiry-notification] Completed');
    } catch (err) {
      this.logger.error(`[cron:point-expiry-notification] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleScheduledAccountDeletion(): Promise<void> {
    const lockName = 'cron:account-deletion';
    if (!(await this.acquireLock(lockName, 55))) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const now = new Date();
      const targets = await this.userRepo
        .createQueryBuilder('user')
        .where('user.deletionScheduledAt IS NOT NULL')
        .andWhere('user.deletionScheduledAt <= :now', { now })
        .andWhere('user.deletedAt IS NULL')
        .getMany();

      if (targets.length === 0) {
        this.logger.debug('[cron:account-deletion] No scheduled accounts to anonymize');
        return;
      }

      this.logger.log(`[cron:account-deletion] Processing ${targets.length} account(s)`);

      for (const user of targets) {
        await this.anonymizeUser(user);
      }

      this.logger.log(`[cron:account-deletion] Completed ${targets.length} account(s)`);
    } catch (err) {
      this.logger.error(`[cron:account-deletion] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  private buildDeletionHash(userId: number, source: string): string {
    return createHash('sha256')
      .update(`${userId}:${source}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16);
  }

  private async anonymizeUser(user: User): Promise<void> {
    const hash = this.buildDeletionHash(Number(user.id), user.email);
    const originalEmail = user.email;

    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, Number(user.id), {
        name: `탈퇴회원-${hash.slice(0, 8)}`,
        email: `deleted+${Number(user.id)}.${hash}@okhwadang.local`,
        phone: `deleted-${hash.slice(0, 12)}`,
        password: null,
        refreshToken: null,
        isActive: false,
        isEmailVerified: false,
        emailVerifiedAt: null,
        deletedAt: new Date(),
      });

      await manager.delete(UserAddress, { userId: Number(user.id) });
    });

    if (originalEmail) {
      void this.notificationService.sendEmail({
        to: originalEmail,
        subject: '[옥화당] 회원 탈퇴 처리 완료 안내',
        text: '요청하신 회원 탈퇴가 완료되었습니다. 개인정보는 익명화되어 보관됩니다.',
        html: '<p>요청하신 회원 탈퇴가 완료되었습니다.</p><p>개인정보는 익명화되어 보관됩니다.</p>',
      });
    }
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
