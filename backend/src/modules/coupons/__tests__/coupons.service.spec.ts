import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from '../coupons.service';
import { Coupon } from '../entities/coupon.entity';
import { UserCoupon } from '../entities/user-coupon.entity';
import { PointHistory } from '../entities/point-history.entity';
import { DataSource } from 'typeorm';
import { PointsService } from '../../points/points.service';

describe('CouponsService', () => {
  let service: CouponsService;

  const now = new Date();
  const future = new Date(now.getTime() + 86400000 * 30);
  const past = new Date(now.getTime() - 86400000);

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
    create: jest.fn(),
    save: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: mockCouponRepo },
        { provide: getRepositoryToken(UserCoupon), useValue: mockUserCouponRepo },
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
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

    it('fixed 쿠폰: 할인액 = min(value, 주문액)', () => {
      const discount = service.computeCouponDiscount(20000, mockFixedCoupon);
      expect(discount).toBe(3000);
    });

    it('fixed 쿠폰: 주문액이 할인액보다 적으면 주문액만큼만', () => {
      const discount = service.computeCouponDiscount(2000, mockFixedCoupon);
      expect(discount).toBe(2000);
    });
  });

  describe('calculate', () => {
    it('만료된 쿠폰 → BadRequestException', async () => {
      const expiredCoupon = { ...mockPercentageCoupon, expiresAt: past };
      const uc = mockUserCoupon(expiredCoupon as Coupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { orderAmount: 20000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('최소 주문금액 미충족 → BadRequestException', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon);
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { orderAmount: 5000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('이미 사용된 쿠폰 → BadRequestException', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon, 'used');
      mockUserCouponRepo.findOne.mockResolvedValue(uc);

      await expect(
        service.calculate(10, { orderAmount: 20000, userCouponId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('적립금 잔액 부족 → BadRequestException', async () => {
      mockUserCouponRepo.findOne.mockResolvedValue(null);
      mockPointsService.getUserPointBalance.mockResolvedValue(1000);

      await expect(
        service.calculate(10, { orderAmount: 20000, pointsToUse: 5000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('쿠폰 없이 계산 성공', async () => {
      mockPointsService.getUserPointBalance.mockResolvedValue(0);

      const result = await service.calculate(10, { orderAmount: 50000 });
      expect(result.originalAmount).toBe(50000);
      expect(result.couponDiscount).toBe(0);
      expect(result.pointsDiscount).toBe(0);
      expect(result.shippingFee).toBe(0);
      expect(result.totalPayable).toBe(50000);
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
        expect.objectContaining({ where: { userId: 10, status: 'used' } }),
      );
    });
  });

  describe('getPoints', () => {
    it('적립금 잔액 조회', async () => {
      mockPointsService.getUserPointBalance.mockResolvedValue(5000);
      mockPointHistoryRepo.find.mockResolvedValue([
        { id: 1, type: 'earn', amount: 5000, balance: 5000, description: '주문 적립', createdAt: now },
      ]);

      const result = await service.getPoints(10);
      expect(result.balance).toBe(5000);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].type).toBe('earn');
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
    ) => ({
      findOne: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Coupon) return Promise.resolve(couponRow);
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

    it('totalQuantity null 쿠폰은 수량 제한 없이 발급 성공', async () => {
      const coupon = { ...mockFixedCoupon, issuedCount: 9999 } as Coupon;
      const manager = buildManager(coupon);
      mockDataSource.transaction.mockImplementation((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

      const result = await service.issueCoupon({ userId: 10, couponId: 2 });
      expect(result).toBeDefined();
      expect(manager.increment).toHaveBeenCalled();
    });
  });
});
