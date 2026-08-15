import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notification/notification.service';
import { PointsService } from '../../points/points.service';

interface PointSchedulerJobDependencies {
  dataSource: DataSource;
  logger: Logger;
  notificationService: NotificationService;
  pointsService: Pick<PointsService, 'getRunningBalanceInTx' | 'lockUserForPointChanges'>;
}

export class PointSchedulerJob {
  constructor(private readonly deps: PointSchedulerJobDependencies) {}

  async handlePointExpiry(): Promise<void> {
    const now = new Date();

    // Candidate selection is only a cross-instance optimization. Each user's credit
    // lots are reloaded after its canonical point-ledger lock has been acquired.
    const candidateUsers = await this.deps.dataSource.query<
      Array<{ user_id: number }>
    >(
      `SELECT DISTINCT ph.user_id
       FROM point_history ph
       WHERE ph.type IN ('earn', 'admin_adjust')
         AND ph.amount > 0
         AND ph.remaining_amount > 0
         AND ph.expires_at IS NOT NULL
         AND ph.expires_at <= ?`,
      [now],
    );

    if (candidateUsers.length === 0) {
      this.deps.logger.debug('[cron:point-expiry] No expired points to process');
      return;
    }

    this.deps.logger.log(`[cron:point-expiry] Processing ${candidateUsers.length} candidate users`);

    for (const candidate of candidateUsers) {
      const userId = Number(candidate.user_id);
      const queryRunner = this.deps.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.deps.pointsService.lockUserForPointChanges(queryRunner.manager, userId);

        const lots = await queryRunner.manager
          .createQueryBuilder(PointHistory, 'ph')
          .setLock('pessimistic_write')
          .where('ph.user_id = :userId', { userId })
          .andWhere(`ph.type IN ('earn', 'admin_adjust')`)
          .andWhere('ph.amount > 0')
          .andWhere('ph.remaining_amount > 0')
          .andWhere('ph.expires_at IS NOT NULL')
          .andWhere('ph.expires_at <= :now', { now })
          .orderBy('ph.expires_at', 'ASC')
          .addOrderBy('ph.created_at', 'ASC')
          .addOrderBy('ph.id', 'ASC')
          .getMany();

        let currentBalance = await this.deps.pointsService.getRunningBalanceInTx(queryRunner.manager, userId);
        let totalExpired = 0;

        for (const lot of lots) {
          const expireAmount = Number(lot.remainingAmount);
          if (expireAmount <= 0) continue;

          lot.remainingAmount = 0;
          await queryRunner.manager.save(PointHistory, lot);

          currentBalance -= expireAmount;
          totalExpired += expireAmount;

          await queryRunner.manager.save(PointHistory, {
            userId,
            type: 'expire',
            amount: -expireAmount,
            remainingAmount: null,
            balance: currentBalance,
            description: '포인트 만료',
            expiresAt: null,
            relatedEntityType: null,
            relatedEntityId: lot.id,
          });
        }

        if (totalExpired > 0) {
          const user = await queryRunner.manager.findOne(User, { where: { id: userId } });
          if (user?.email) {
            void Promise.resolve(
              this.deps.notificationService.sendEmail({
                to: user.email,
                subject: '[옥화당] 포인트 만료 안내',
                text: `안녕하세요. 고객님의 포인트 ${totalExpired.toLocaleString()}원이 만료되었습니다.`,
                html: `<p>안녕하세요.</p><p>고객님의 포인트 <strong>${totalExpired.toLocaleString()}원</strong>이 만료되었습니다.</p>`,
              }),
            )
              .catch((err) => this.deps.logger.warn(`Failed to send point expiry email: ${String(err)}`));
          }
        }

        await queryRunner.commitTransaction();
        this.deps.logger.log(`[cron:point-expiry] Expired ${totalExpired} points for user ${userId}`);
      } catch (err) {
        await queryRunner.rollbackTransaction();
        this.deps.logger.error(`[cron:point-expiry] Failed to expire points for user ${userId}: ${String(err)}`);
      } finally {
        await queryRunner.release();
      }
    }

    this.deps.logger.log(`[cron:point-expiry] Completed processing ${candidateUsers.length} candidate users`);
  }

  async handlePointExpiryNotification(): Promise<void> {
    const now = new Date();

    for (const daysAhead of [30, 7]) {
      const windowStart = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);

      const expiringEntries = await this.deps.dataSource.query<
        Array<{ user_id: number; total_amount: string; email: string | null; name: string | null }>
      >(
        `SELECT ph.user_id, SUM(ph.remaining_amount) AS total_amount, u.email, u.name
         FROM point_history ph
         JOIN users u ON u.id = ph.user_id
         WHERE ph.type = 'earn'
           AND ph.remaining_amount > 0
           AND ph.expires_at >= ?
           AND ph.expires_at < ?
         GROUP BY ph.user_id, u.email, u.name
         HAVING SUM(ph.remaining_amount) > 0`,
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
