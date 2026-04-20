import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CouponRule, CouponRuleTrigger } from './entities/coupon-rule.entity';
import { CouponsService } from './coupons.service';
import { CreateCouponRuleDto } from './dto/create-coupon-rule.dto';
import { UpdateCouponRuleDto } from './dto/update-coupon-rule.dto';
import { MembershipEventEmitter } from '../membership/membership-event.emitter';
import { AuthEventEmitter } from '../auth/auth-event.emitter';
import { OrderEventEmitter } from '../orders/order-event.emitter';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CouponRulesService implements OnModuleInit {
  private readonly logger = new Logger(CouponRulesService.name);

  constructor(
    @InjectRepository(CouponRule)
    private readonly couponRuleRepo: Repository<CouponRule>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly couponsService: CouponsService,
    private readonly membershipEvents: MembershipEventEmitter,
    private readonly authEvents: AuthEventEmitter,
    private readonly orderEvents: OrderEventEmitter,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    this.authEvents.onUserRegistered(async (event) => {
      try {
        await this.applyRulesForUser(CouponRuleTrigger.SIGNUP, event.userId);
      } catch (err) {
        this.logger.warn(`[signup] Failed to issue coupon for userId=${event.userId}: ${String(err)}`);
      }
    });

    this.orderEvents.onOrderCompleted(async (event) => {
      if (event.isFirstPurchase) {
        try {
          await this.applyRulesForUser(CouponRuleTrigger.FIRST_PURCHASE, event.userId);
        } catch (err) {
          this.logger.warn(`[first_purchase] Failed to issue coupon for userId=${event.userId}: ${String(err)}`);
        }
      }
    });

    this.membershipEvents.onTierUpgraded(async (event) => {
      try {
        await this.applyRulesForUser(CouponRuleTrigger.TIER_UP, event.userId, { newTier: event.newTier });
      } catch (err) {
        this.logger.warn(`[tier_up] Failed to issue coupon for userId=${event.userId}: ${String(err)}`);
      }
    });
  }

  async applyRulesForUser(
    trigger: CouponRuleTrigger,
    userId: number,
    context: Record<string, unknown> = {},
  ): Promise<void> {
    const rules = await this.couponRuleRepo.find({
      where: { trigger, active: true },
    });

    for (const rule of rules) {
      if (!this.matchesConditions(rule, context)) {
        continue;
      }

      try {
        await this.couponsService.issueCoupon({ userId, couponId: Number(rule.couponTemplateId) });
        this.logger.log(
          `[${trigger}] Issued couponTemplateId=${rule.couponTemplateId} to userId=${userId}`,
        );
      } catch (err) {
        // BadRequestException for duplicate issues is expected — skip silently
        this.logger.debug(
          `[${trigger}] Skipped couponTemplateId=${rule.couponTemplateId} for userId=${userId}: ${String(err)}`,
        );
      }
    }
  }

  private matchesConditions(rule: CouponRule, context: Record<string, unknown>): boolean {
    const cond = rule.conditionsJson;
    if (!cond) return true;

    if (rule.trigger === CouponRuleTrigger.TIER_UP && cond['minTier']) {
      const tierOrder = ['Bronze', 'Silver', 'Gold', 'VIP'];
      const minIdx = tierOrder.indexOf(String(cond['minTier']));
      const newIdx = tierOrder.indexOf(String(context['newTier'] ?? ''));
      if (minIdx < 0 || newIdx < minIdx) return false;
    }

    return true;
  }

  // Birthday coupon batch — runs daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBirthdayCoupons(): Promise<void> {
    const lockName = 'cron:birthday-coupons';
    const acquired = await this.acquireLock(lockName, 55);
    if (!acquired) {
      this.logger.debug(`[${lockName}] Skipped - another instance holds the lock`);
      return;
    }

    try {
      const rules = await this.couponRuleRepo.find({
        where: { trigger: CouponRuleTrigger.BIRTHDAY, active: true },
      });

      if (rules.length === 0) {
        this.logger.debug('[cron:birthday-coupons] No active birthday rules');
        return;
      }

      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const birthdayUsers = await this.dataSource.query<Array<{ id: number }>>(
        `SELECT id FROM users
         WHERE MONTH(birth_date) = ? AND DAY(birth_date) = ?
           AND is_active = 1 AND deleted_at IS NULL`,
        [month, day],
      );

      if (birthdayUsers.length === 0) {
        this.logger.debug(`[cron:birthday-coupons] No users with birthday today (${month}/${day})`);
        return;
      }

      this.logger.log(
        `[cron:birthday-coupons] Processing ${birthdayUsers.length} users with birthday on ${month}/${day}`,
      );

      for (const { id: userId } of birthdayUsers) {
        for (const rule of rules) {
          try {
            await this.couponsService.issueCoupon({ userId, couponId: Number(rule.couponTemplateId) });
            this.logger.log(`[cron:birthday-coupons] Issued couponTemplateId=${rule.couponTemplateId} to userId=${userId}`);
          } catch (err) {
            this.logger.debug(
              `[cron:birthday-coupons] Skipped couponTemplateId=${rule.couponTemplateId} for userId=${userId}: ${String(err)}`,
            );
          }
        }
      }

      this.logger.log(`[cron:birthday-coupons] Completed for ${birthdayUsers.length} users`);
    } catch (err) {
      this.logger.error(`[cron:birthday-coupons] Error: ${String(err)}`);
    } finally {
      await this.releaseLock(lockName);
    }
  }

  // Admin CRUD

  async findAll(): Promise<CouponRule[]> {
    return this.couponRuleRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<CouponRule> {
    const rule = await this.couponRuleRepo.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('쿠폰 규칙을 찾을 수 없습니다.');
    }
    return rule;
  }

  async create(dto: CreateCouponRuleDto): Promise<CouponRule> {
    const rule = this.couponRuleRepo.create({
      trigger: dto.trigger,
      couponTemplateId: dto.couponTemplateId,
      conditionsJson: dto.conditionsJson ?? null,
      active: dto.active ?? true,
    });
    const saved = await this.couponRuleRepo.save(rule);
    this.logger.log(`CouponRule created: id=${saved.id} trigger=${saved.trigger}`);
    return saved;
  }

  async update(id: number, dto: UpdateCouponRuleDto): Promise<CouponRule> {
    const rule = await this.findOne(id);

    if (dto.trigger !== undefined) rule.trigger = dto.trigger;
    if (dto.couponTemplateId !== undefined) rule.couponTemplateId = dto.couponTemplateId;
    if (dto.conditionsJson !== undefined) rule.conditionsJson = dto.conditionsJson ?? null;
    if (dto.active !== undefined) rule.active = dto.active;

    const saved = await this.couponRuleRepo.save(rule);
    this.logger.log(`CouponRule updated: id=${saved.id}`);
    return saved;
  }

  async remove(id: number): Promise<{ message: string }> {
    const rule = await this.findOne(id);
    await this.couponRuleRepo.remove(rule);
    this.logger.log(`CouponRule deleted: id=${id}`);
    return { message: '삭제되었습니다.' };
  }

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
}
