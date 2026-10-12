import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CouponsService } from '../coupons.service';
import { Coupon } from '../entities/coupon.entity';
import { UserCoupon } from '../entities/user-coupon.entity';
import { PointHistory } from '../entities/point-history.entity';
import { CalculateDiscountDto } from '../dto/calculate-discount.dto';
import { DataSource } from 'typeorm';
import { PointsService } from '../../points/points.service';
import { ShippingFeeCalculatorService } from '../../shipping/services/shipping-fee-calculator.service';
import { Product, ProductStatus } from '../../products/entities/product.entity';
import { User } from '../../users/entities/user.entity';

describe('CouponsService', () => {
  let service: CouponsService;

  const now = new Date();
  const future = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  const past = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  const mockPercentageCoupon: Coupon = {
    id: 1,
    code: 'PERCENT10',
    name: '10% 할인 쿠폰',
    type: 'percentage',
    value: 10,
    minOrderAmount: 10000,
    maxDiscount: 5000,
    totalQuantity: 100,
    issuedCount: 0,
    startsAt: now,
    expiresAt: future,
    isActive: true,
    createdAt: now,
  } as Coupon;

  const mockFixedCoupon: Coupon = {
    id: 2,
    code: 'FIXED3000',
    name: '3000원 할인 쿠폰',
    type: 'fixed',
    value: 3000,
    minOrderAmount: 5000,
    maxDiscount: null,
    totalQuantity: null,
    issuedCount: 0,
    startsAt: now,
    expiresAt: future,
    isActive: true,
    createdAt: now,
  } as Coupon;

  const mockUserCoupon = (coupon: Coupon, status: 'available' | 'used' | 'expired' = 'available'): UserCoupon => ({
    id: 1,
    userId: 10,
    couponId: coupon.id,
    status,
    usedAt: null,
    orderId: null,
    issuedAt: now,
    coupon,
    user: {} as never,
  });

  const mockCouponRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserCouponRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPointHistoryRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn(),
  };

  const mockPointsService = {
    getUserPointBalance: jest.fn(),
    toHistoryResponse: jest.fn((entry: PointHistory) => ({
      id: Number(entry.id),
      userId: Number(entry.userId),
      type: entry.type,
      amount: Number(entry.amount),
      balance: Number(entry.balance),
      description: entry.description,
      createdAt: entry.createdAt,
      sourceKind: entry.orderId != null ? 'order_use' : 'manual_grant',
    })),
  };

  const mockShippingFeeCalculator = {
    calculate: jest.fn().mockResolvedValue({ shippingFee: 0, threshold: 50000 }),
  };

  const mockProductRepo = {
    find: jest.fn().mockResolvedValue([{ id: 10, status: ProductStatus.ACTIVE, isFreeShipping: false }]),
  };

  const shippingInput = { zipcode: '04524', items: [{ productId: 10, productOptionId: null, quantity: 1 }] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: mockCouponRepo },
        { provide: getRepositoryToken(UserCoupon), useValue: mockUserCouponRepo },
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PointsService, useValue: mockPointsService },
        { provide: ShippingFeeCalculatorService, useValue: mockShippingFeeCalculator },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
    mockDataSource.transaction.mockImplementation((cb: (manager: {
      findOne: typeof mockCouponRepo.findOne;
      save: jest.Mock;
      remove: jest.Mock;
    }) => Promise<unknown>) =>
      cb({
        findOne: mockCouponRepo.findOne,
        save: jest.fn((_entity: unknown, value: unknown) => mockCouponRepo.save(value)),
        remove: jest.fn((_entity: unknown, value: unknown) => mockCouponRepo.remove(value)),
      }),
    );
  });

  describe('computeCouponDiscount', () => {
    it('percentage 쿠폰: 할인액 = min(주문액 × rate, max_discount)', () => {
      const discount = service.computeCouponDiscount(100000, mockPercentageCoupon);
      expect(discount).toBe(5000);
    });

    it('percentage 쿠폰: max_discount 미만 시 rate 적용', () => {
      const discount = service.computeCouponDiscount(30000, mockPercentageCoupon);
      expect(discount).toBe(3000);
    });

    it('percentage 쿠폰은 max_discount 0이면 의도적으로 0원을 할인한다', () => {
      const discount = service.computeCouponDiscount(30000, { ...mockPercentageCoupon, maxDiscount: 0 } as Coupon);
      expect(discount).toBe(0);
    });

    it('percentage 쿠폰은 max_discount가 없어도 주문액을 초과해 할인하지 않는다', () => {
      const coupon = { ...mockPercentageCoupon, value: 150, maxDiscount: null } as Coupon;
      const discount = service.computeCouponDiscount(30000, coupon);
      expect(discount).toBe(30000);
    });

    it('fixed 쿠폰: 할인액 = min(value, 주문액)', () => {
      const discount = service.computeCouponDiscount(20000, mockFixedCoupon);
      expect(discount).toBe(3000);
    });

    it('fixed 쿠폰: 주문액이 할인액보다 적으면 주문액만큼만', () => {
      const discount = service.computeCouponDiscount(2000, mockFixedCoupon);
      expect(discount).toBe(2000);
    });

    it('bad persisted coupon data cannot produce a negative discount', () => {
      const discount = service.computeCouponDiscount(20000, { ...mockFixedCoupon, value: -3000 } as Coupon);
      expect(discount).toBe(0);
    });
  });

  describe('admin coupon contract', () => {
    it('returns paginated admin coupon list', async () => {
      mockCouponRepo.findAndCount.mockResolvedValue([[mockPercentageCoupon, mockFixedCoupon], 2]);

      await expect(service.findAdminCoupons({ page: 2, limit: 1 })).resolves.toEqual({
        items: [
          expect.objectContaining({ id: 1, value: 10, issuedCount: 0 }),
          expect.objectContaining({ id: 2, value: 3000, totalQuantity: null }),
        ],
        total: 2,
        page: 2,
        limit: 1,
      });
      expect(mockCouponRepo.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
        order: { createdAt: 'DESC', id: 'DESC' },
        skip: 1,
        take: 1,
      }));
    });

    it('passes search and status filters through the admin coupon query', async () => {
      mockCouponRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAdminCoupons({ page: 1, limit: 20, q: 'WELCOME', status: 'active' });

      const options = mockCouponRepo.findAndCount.mock.calls.at(-1)?.[0] as {
        where?: Array<{ isActive?: boolean; code?: { value: string }; name?: { value: string } }>;
      };
      expect(options.where).toHaveLength(2);
      expect(options.where?.[0]).toMatchObject({ isActive: true });
      expect(options.where?.[1]).toMatchObject({ isActive: true });
      expect(String(options.where?.[0]?.code?.value)).toBe('%WELCOME%');
      expect(String(options.where?.[1]?.name?.value)).toBe('%WELCOME%');
    });

    it('loads admin coupon detail', async () => {
      mockCouponRepo.findOne.mockResolvedValue(mockPercentageCoupon);

      await expect(service.findAdminCoupon(1)).resolves.toEqual(expect.objectContaining({ id: 1, code: 'PERCENT10' }));
    });
  });

  describe('coupon mutability after issuance', () => {
    it('rejects pricing/lifecycle updates once issuedCount > 0', async () => {
      mockCouponRepo.findOne.mockResolvedValue({ ...mockPercentageCoupon, issuedCount: 3 });

      await expect(service.updateCoupon(1, { value: 15 })).rejects.toThrow(BadRequestException);
      expect(mockCouponRepo.save).not.toHaveBeenCalled();
    });

    it('allows totalQuantity changes only when staying >= issuedCount', async () => {
      mockCouponRepo.findOne.mockResolvedValue({ ...mockPercentageCoupon, issuedCount: 3, totalQuantity: 10 });
      mockCouponRepo.save.mockImplementation(async (coupon: Coupon) => coupon);

      await expect(service.updateCoupon(1, { totalQuantity: 3 })).resolves.toEqual(
        expect.objectContaining({ totalQuantity: 3, issuedCount: 3 }),
      );
    });

    it('rejects totalQuantity below issuedCount', async () => {
      mockCouponRepo.findOne.mockResolvedValue({ ...mockPercentageCoupon, issuedCount: 3, totalQuantity: 10 });

      await expect(service.updateCoupon(1, { totalQuantity: 2 })).rejects.toThrow(BadRequestException);
    });

    it('blocks deleting issued coupons to avoid cascading user coupon loss', async () => {
      mockCouponRepo.findOne.mockResolvedValue({ ...mockPercentageCoupon, issuedCount: 1 });

      await expect(service.removeCoupon(1)).rejects.toThrow(BadRequestException);
      expect(mockCouponRepo.remove).not.toHaveBeenCalled();
    });

    it('allows mutable fields when issuance has not started', async () => {
      mockCouponRepo.findOne.mockResolvedValue({ ...mockPercentageCoupon, issuedCount: 0 });
      mockCouponRepo.save.mockImplementation(async (coupon: Coupon) => coupon);

      await expect(service.updateCoupon(1, { value: 15, isActive: false })).resolves.toEqual(
        expect.objectContaining({ value: 15, isActive: false }),
      );
    });

    it('updates coupons under a pessimistic lock so issuedCount cannot be overwritten by a concurrent issue', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 0 };
      const manager = {
        findOne: jest.fn().mockResolvedValue(coupon),
        save: jest.fn(async (_entity: unknown, value: Coupon) => value),
      };
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await service.updateCoupon(1, { name: '잠금 수정' });

      expect(manager.findOne).toHaveBeenCalledWith(Coupon, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('deletes unissued coupons under the same pessimistic lock used by issuance', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 0 };
      const manager = {
        findOne: jest.fn().mockResolvedValue(coupon),
        remove: jest.fn().mockResolvedValue(coupon),
      };
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.removeCoupon(1)).resolves.toEqual({ message: '쿠폰이 삭제되었습니다.' });

      expect(manager.findOne).toHaveBeenCalledWith(Coupon, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(manager.remove).toHaveBeenCalledWith(Coupon, coupon);
    });
  });

  describe('calculate', () => {
    it('만료된 쿠폰 → BadRequestException', async () => {
      const expiredCoupon = { ...mockPercentageCoupon, expiresAt: past };
      const uc = mockUserCoupon(expiredCoupon as Coupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { ...shippingInput, orderAmount: 20000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('최소 주문금액 미충족 → BadRequestException', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { ...shippingInput, orderAmount: 5000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 사용된 쿠폰 → BadRequestException', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon, 'used');
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { ...shippingInput, orderAmount: 20000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('적립금 잔액 부족 → BadRequestException', async () => {
      mockUserCouponRepo.findOne.mockResolvedValue(null);
      mockPointsService.getUserPointBalance.mockResolvedValue(1000);

      await expect(
        service.calculate(10, { ...shippingInput, orderAmount: 20000, pointsToUse: 5000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects negative points at the service boundary', async () => {
      await expect(
        service.calculate(10, { ...shippingInput, orderAmount: 20000, pointsToUse: -1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('쿠폰 없이 계산 성공', async () => {
      mockPointsService.getUserPointBalance.mockResolvedValue(0);

      const result = await service.calculate(10, { ...shippingInput, orderAmount: 50000 });
      expect(result.originalAmount).toBe(50000);
      expect(result.couponDiscount).toBe(0);
      expect(result.pointsDiscount).toBe(0);
      expect(result.shippingFee).toBe(0);
      expect(result.totalPayable).toBe(50000);
    });

    it('uses the authoritative shipping quote with the pre-discount subtotal and item policies', async () => {
      const uc = mockUserCoupon(mockFixedCoupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);
      mockShippingFeeCalculator.calculate.mockResolvedValue({ shippingFee: 7000, threshold: 50000 });

      const result = await service.calculate(10, {
        ...shippingInput,
        orderAmount: 40000,
        items: [{ productId: 10, productOptionId: null, quantity: 1 }],
        userCouponId: 2,
      });

      expect(mockShippingFeeCalculator.calculate).toHaveBeenCalledWith(
        40000,
        '04524',
        [{ isFreeShipping: false }],
      );
      expect(result.finalAmount).toBe(37000);
      expect(result.shippingFee).toBe(7000);
      expect(result.totalPayable).toBe(44000);
    });
  });

  describe('정책 고정 — 쿠폰·포인트 동시 사용', () => {
    it('CalculateDiscountDto 는 단일 userCouponId 만 받는다 (다중 쿠폰 적용 불가 — 구조적 제약)', () => {
      const dto: CalculateDiscountDto = { ...shippingInput, orderAmount: 10000, userCouponId: 1, pointsToUse: 0 };
      expect(typeof dto.userCouponId).toBe('number');
    });

    it('쿠폰 + 포인트 동시 사용: 쿠폰 먼저 적용 후 포인트 차감 (할인 순서 고정)', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);
      mockPointsService.getUserPointBalance.mockResolvedValue(2000);

      const result = await service.calculate(10, {
        ...shippingInput,
        orderAmount: 50000,
        userCouponId: 1,
        pointsToUse: 2000,
      });

      expect(result.originalAmount).toBe(50000);
      expect(result.couponDiscount).toBe(5000);
      expect(result.pointsDiscount).toBe(2000);
      expect(result.finalAmount).toBe(43000);
      expect(result.couponDiscount + result.pointsDiscount).toBe(7000);
    });

    it('쿠폰 적용 후 남은 금액보다 큰 포인트는 남은 금액까지만 차감된다', async () => {
      const uc = mockUserCoupon(mockFixedCoupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);
      mockPointsService.getUserPointBalance.mockResolvedValue(50000);

      const result = await service.calculate(10, {
        ...shippingInput,
        orderAmount: 10000,
        userCouponId: 2,
        pointsToUse: 10000,
      });

      expect(result.couponDiscount).toBe(3000);
      expect(result.pointsDiscount).toBe(7000);
      expect(result.finalAmount).toBe(0);
    });

    it('포인트만 사용하는 경우 쿠폰 할인은 0', async () => {
      mockUserCouponRepo.findOne.mockResolvedValue(null);
      mockPointsService.getUserPointBalance.mockResolvedValue(5000);

      const result = await service.calculate(10, {
        ...shippingInput,
        orderAmount: 10000,
        pointsToUse: 3000,
      });

      expect(result.couponDiscount).toBe(0);
      expect(result.pointsDiscount).toBe(3000);
      expect(result.finalAmount).toBe(7000);
    });
  });

  describe('findAll', () => {
    it('보유 쿠폰 목록 조회', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon);
      mockUserCouponRepo.find.mockResolvedValue([uc]);
      mockPointsService.getUserPointBalance.mockResolvedValue(3000);

      const result = await service.findAll(10);
      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0].code).toBe('PERCENT10');
      expect(result.points.balance).toBe(3000);
    });

    it('status 필터 적용', async () => {
      mockUserCouponRepo.find.mockResolvedValue([]);
      mockPointsService.getUserPointBalance.mockResolvedValue(0);

      const result = await service.findAll(10, 'used');
      expect(result.coupons).toHaveLength(0);
      expect(mockUserCouponRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10 } }),
      );
    });

    it('available 목록은 실제 사용 가능한 쿠폰만 포함하고 future/inactive 는 expired 로 분류하지 않는다', async () => {
      const expiredAvailable = mockUserCoupon({ ...mockPercentageCoupon, expiresAt: past } as Coupon);
      const inactiveAvailable = mockUserCoupon({ ...mockFixedCoupon, isActive: false } as Coupon);
      const futureAvailable = mockUserCoupon({ ...mockFixedCoupon, id: 3, startsAt: future, expiresAt: new Date(future.getTime() + 86400000) } as Coupon);
      mockUserCouponRepo.find.mockResolvedValue([expiredAvailable, inactiveAvailable, futureAvailable]);
      mockPointsService.getUserPointBalance.mockResolvedValue(0);

      await expect(service.findAll(10, 'available')).resolves.toMatchObject({ coupons: [] });

      const expiredResult = await service.findAll(10, 'expired');
      expect(expiredResult.coupons).toHaveLength(1);
      expect(expiredResult.coupons.every((coupon) => coupon.status === 'expired')).toBe(true);

      const allResult = await service.findAll(10);
      expect(allResult.coupons).toEqual(expect.arrayContaining([
        expect.objectContaining({ status: 'available', availabilityReason: 'inactive' }),
        expect.objectContaining({ status: 'available', availabilityReason: 'not_started' }),
        expect.objectContaining({ status: 'expired', availabilityReason: null }),
      ]));
    });

    it('used status is preserved even when the template later expires', async () => {
      const usedExpired = mockUserCoupon({ ...mockPercentageCoupon, expiresAt: past } as Coupon, 'used');
      mockUserCouponRepo.find.mockResolvedValue([usedExpired]);
      mockPointsService.getUserPointBalance.mockResolvedValue(0);

      const result = await service.findAll(10, 'used');

      expect(result.coupons).toEqual([
        expect.objectContaining({ status: 'used', availabilityReason: null }),
      ]);
    });
  });

  describe('getPoints', () => {
    it('적립금 잔액 조회 with sourceKind mapping', async () => {
      mockPointsService.getUserPointBalance.mockResolvedValue(5000);
      mockPointHistoryRepo.find.mockResolvedValue([
        { id: 1, userId: 10, type: 'spend', amount: -1000, balance: 5000, description: '주문 사용', createdAt: now, orderId: 55 },
      ]);

      const result = await service.getPoints(10);
      expect(result.balance).toBe(5000);
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toMatchObject({ type: 'spend', sourceKind: 'order_use' });
      expect(mockPointsService.toHistoryResponse).toHaveBeenCalled();
    });

    it('적립금 내역 없으면 잔액 0', async () => {
      mockPointsService.getUserPointBalance.mockResolvedValue(0);
      mockPointHistoryRepo.find.mockResolvedValue([]);

      const result = await service.getPoints(10);
      expect(result.balance).toBe(0);
      expect(result.history).toHaveLength(0);
    });
  });

  describe('issueCoupon', () => {
    const buildManager = (
      couponRow: Coupon | null,
      existingUserCoupon: UserCoupon | null = null,
      userRow: Partial<User> | null = { id: 10, isActive: true },
    ) => ({
      findOne: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Coupon) return Promise.resolve(couponRow);
        if (entity === User) return Promise.resolve(userRow);
        if (entity === UserCoupon) return Promise.resolve(existingUserCoupon);
        return Promise.resolve(null);
      }),
      create: jest.fn().mockReturnValue({ id: 99, userId: 10, couponId: 1, status: 'available' }),
      save: jest.fn().mockImplementation((_, v) => Promise.resolve(v)),
      increment: jest.fn().mockResolvedValue(undefined),
    });

    it('쿠폰 발급 성공 — UserCoupon 반환 및 issuedCount 증가', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 0, totalQuantity: 10 } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      const dto = { userId: 10, couponId: 1 };
      const result = await service.issueCoupon(dto);

      expect(result).toBeDefined();
      expect(manager.increment).toHaveBeenCalledWith(Coupon, { id: 1 }, 'issuedCount', 1);
    });

    it('트랜잭션 내부에서 Coupon을 pessimistic_write 락으로 조회한다 (TOCTOU 방어)', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 0, totalQuantity: 10 } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await service.issueCoupon({ userId: 10, couponId: 1 });

      const firstCall = manager.findOne.mock.calls[0];
      expect(firstCall[0]).toBe(Coupon);
      expect(firstCall[1]).toMatchObject({ lock: { mode: 'pessimistic_write' } });
    });

    it('존재하지 않는 쿠폰 → NotFoundException', async () => {
      const manager = buildManager(null);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 999 })).rejects.toThrow(NotFoundException);
    });

    it('비활성 회원에게는 쿠폰을 발급하지 않는다', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 0, totalQuantity: 10 } as Coupon;
      const manager = buildManager(coupon, null, null);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 1 })).rejects.toThrow(NotFoundException);
      expect(manager.save).not.toHaveBeenCalled();
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('비활성화된 쿠폰 → BadRequestException', async () => {
      const coupon = { ...mockPercentageCoupon, isActive: false } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 1 })).rejects.toThrow(BadRequestException);
    });

    it('수량 한도 초과 쿠폰 → BadRequestException (트랜잭션 내부 체크)', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 10, totalQuantity: 10 } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 1 })).rejects.toThrow(BadRequestException);
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('TOCTOU 시뮬레이션: 락 시점의 issuedCount가 한도와 같으면 두 번째 요청은 거부된다', async () => {
      const couponAtLimit = { ...mockPercentageCoupon, issuedCount: 10, totalQuantity: 10 } as Coupon;
      const manager = buildManager(couponAtLimit);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 11, couponId: 1 })).rejects.toThrow(BadRequestException);
    });

    it('이미 발급된 쿠폰 → BadRequestException (트랜잭션 내부 중복 체크)', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 1 } as Coupon;
      const existingUc = { id: 5, userId: 10, couponId: 1, status: 'available' } as UserCoupon;
      const manager = buildManager(coupon, existingUc);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 1 })).rejects.toThrow(BadRequestException);
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('DB duplicate grants are treated as the same expected duplicate issue failure', async () => {
      const coupon = { ...mockPercentageCoupon, issuedCount: 1 } as Coupon;
      const manager = buildManager(coupon);
      manager.save.mockRejectedValue(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }));
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      await expect(service.issueCoupon({ userId: 10, couponId: 1 })).rejects.toThrow(BadRequestException);
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('totalQuantity null 쿠폰은 수량 제한 없이 발급 성공', async () => {
      const coupon = { ...mockFixedCoupon, issuedCount: 9999 } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      const result = await service.issueCoupon({ userId: 10, couponId: 2 });
      expect(result).toBeDefined();
      expect(manager.increment).toHaveBeenCalled();
    });
  });

  describe('issueCouponsForUser', () => {
    it('returns per-coupon failures for expected domain errors', async () => {
      mockDataSource.transaction
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new BadRequestException('이미 발급된 쿠폰입니다.'))
        .mockRejectedValueOnce(new NotFoundException('쿠폰을 찾을 수 없습니다.'));

      await expect(service.issueCouponsForUser(10, [1, 2, 3])).resolves.toEqual([
        { couponId: 1, issued: true },
        { couponId: 2, issued: false, reason: '이미 발급된 쿠폰입니다.' },
        { couponId: 3, issued: false, reason: '쿠폰을 찾을 수 없습니다.' },
      ]);
    });

    it('propagates unexpected infrastructure errors so callers can retry', async () => {
      const dbError = new Error('database down');
      mockDataSource.transaction.mockRejectedValue(dbError);

      await expect(service.issueCouponsForUser(10, [1])).rejects.toThrow(dbError);
    });
  });

  describe('coupon template validation', () => {
    it('trims code/name and stores nullable limits explicitly on create', async () => {
      mockCouponRepo.create.mockImplementation((coupon: Coupon) => coupon);
      mockCouponRepo.save.mockImplementation(async (coupon: Coupon) => ({ ...coupon, id: 10, issuedCount: 0, createdAt: now }));

      const result = await service.createCoupon({
        code: ' TRIM10 ',
        name: ' 이름 ',
        type: 'fixed',
        value: 1000,
        maxDiscount: null,
        totalQuantity: null,
        startsAt: now.toISOString(),
        expiresAt: future.toISOString(),
      });

      expect(result).toEqual(expect.objectContaining({
        code: 'TRIM10',
        name: '이름',
        maxDiscount: null,
        totalQuantity: null,
      }));
    });

    it('turns duplicate coupon codes into ConflictException', async () => {
      mockCouponRepo.create.mockImplementation((coupon: Coupon) => coupon);
      mockCouponRepo.save.mockRejectedValue(Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' }));

      await expect(service.createCoupon({
        code: 'DUP',
        name: '중복',
        type: 'fixed',
        value: 1000,
        startsAt: now.toISOString(),
        expiresAt: future.toISOString(),
      })).rejects.toThrow(ConflictException);
    });

    it('rejects direct service calls with null nonnullable fields', async () => {
      await expect(service.updateCoupon(1, { value: null } as never)).rejects.toThrow(BadRequestException);
      expect(mockCouponRepo.findOne).not.toHaveBeenCalled();
    });

    it('rejects non-finite and out-of-range money values at the service boundary', async () => {
      await expect(service.createCoupon({
        code: 'NAN',
        name: '잘못된 금액',
        type: 'fixed',
        value: Number.NaN,
        startsAt: now.toISOString(),
        expiresAt: future.toISOString(),
      })).rejects.toThrow(BadRequestException);

      await expect(service.createCoupon({
        code: 'TOO_BIG',
        name: '큰 금액',
        type: 'fixed',
        value: 10000000000,
        startsAt: now.toISOString(),
        expiresAt: future.toISOString(),
      })).rejects.toThrow(BadRequestException);
    });

    it('rejects coupon periods where expiresAt is not later than startsAt', async () => {
      await expect(service.createCoupon({
        code: 'BADPERIOD',
        name: '잘못된 기간',
        type: 'fixed',
        value: 1000,
        startsAt: future.toISOString(),
        expiresAt: now.toISOString(),
      })).rejects.toThrow(BadRequestException);
    });

    it('rejects percentage coupon rates over 100 percent', async () => {
      await expect(service.createCoupon({
        code: 'BADRATE',
        name: '잘못된 할인율',
        type: 'percentage',
        value: 101,
        startsAt: now.toISOString(),
        expiresAt: future.toISOString(),
      })).rejects.toThrow(BadRequestException);
    });
  });
});
