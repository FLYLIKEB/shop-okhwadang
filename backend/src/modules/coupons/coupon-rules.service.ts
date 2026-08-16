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
import { AdminCouponRuleListQueryDto } from './dto/admin-coupon-rule-list-query.dto';
import { MembershipEventEmitter } from '../membership/membership-event.emitter';
import { AuthEventEmitter } from '../auth/auth-event.emitter';
import { OrderEventEmitter } from '../orders/order-event.emitter';
import { User } from '../users/entities/user.entity';
import { SchedulerLockService } from '../../common/services/scheduler-lock.service';

const BIRTHDAY_COUPON_USER_BATCH_SIZE = 20;

export interface AdminCouponRuleResponse {
  id: number;
  trigger: CouponRuleTrigger;
  couponTemplateId: number;
  couponTemplate: { id: number; code: string; name: string } | null;
  conditionsJson: Record<string, unknown> | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}


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
    private readonly schedulerLockService: SchedulerLockService,
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
      if (event.customerType === 'member' && event.userId !== null && event.isFirstPurchase) {
        // UserCoupon has a unique (userId, couponId) grant constraint, so retries
        // cannot issue the same first-purchase coupon twice.
        await this.applyRulesForUser(CouponRuleTrigger.FIRST_PURCHASE, event.userId, {}, true);
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
    throwOnFailure = false,
  ): Promise<void> {
    const rules = await this.couponRuleRepo.find({
      where: { trigger, active: true },
    });

    const matchingCouponIds = rules
      .filter((rule) => this.matchesConditions(rule, context))
      .map((rule) => Number(rule.couponTemplateId));

    await this.issueCouponsForUser(trigger, userId, matchingCouponIds, throwOnFailure);
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

  private toAdminRuleResponse(rule: CouponRule): AdminCouponRuleResponse {
    return {
      id: Number(rule.id),
      trigger: rule.trigger,
      couponTemplateId: Number(rule.couponTemplateId),
      couponTemplate: rule.couponTemplate
        ? {
            id: Number(rule.couponTemplate.id),
            code: rule.couponTemplate.code,
            name: rule.couponTemplate.name,
          }
        : null,
      conditionsJson: rule.conditionsJson,
      active: rule.active,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }


  // Birthday coupon batch — runs daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleBirthdayCoupons(): Promise<void> {
    await this.schedulerLockService.runWithLock(
      { lockName: 'cron:birthday-coupons', ttlMinutes: 55 },
      async () => {
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

      const couponIds = rules.map((rule) => Number(rule.couponTemplateId));
      for (let index = 0; index < birthdayUsers.length; index += BIRTHDAY_COUPON_USER_BATCH_SIZE) {
        const chunk = birthdayUsers.slice(index, index + BIRTHDAY_COUPON_USER_BATCH_SIZE);
        await Promise.allSettled(
          chunk.map(({ id: userId }) =>
            this.issueCouponsForUser('cron:birthday-coupons', userId, couponIds),
          ),
        );
      }

      this.logger.log(`[cron:birthday-coupons] Completed for ${birthdayUsers.length} users`);
      },
    );
  }

  // Admin CRUD

  async findAll(query: AdminCouponRuleListQueryDto): Promise<{
    items: AdminCouponRuleResponse[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = Math.min(Math.max(1, query.limit ?? 20), 100);
    const skip = (page - 1) * limit;
    const [items, total] = await this.couponRuleRepo.findAndCount({
      relations: ['couponTemplate'],
      order: { createdAt: 'DESC', id: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items: items.map((rule) => this.toAdminRuleResponse(rule)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number): Promise<AdminCouponRuleResponse> {
    const rule = await this.couponRuleRepo.findOne({ where: { id }, relations: ['couponTemplate'] });
    if (!rule) {
      throw new NotFoundException('쿠폰 규칙을 찾을 수 없습니다.');
    }
    return this.toAdminRuleResponse(rule);
  }



  async create(dto: CreateCouponRuleDto): Promise<AdminCouponRuleResponse> {
    const rule = this.couponRuleRepo.create({
      trigger: dto.trigger,
      couponTemplateId: dto.couponTemplateId,
      conditionsJson: dto.conditionsJson ?? null,
      active: dto.active ?? true,
    });
    const saved = await this.couponRuleRepo.save(rule);
    this.logger.log(`CouponRule created: id=${saved.id} trigger=${saved.trigger}`);
    return this.findOne(Number(saved.id));
  }

  async update(id: number, dto: UpdateCouponRuleDto): Promise<AdminCouponRuleResponse> {
    const current = await this.couponRuleRepo.findOne({ where: { id }, relations: ['couponTemplate'] });
    if (!current) {
      throw new NotFoundException('쿠폰 규칙을 찾을 수 없습니다.');
    }

    if (dto.trigger !== undefined) current.trigger = dto.trigger;
    if (dto.couponTemplateId !== undefined) current.couponTemplateId = dto.couponTemplateId;
    if (dto.conditionsJson !== undefined) current.conditionsJson = dto.conditionsJson ?? null;
    if (dto.active !== undefined) current.active = dto.active;

    const saved = await this.couponRuleRepo.save(current);
    this.logger.log(`CouponRule updated: id=${saved.id}`);
    return this.findOne(Number(saved.id));
  }

  async remove(id: number): Promise<{ message: string }> {
    const rule = await this.couponRuleRepo.findOne({ where: { id }, relations: ['couponTemplate'] });
    if (!rule) {
      throw new NotFoundException('쿠폰 규칙을 찾을 수 없습니다.');
    }
    await this.couponRuleRepo.remove(rule);
    this.logger.log(`CouponRule deleted: id=${id}`);
    return { message: '삭제되었습니다.' };
  }

  private async issueCouponsForUser(
    trigger: string,
    userId: number,
    couponIds: number[],
    throwOnFailure = false,
  ): Promise<void> {
    if (couponIds.length === 0) {
      return;
    }

    const results = await this.couponsService.issueCouponsForUser(userId, couponIds);
    for (const result of results) {
      if (result.issued) {
        this.logger.log(
          `[${trigger}] Issued couponTemplateId=${result.couponId} to userId=${userId}`,
        );
      } else {
        if (throwOnFailure && result.reason !== '이미 발급된 쿠폰입니다.') {
          throw new Error(`[${trigger}] Failed to issue couponTemplateId=${result.couponId}: ${result.reason ?? 'unknown error'}`);
        }
        this.logger.debug(
          `[${trigger}] Skipped couponTemplateId=${result.couponId} for userId=${userId}: ${result.reason ?? 'unknown error'}`,
        );
      }
    }
  }
}
