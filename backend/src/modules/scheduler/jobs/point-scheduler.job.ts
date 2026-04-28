import { DataSource, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notification/notification.service';

interface PointSchedulerJobDependencies {
  dataSource: DataSource;
  logger: Logger;
  notificationService: NotificationService;
  pointHistoryRepo: Repository<PointHistory>;
  userRepo: Repository<User>;
}

export class PointSchedulerJob {
  constructor(private readonly deps: PointSchedulerJobDependencies) {}

  async handlePointExpiry(): Promise<void> {
    const now = new Date();

    // Only process earn entries that have expired and have NOT yet had an expire record created.
    const expiredPoints = await this.deps.dataSource.query<
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
      this.deps.logger.debug('[cron:point-expiry] No expired points to process');
      return;
    }

    this.deps.logger.log(`[cron:point-expiry] Processing ${expiredPoints.length} expired point records`);

    const userExpiredMap = new Map<number, number>();
    for (const ph of expiredPoints) {
      const uid = Number(ph.user_id);
      const current = userExpiredMap.get(uid) || 0;
      userExpiredMap.set(uid, current + Number(ph.amount));
    }

    for (const [userId, totalExpired] of userExpiredMap) {
      const queryRunner = this.deps.dataSource.createQueryRunner();
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
            void Promise.resolve(
              this.deps.notificationService.sendEmail({
                to: user.email,
                subject: '[옥화당] 포인트 만료 안내',
                text: `안녕하세요. 고객님의 포인트 ${expireAmount.toLocaleString()}원이 만료되었습니다.`,
                html: `<p>안녕하세요.</p><p>고객님의 포인트 <strong>${expireAmount.toLocaleString()}원</strong>이 만료되었습니다.</p>`,
              }),
            )
              .catch((err) => this.deps.logger.warn(`Failed to send point expiry email: ${String(err)}`));
          }
        }

        await queryRunner.commitTransaction();
        this.deps.logger.log(`[cron:point-expiry] Expired ${expireAmount} points for user ${userId}`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.deps.logger.error(`[cron:point-expiry] Failed to expire points for user ${userId}: ${String(err)}`);
      } finally {
        await queryRunner.release();
      }
    }

    this.deps.logger.log(`[cron:point-expiry] Completed processing ${expiredPoints.length} expired point records`);
  }

  async handlePointExpiryNotification(): Promise<void> {
    const now = new Date();

    for (const daysAhead of [30, 7]) {
      const windowStart = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      const expiringEntries = await this.deps.dataSource.query<
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
        this.deps.logger.debug(`[cron:point-expiry-notification] No points expiring in ${daysAhead} days`);
        continue;
      }

      this.deps.logger.log(
        `[cron:point-expiry-notification] Sending ${daysAhead}-day expiry notifications to ${expiringEntries.length} users`,
      );

      for (const entry of expiringEntries) {
        if (!entry.email) continue;
        const amount = Number(entry.total_amount);
        const expiryDateStr = windowStart.toLocaleDateString('ko-KR');

        void Promise.resolve(
          this.deps.notificationService.sendEmail({
            to: entry.email,
            subject: `[옥화당] 포인트 만료 ${daysAhead}일 전 안내`,
            text: `안녕하세요${entry.name ? ` ${entry.name}` : ''}님. 보유하신 포인트 ${amount.toLocaleString()}원이 ${expiryDateStr}에 만료될 예정입니다.`,
            html: `<p>안녕하세요${entry.name ? ` <strong>${entry.name}</strong>` : ''}님.</p><p>보유하신 포인트 <strong>${amount.toLocaleString()}원</strong>이 <strong>${expiryDateStr}</strong>에 만료될 예정입니다.</p><p>포인트를 사용하여 혜택을 누려보세요.</p>`,
          }),
        )
          .catch((err) =>
            this.deps.logger.warn(`Failed to send point expiry notification email: ${String(err)}`),
          );
      }
    }

    this.deps.logger.log('[cron:point-expiry-notification] Completed');
  }
}
