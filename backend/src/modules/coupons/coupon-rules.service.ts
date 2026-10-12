import {
  Injectable,
  BadRequestException,
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
import { MembershipService } from '../membership/membership.service';
import { AuthEventEmitter } from '../auth/auth-event.emitter';
import { OrderEventEmitter } from '../orders/order-event.emitter';
import { User } from '../users/entities/user.entity';
import { SchedulerLockService } from '../../common/services/scheduler-lock.service';

const BIRTHDAY_COUPON_USER_BATCH_SIZE = 20;
const BIRTH_DATE_COLUMN_EXISTS_SQL = `
  SELECT COUNT(*) AS count
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'birth_date'
`;

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
    private readonly membershipService: MembershipService,
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

    const tierRanks = trigger === CouponRuleTrigger.TIER_UP
      ? await this.getTierRanks()
      : null;
    const matchingCouponIds: number[] = [];
    for (const rule of rules) {
      if (this.matchesConditions(rule, context, tierRanks)) {
        matchingCouponIds.push(Number(rule.couponTemplateId));
      }
    }

    await this.issueCouponsForUser(trigger, userId, matchingCouponIds, throwOnFailure);
  }

  private async assertTriggerSupported(trigger: CouponRuleTrigger): Promise<void> {
    if (trigger === CouponRuleTrigger.BIRTHDAY && !(await this.hasBirthDateColumn())) {
      throw new BadRequestException('생일 쿠폰은 회원 생년월일 컬럼이 준비된 후 사용할 수 있습니다.');
    }
  }

  private async hasBirthDateColumn(): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ count: string | number }>>(BIRTH_DATE_COLUMN_EXISTS_SQL);
    return Number(rows[0]?.count ?? 0) > 0;
  }

  private async getTierRanks(): Promise<Map<string, number>> {
    const tiers = await this.membershipService.findAllTiers();
    return new Map(
      tiers
        .sort((a, b) => Number(a.minAmount) - Number(b.minAmount))
        .map((tier, index) => [tier.name, index]),
    );
  }

  private async normalizeConditions(
    trigger: CouponRuleTrigger,
    conditionsJson?: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (!conditionsJson || Object.keys(conditionsJson).length === 0) {
      return null;
    }

    if (trigger !== CouponRuleTrigger.TIER_UP) {
      throw new BadRequestException('조건 JSON은 등급 상승 트리거에서만 사용할 수 있습니다.');
    }

    const keys = Object.keys(conditionsJson);
    if (keys.some((key) => key !== 'minTier')) {
      throw new BadRequestException('지원하지 않는 쿠폰 규칙 조건입니다.');
    }

    const minTier = conditionsJson.minTier;
    if (typeof minTier !== 'string' || minTier.trim().length === 0) {
      throw new BadRequestException('minTier 조건에는 등급명을 입력해야 합니다.');
    }
    const normalizedMinTier = minTier.trim();

    const tierRanks = await this.getTierRanks();
    if (!tierRanks.has(normalizedMinTier)) {
      throw new BadRequestException('존재하지 않는 회원 등급입니다.');
    }

    return { minTier: normalizedMinTier };
  }

  private matchesConditions(
    rule: CouponRule,
    context: Record<string, unknown>,
    tierRanks: Map<string, number> | null,
  ): boolean {
    const cond = rule.conditionsJson;
    if (!cond) return true;

    if (rule.trigger === CouponRuleTrigger.TIER_UP && cond['minTier']) {
      const minIdx = tierRanks?.get(String(cond['minTier'])) ?? -1;
      const newIdx = tierRanks?.get(String(context['newTier'] ?? '')) ?? -1;
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

      if (!(await this.hasBirthDateColumn())) {
        this.logger.warn('[cron:birthday-coupons] users.birth_date column is missing; skipping birthday coupon issuance');
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
    await this.assertTriggerSupported(dto.trigger);
    const conditionsJson = await this.normalizeConditions(dto.trigger, dto.conditionsJson);
    const rule = this.couponRuleRepo.create({
      trigger: dto.trigger,
      couponTemplateId: dto.couponTemplateId,
      conditionsJson,
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

    await this.assertTriggerSupported(dto.trigger ?? current.trigger);
    const nextTrigger = dto.trigger ?? current.trigger;
    const shouldNormalizeConditions = dto.conditionsJson !== undefined || dto.trigger !== undefined;
    const requestedConditions = dto.conditionsJson !== undefined
      ? dto.conditionsJson
      : dto.trigger !== undefined
        ? null
        : current.conditionsJson;
    const nextConditions = shouldNormalizeConditions
      ? await this.normalizeConditions(nextTrigger, requestedConditions)
      : current.conditionsJson;

    if (dto.trigger !== undefined) current.trigger = dto.trigger;
    if (dto.couponTemplateId !== undefined) current.couponTemplateId = dto.couponTemplateId;
    if (dto.conditionsJson !== undefined) current.conditionsJson = nextConditions;
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
