import { Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { User } from '../../users/entities/user.entity';
import { UserAddress } from '../../users/entities/user-address.entity';
import { RecentlyViewedProduct } from '../../products/entities/recently-viewed-product.entity';
import { NotificationService } from '../../notification/notification.service';
import { MembershipService } from '../../membership/membership.service';

interface UserLifecycleSchedulerJobDependencies {
  userRepo: Repository<User>;
  recentlyViewedRepo: Repository<RecentlyViewedProduct>;
  dataSource: DataSource;
  notificationService: NotificationService;
  membershipService: MembershipService;
  logger: Logger;
}

export class UserLifecycleSchedulerJob {
  constructor(private readonly deps: UserLifecycleSchedulerJobDependencies) {}

  async handleScheduledAccountDeletion(): Promise<void> {
    const now = new Date();
    const targets = await this.deps.userRepo
      .createQueryBuilder('user')
      .where('user.deletionScheduledAt IS NOT NULL')
      .andWhere('user.deletionScheduledAt <= :now', { now })
      .andWhere('user.deletedAt IS NULL')
      .getMany();

    if (targets.length === 0) {
      this.deps.logger.debug('[cron:account-deletion] No scheduled accounts to anonymize');
      return;
    }

    this.deps.logger.log(`[cron:account-deletion] Processing ${targets.length} account(s)`);

    for (const user of targets) {
      await this.anonymizeUser(user);
    }

    this.deps.logger.log(`[cron:account-deletion] Completed ${targets.length} account(s)`);
  }

  async handleRecentlyViewedCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.deps.recentlyViewedRepo
      .createQueryBuilder()
      .delete()
      .from(RecentlyViewedProduct)
      .where('viewed_at < :cutoff', { cutoff })
      .execute();

    const deleted = result.affected ?? 0;
    if (deleted > 0) {
      this.deps.logger.log(`[cron:recently-viewed-cleanup] Deleted ${deleted} records older than 90 days`);
    } else {
      this.deps.logger.debug('[cron:recently-viewed-cleanup] No old records to delete');
    }
  }

  async handleMonthlyTierEvaluation(): Promise<void> {
    this.deps.logger.log('[cron:monthly-tier-evaluation] Starting tier re-evaluation');
    await this.deps.membershipService.evaluateAllUserTiers();
    this.deps.logger.log('[cron:monthly-tier-evaluation] Completed tier re-evaluation');
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

    await this.deps.dataSource.transaction(async (manager) => {
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
      void Promise.resolve(
        this.deps.notificationService.sendEmail({
          to: originalEmail,
          subject: '[옥화당] 회원 탈퇴 처리 완료 안내',
          text: '요청하신 회원 탈퇴가 완료되었습니다. 개인정보는 익명화되어 보관됩니다.',
          html: '<p>요청하신 회원 탈퇴가 완료되었습니다.</p><p>개인정보는 익명화되어 보관됩니다.</p>',
        }),
      ).catch((err) => this.deps.logger.warn(`Failed to send account deletion email: ${String(err)}`));
    }
  }
}
