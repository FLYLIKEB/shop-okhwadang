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
import { SchedulerLockService } from '../../../common/services/scheduler-lock.service';

const makeCouponRule = (overrides: Partial<CouponRule> = {}): CouponRule =>
  Object.assign(new CouponRule(), {
    id: 1,
    trigger: CouponRuleTrigger.SIGNUP,
    couponTemplateId: 10,
    couponTemplate: { id: 10, code: 'WELCOME10', name: '신규가입 10%' } as unknown as CouponRule['couponTemplate'],
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
    findAndCount: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCouponsService = {
    issueCoupon: jest.fn(),
    issueCouponsForUser: jest.fn(),
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

  const mockSchedulerLockService = {
    runWithLock: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSchedulerLockService.runWithLock.mockImplementation(
      async (
        _policy: { lockName: string; ttlMinutes: number },
        task: () => Promise<void>,
      ) => task(),
    );

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
        { provide: SchedulerLockService, useValue: mockSchedulerLockService },
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
    it('returns a paginated rule slice ordered by createdAt DESC with coupon summaries', async () => {
      const rules = [makeCouponRule()];
      mockCouponRuleRepo.findAndCount.mockResolvedValue([rules, 21]);

      const result = await service.findAll({ page: 2, limit: 20 });
      expect(result).toEqual({
        items: [
          expect.objectContaining({
            id: 1,
            couponTemplateId: 10,
            couponTemplate: expect.objectContaining({ id: 10, code: 'WELCOME10', name: '신규가입 10%' }),
          }),
        ],
        total: 21,
        page: 2,
        limit: 20,
      });
      expect(mockCouponRuleRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['couponTemplate'],
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 20,
        take: 20,
      });
    });
  });

  describe('findOne', () => {
    it('returns rule if found', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);

      const result = await service.findOne(1);
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        couponTemplateId: 10,
        couponTemplate: expect.objectContaining({ id: 10, code: 'WELCOME10', name: '신규가입 10%' }),
      }));
    });

    it('throws NotFoundException if not found', async () => {
      mockCouponRuleRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
  describe('create', () => {
    it('creates and returns a coupon rule with coupon summary', async () => {
      const rule = makeCouponRule();
      mockCouponRuleRepo.create.mockReturnValue(rule);
      mockCouponRuleRepo.save.mockResolvedValue(rule);
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);

      const result = await service.create({
        trigger: CouponRuleTrigger.SIGNUP,
        couponTemplateId: 10,
      });
      expect(result).toEqual(expect.objectContaining({
        id: 1,
        couponTemplateId: 10,
        couponTemplate: expect.objectContaining({ id: 10, code: 'WELCOME10', name: '신규가입 10%' }),
      }));
      expect(mockCouponRuleRepo.create).toHaveBeenCalled();
      expect(mockCouponRuleRepo.save).toHaveBeenCalledWith(rule);
    });

    it('defaults active to true when not provided', async () => {
      const rule = makeCouponRule({ active: true });
      mockCouponRuleRepo.create.mockReturnValue(rule);
      mockCouponRuleRepo.save.mockResolvedValue(rule);
      mockCouponRuleRepo.findOne.mockResolvedValue(rule);

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
      mockCouponsService.issueCouponsForUser.mockResolvedValue([
        { couponId: 10, issued: true },
        { couponId: 20, issued: true },
      ]);

      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42);

      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(42, [10, 20]);
    });

    it('skips duplicate coupon issue errors silently', async () => {
      const rules = [makeCouponRule()];
      mockCouponRuleRepo.find.mockResolvedValue(rules);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([
        { couponId: 10, issued: false, reason: '이미 발급된 쿠폰입니다.' },
      ]);

      await expect(service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42)).resolves.not.toThrow();
    });

    it('does nothing if no active rules', async () => {
      mockCouponRuleRepo.find.mockResolvedValue([]);
      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 42);
      expect(mockCouponsService.issueCouponsForUser).not.toHaveBeenCalled();
    });
  });

  describe('matchesConditions (via applyRulesForUser)', () => {
    it('tier_up rule with minTier condition matches when newTier >= minTier', async () => {
      const rule = makeCouponRule({
        trigger: CouponRuleTrigger.TIER_UP,
        conditionsJson: { minTier: 'Silver' },
      });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 10, issued: true }]);

      await service.applyRulesForUser(CouponRuleTrigger.TIER_UP, 1, { newTier: 'Gold' });

      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalled();
    });

    it('tier_up rule with minTier condition skips when newTier < minTier', async () => {
      const rule = makeCouponRule({
        trigger: CouponRuleTrigger.TIER_UP,
        conditionsJson: { minTier: 'Gold' },
      });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);

      await service.applyRulesForUser(CouponRuleTrigger.TIER_UP, 1, { newTier: 'Silver' });

      expect(mockCouponsService.issueCouponsForUser).not.toHaveBeenCalled();
    });

    it('rule with null conditionsJson always matches', async () => {
      const rule = makeCouponRule({ conditionsJson: null });
      mockCouponRuleRepo.find.mockResolvedValue([rule]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 10, issued: true }]);

      await service.applyRulesForUser(CouponRuleTrigger.SIGNUP, 1);

      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalled();
    });
  });

  // 정책 고정 (이슈 #726): 자동 발급 트리거 4종 — 회원가입 / 첫 구매 / 생일 / 등급업
  describe('자동 발급 트리거 핸들러', () => {
    type Handler<T> = (event: T) => Promise<void>;

    it('회원가입 이벤트는 SIGNUP 규칙을 적용한다', async () => {
      let signupHandler: Handler<{ userId: number }> | undefined;
      mockAuthEvents.onUserRegistered.mockImplementation((cb: Handler<{ userId: number }>) => {
        signupHandler = cb;
      });
      mockCouponRuleRepo.find.mockResolvedValue([makeCouponRule({ trigger: CouponRuleTrigger.SIGNUP })]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 10, issued: true }]);

      service.onModuleInit();
      expect(signupHandler).toBeDefined();
      await signupHandler!({ userId: 100 });

      expect(mockCouponRuleRepo.find).toHaveBeenCalledWith({
        where: { trigger: CouponRuleTrigger.SIGNUP, active: true },
      });
      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(100, [10]);
    });

    it('첫 구매 이벤트는 member/customerType 가 맞는 경우에만 FIRST_PURCHASE 규칙을 적용한다', async () => {
      let orderHandler:
        | Handler<{ userId: number | null; isFirstPurchase: boolean; customerType: 'member' | 'guest' }>
        | undefined;
      mockOrderEvents.onOrderCompleted.mockImplementation(
        (cb: Handler<{ userId: number | null; isFirstPurchase: boolean; customerType: 'member' | 'guest' }>) => {
          orderHandler = cb;
        },
      );
      mockCouponRuleRepo.find.mockResolvedValue([
        makeCouponRule({ trigger: CouponRuleTrigger.FIRST_PURCHASE, couponTemplateId: 21 }),
      ]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 21, issued: true }]);

      service.onModuleInit();
      expect(orderHandler).toBeDefined();

      await orderHandler!({ userId: 200, isFirstPurchase: false, customerType: 'member' });
      await orderHandler!({ userId: null, isFirstPurchase: true, customerType: 'guest' });
      await orderHandler!({ userId: 200, isFirstPurchase: true, customerType: 'guest' });
      expect(mockCouponsService.issueCouponsForUser).not.toHaveBeenCalled();

      await orderHandler!({ userId: 200, isFirstPurchase: true, customerType: 'member' });
      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(200, [21]);
    });

    it('첫 구매 쿠폰 발급 실패를 outbox caller에게 전파한다', async () => {
      let orderHandler: Handler<{ userId: number; isFirstPurchase: boolean; customerType: 'member' }> | undefined;
      mockOrderEvents.onOrderCompleted.mockImplementation((cb: typeof orderHandler) => {
        orderHandler = cb;
      });
      mockCouponRuleRepo.find.mockResolvedValue([
        makeCouponRule({ trigger: CouponRuleTrigger.FIRST_PURCHASE, couponTemplateId: 21 }),
      ]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([
        { couponId: 21, issued: false, reason: 'database unavailable' },
      ]);

      service.onModuleInit();

      await expect(orderHandler!({ userId: 200, isFirstPurchase: true, customerType: 'member' }))
        .rejects.toThrow('database unavailable');
    });

    it('등급업 이벤트는 newTier 컨텍스트를 전달하며 TIER_UP 규칙을 적용한다', async () => {
      let tierHandler: Handler<{ userId: number; newTier: string }> | undefined;
      mockMembershipEvents.onTierUpgraded.mockImplementation(
        (cb: Handler<{ userId: number; newTier: string }>) => {
          tierHandler = cb;
        },
      );
      mockCouponRuleRepo.find.mockResolvedValue([
        makeCouponRule({ trigger: CouponRuleTrigger.TIER_UP, couponTemplateId: 31 }),
      ]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 31, issued: true }]);

      service.onModuleInit();
      expect(tierHandler).toBeDefined();
      await tierHandler!({ userId: 300, newTier: 'Gold' });

      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(300, [31]);
    });

    it('생일 cron 은 BIRTHDAY 트리거 규칙을 활성 회원에게만 적용한다', async () => {
      const birthdayRule = makeCouponRule({
        trigger: CouponRuleTrigger.BIRTHDAY,
        couponTemplateId: 41,
      });
      mockCouponRuleRepo.find.mockResolvedValue([birthdayRule]);
      mockDataSource.query.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      mockCouponsService.issueCouponsForUser.mockResolvedValue([{ couponId: 41, issued: true }]);

      await service.handleBirthdayCoupons();

      expect(mockSchedulerLockService.runWithLock).toHaveBeenCalledWith(
        expect.objectContaining({ lockName: 'cron:birthday-coupons' }),
        expect.any(Function),
      );
      expect(mockCouponRuleRepo.find).toHaveBeenCalledWith({
        where: { trigger: CouponRuleTrigger.BIRTHDAY, active: true },
      });
      // 활성/미삭제 회원만 조회해야 한다.
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = 1 AND deleted_at IS NULL'),
        expect.arrayContaining([expect.any(Number), expect.any(Number)]),
      );
      // 두 명의 사용자에게 각각 발급되어야 한다.
      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledTimes(2);
      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(1, [41]);
      expect(mockCouponsService.issueCouponsForUser).toHaveBeenCalledWith(2, [41]);
    });

    it('생일 cron 은 활성 BIRTHDAY 규칙이 없으면 사용자 조회를 건너뛴다', async () => {
      mockCouponRuleRepo.find.mockResolvedValue([]);

      await service.handleBirthdayCoupons();

      expect(mockDataSource.query).not.toHaveBeenCalled();
      expect(mockCouponsService.issueCouponsForUser).not.toHaveBeenCalled();
    });
  });
});
