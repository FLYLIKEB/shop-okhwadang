import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CouponRulesService } from '../coupon-rules.service';
import { CouponRule, CouponRuleTrigger } from '../entities/coupon-rule.entity';
import { CouponsService } from '../coupons.service';
import { MembershipEventEmitter } from '../../membership/membership-event.emitter';
import { AuthEventEmitter } from '../../auth/auth-event.emitter';
import { OrderEventEmitter } from '../../orders/order-event.emitter';
import { User } from '../../users/entities/user.entity';

const makeCouponRule = (overrides: Partial<CouponRule> = {}): CouponRule =>
  Object.assign(new CouponRule(), {
    id: 1,
    trigger: CouponRuleTrigger.SIGNUP,
    couponTemplateId: 10,
    conditionsJson: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('CouponRulesService', () => {
  let service: CouponRulesService;

  const mockCouponRuleRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCouponsService = {
    issueCoupon: jest.fn(),
  };

  const mockMembershipEvents = {
    onTierUpgraded: jest.fn(),
  };

  const mockAuthEvents = {
    onUserRegistered: jest.fn(),
  };

  const mockOrderEvents = {
    onOrderCompleted: jest.fn(),
  };

  const mockDataSource = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponRulesService,
        { provide: getRepositoryToken(CouponRule), useValue: mockCouponRuleRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: MembershipEventEmitter, useValue: mockMembershipEvents },
        { provide: AuthEventEmitter, useValue: mockAuthEvents },
        { provide: OrderEventEmitter, useValue: mockOrderEvents },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CouponRulesService>(CouponRulesService);
  });

  describe('onModuleInit', () => {
    it('registers handlers for all 3 event emitters', () => {
      service.onModuleInit();
      expect(mockAuthEvents.onUserRegistered).toHaveBeenCalledTimes(1);
      expect(mockOrderEvents.onOrderCompleted).toHaveBeenCalledTimes(1);
      expect(mockMembershipEvents.onTierUpgraded).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('returns all rules ordered by createdAt DESC', async () => {
      const rules = [makeCouponRule()];
      mockCouponRuleRepo.find.mockResolvedValue(rules);

      const result = await service.findAll();
      expect(result).toEqual(rules);
      expect(mockCouponRuleRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });

  describe('findOne', () => {
    it('returns rule if found', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);

      const result = await service.findOne(1);
      expect(result).toEqual(rule);
    });

    it('throws NotFoundException if not found', async () => {
      mockCouponRuleRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and saves a coupon rule', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.create.mockReturnValue(rule);
      mockCouponRuleRepo.save.mockResolvedValue(rule);

      const result = await service.create({
        trigger: CouponRuleTrigger.SIGNUP,
        couponTemplateId: 10,
      });
      expect(result).toEqual(rule);
      expect(mockCouponRuleRepo.create).toHaveBeenCalled();
      expect(mockCouponRuleRepo.save).toHaveBeenCalledWith(rule);
    });

    it('defaults active to true when not provided', async () => {
      const rule = makeCouponRule({ active: true });
      mockCouponRuleRepo.create.mockReturnValue(rule);
      mockCouponRuleRepo.save.mockResolvedValue(rule);

      await service.create({ trigger: CouponRuleTrigger.FIRST_PURCHASE, couponTemplateId: 5 });

      expect(mockCouponRuleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ active: true }),
      );
    });
  });

  describe('update', () => {
    it('updates rule fields', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);
      mockCouponRuleRepo.save.mockResolvedValue({ ...rule, active: false });

      const result = await service.update(1, { active: false });
      expect(result.active).toBe(false);
      expect(mockCouponRuleRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when rule does not exist', async () => {
      mockCouponRuleRepo.findOne.mockResolvedValue(null);
      await expect(service.update(999, { active: false })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes rule and returns success message', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);
      mockCouponRuleRepo.remove.mockResolvedValue(undefined);

      const result = await service.remove(1);
      expect(result).toEqual({ message: '삭제되었습니다.' });
      expect(mockCouponRuleRepo.remove).toHaveBeenCalledWith(rule);
    });

    it('throws NotFoundException when rule does not exist', async () => {
      mockCouponRuleRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('applyRulesForUser', () => {
    it('issues coupons for all matching active rules', async () => {
      const rules = [makeCouponRule({ couponTemplateId: 10 }), makeCouponRule({ id: 2, couponTemplateId: 20 })];
      mockCouponRuleRepo.find.mockResolvedValue(rules);
      mockCouponsService.issueCoupon.mockResolvedValue({});

      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42);

      expect(mockCouponsService.issueCoupon).toHaveBeenCalledTimes(2);
      expect(mockCouponsService.issueCoupon).toHaveBeenCalledWith({ userId: 42, couponId: 10 });
      expect(mockCouponsService.issueCoupon).toHaveBeenCalledWith({ userId: 42, couponId: 20 });
    });

    it('skips duplicate coupon issue errors silently', async () => {
      const rules = [makeCouponRule()];
      mockCouponRuleRepo.find.mockResolvedValue(rules);
      mockCouponsService.issueCoupon.mockRejectedValue(new Error('이미 발급된 쿠폰입니다.'));

      await expect(service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42)).resolves.not.toThrow();
    });

    it('does nothing if no active rules', async () => {
      mockCouponRuleRepo.find.mockResolvedValue([]);
      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42);
      expect(mockCouponsService.issueCoupon).not.toHaveBeenCalled();
    });
  });

  describe('matchesConditions (via applyRulesForUser)', () => {
    it('tier_up rule with minTier condition matches when newTier >= minTier', async () => {
      const rule = makeCouponRule({
        trigger: CouponRuleTrigger.TIER_UP,
        conditionsJson: { minTier: 'Silver' },
      });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);
      mockCouponsService.issueCoupon.mockResolvedValue({});

      await service.applyRulesForUser(CouponRuleTrigger.TIER_UP, 1, { newTier: 'Gold' });

      expect(mockCouponsService.issueCoupon).toHaveBeenCalled();
    });

    it('tier_up rule with minTier condition skips when newTier < minTier', async () => {
      const rule = makeCouponRule({
        trigger: CouponRuleTrigger.TIER_UP,
        conditionsJson: { minTier: 'Gold' },
      });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);

      await service.applyRulesForUser(CouponRuleTrigger.TIER_UP, 1, { newTier: 'Silver' });

      expect(mockCouponsService.issueCoupon).not.toHaveBeenCalled();
    });

    it('rule with null conditionsJson always matches', async () => {
      const rule = makeCouponRule({ conditionsJson: null });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);
      mockCouponsService.issueCoupon.mockResolvedValue({});

      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 1);

      expect(mockCouponsService.issueCoupon).toHaveBeenCalled();
    });
  });
});
