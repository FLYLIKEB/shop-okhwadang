import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Coupon } from './entities/coupon.entity';
import { CouponRule, CouponRuleTrigger } from './entities/coupon-rule.entity';
import { CouponsService } from './coupons.service';
import { CreateCouponRuleDto } from './dto/create-coupon-rule.dto';
import { UpdateCouponRuleDto } from './dto/update-coupon-rule.dto';
import { AdminCouponRuleListQueryDto } from './dto/admin-coupon-rule-list-query.dto';
import { MembershipEventEmitter } from '../membership/membership-event.emitter';
import { MembershipService } from '../membership/membership.service';
import { AuthEventEmitter } from '../auth/auth-event.emitter';
import { OrderEventEmitter } from '../orders/order-event.emitter';
import { SchedulerLockService } from '../../common/services/scheduler-lock.service';

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
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    private readonly couponsService: CouponsService,
    private readonly membershipEvents: MembershipEventEmitter,
    private readonly membershipService: MembershipService,
    private readonly authEvents: AuthEventEmitter,
    private readonly orderEvents: OrderEventEmitter,
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
        await this.applyRulesForUser(CouponRuleTrigger.FIRST_PURCHASE, event.userId);
      }
    });

    this.membershipEvents.onTierUpgraded(async (event) => {
      await this.applyRulesForUser(CouponRuleTrigger.TIER_UP, event.userId, { newTier: event.newTier });
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

    const tierThresholds = trigger === CouponRuleTrigger.TIER_UP
      ? await this.getTierThresholds()
      : null;
    const matchingCouponIds: number[] = [];
    for (const rule of rules) {
      if (this.matchesConditions(rule, context, tierThresholds)) {
        matchingCouponIds.push(Number(rule.couponTemplateId));
      }
    }

    await this.issueCouponsForUser(trigger, userId, matchingCouponIds);
  }

  private assertTriggerSupported(trigger: CouponRuleTrigger): void {
    if (trigger === CouponRuleTrigger.BIRTHDAY) {
      throw new BadRequestException('생일 쿠폰은 현재 지원하지 않습니다.');
    }
  }

  private async assertCouponTemplateExists(couponTemplateId: number): Promise<void> {
    if (!Number.isInteger(couponTemplateId) || couponTemplateId <= 0) {
      throw new BadRequestException('쿠폰 템플릿 ID는 양의 정수여야 합니다.');
    }
    const coupon = await this.couponRepo.findOne({ where: { id: couponTemplateId } });
    if (!coupon) {
      throw new BadRequestException('존재하지 않는 쿠폰 템플릿입니다.');
    }
  }

  private async getTierThresholds(): Promise<Map<string, number>> {
    const tiers = await this.membershipService.findAllTiers();
    return new Map(
      tiers.map((tier) => [tier.name, Number(tier.minAmount)]),
    );
  }

  private async normalizeConditions(
    trigger: CouponRuleTrigger,
    conditionsJson?: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (conditionsJson === null || conditionsJson === undefined) {
      return null;
    }
    if (typeof conditionsJson !== 'object' || Array.isArray(conditionsJson)) {
      throw new BadRequestException('지원하지 않는 쿠폰 규칙 조건입니다.');
    }

    const keys = Object.keys(conditionsJson);
    if (keys.length === 0) {
      return null;
    }

    if (trigger !== CouponRuleTrigger.TIER_UP) {
      throw new BadRequestException('조건 JSON은 등급 상승 트리거에서만 사용할 수 있습니다.');
    }
    if (keys.some((key) => key !== 'minTier')) {
      throw new BadRequestException('지원하지 않는 쿠폰 규칙 조건입니다.');
    }

    const minTier = conditionsJson.minTier;
    if (typeof minTier !== 'string' || minTier.trim().length === 0) {
      throw new BadRequestException('minTier 조건에는 등급명을 입력해야 합니다.');
    }
    const normalizedMinTier = minTier.trim();

    const tierThresholds = await this.getTierThresholds();
    if (!tierThresholds.has(normalizedMinTier)) {
      throw new BadRequestException('존재하지 않는 회원 등급입니다.');
    }

    return { minTier: normalizedMinTier };
  }

  private matchesConditions(
    rule: CouponRule,
    context: Record<string, unknown>,
    tierThresholds: Map<string, number> | null,
  ): boolean {
    if (rule.trigger === CouponRuleTrigger.BIRTHDAY) return false;

    const cond = rule.conditionsJson;
    if (cond === null || cond === undefined) return true;
    if (typeof cond !== 'object' || Array.isArray(cond)) return false;

    const keys = Object.keys(cond);
    if (keys.length === 0) return true;

    if (rule.trigger !== CouponRuleTrigger.TIER_UP || keys.some((key) => key !== 'minTier')) {
      return false;
    }

    const minTier = cond['minTier'];
    if (typeof minTier !== 'string' || minTier.trim().length === 0) {
      return false;
    }

    if (rule.trigger === CouponRuleTrigger.TIER_UP) {
      const minAmount = tierThresholds?.get(minTier.trim());
      const newAmount = tierThresholds?.get(String(context['newTier'] ?? ''));
      return minAmount !== undefined && newAmount !== undefined && newAmount >= minAmount;
    }

    return false;
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

        this.logger.warn('[cron:birthday-coupons] Birthday coupons are unsupported; skipping active legacy rules');
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
    const active = dto.active ?? true;
    this.assertTriggerSupported(dto.trigger);
    await this.assertCouponTemplateExists(dto.couponTemplateId);
    const conditionsJson = await this.normalizeConditions(dto.trigger, dto.conditionsJson);
    const rule = this.couponRuleRepo.create({
      trigger: dto.trigger,
      couponTemplateId: dto.couponTemplateId,
      conditionsJson,
      active,
    });
    const saved = await this.couponRuleRepo.save(rule);
    this.logger.log(`CouponRule created: id=${saved.id} trigger=${saved.trigger}`);
    return this.findOne(Number(saved.id));
  }

  async update(id: number, dto: UpdateCouponRuleDto): Promise<AdminCouponRuleResponse> {
    const current = await this.couponRuleRepo.findOne({ where: { id } });
    if (!current) {
      throw new NotFoundException('쿠폰 규칙을 찾을 수 없습니다.');
    }

    const isStandaloneDeactivate =
      dto.active === false &&
      dto.trigger === undefined &&
      dto.couponTemplateId === undefined &&
      dto.conditionsJson === undefined;
    if (isStandaloneDeactivate) {
      current.active = false;
      const saved = await this.couponRuleRepo.save(current);
      this.logger.log(`CouponRule updated: id=${saved.id}`);
      return this.findOne(Number(saved.id));
    }

    const nextTrigger = dto.trigger ?? current.trigger;
    this.assertTriggerSupported(nextTrigger);
    if (dto.couponTemplateId !== undefined) {
      await this.assertCouponTemplateExists(dto.couponTemplateId);
    }

    const requestedConditions = dto.conditionsJson !== undefined
      ? dto.conditionsJson
      : dto.trigger !== undefined
        ? null
        : current.conditionsJson;
    const nextConditions = await this.normalizeConditions(nextTrigger, requestedConditions);

    if (dto.trigger !== undefined) current.trigger = dto.trigger;
    if (dto.couponTemplateId !== undefined) current.couponTemplateId = dto.couponTemplateId;
    if (dto.conditionsJson !== undefined || dto.trigger !== undefined) current.conditionsJson = nextConditions;
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
        this.logger.debug(
          `[${trigger}] Skipped couponTemplateId=${result.couponId} for userId=${userId}: ${result.reason ?? 'unknown error'}`,
        );
      }
    }
  }
}
