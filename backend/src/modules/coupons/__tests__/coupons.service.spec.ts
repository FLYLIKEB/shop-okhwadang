import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CouponsService } from '../coupons.service';
import { Coupon } from '../entities/coupon.entity';
import { UserCoupon } from '../entities/user-coupon.entity';
import { PointHistory } from '../entities/point-history.entity';
import { DataSource } from 'typeorm';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getRepositoryToken(Coupon), useValue: mockCouponRepo },
        { provide: getRepositoryToken(UserCoupon), useValue: mockUserCouponRepo },
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
    jest.clearAllMocks();
  });

  describe('computeCouponDiscount', () => {
    it('percentage 쿠폰: 할인액 = min(주문액 × rate, max_discount)', () => {
      // 100000원 * 10% = 10000원, max_discount=5000 → 5000원
      const discount = service.computeCouponDiscount(100000, mockPercentageCoupon);
      expect(discount).toBe(5000);
    });

    it('percentage 쿠폰: max_discount 미만 시 rate 적용', () => {
      // 30000원 * 10% = 3000원, max_discount=5000 → 3000원
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
      const uc = mockUserCoupon(mockPercentageCoupon); // minOrderAmount=10000
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
      mockPointHistoryRepo.findOne.mockResolvedValue({ balance: 1000 });

      await expect(
        service.calculate(10, { orderAmount: 20000, pointsToUse: 5000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('쿠폰 없이 계산 성공', async () => {
      mockPointHistoryRepo.findOne.mockResolvedValue(null);

      const result = await service.calculate(10, { orderAmount: 50000 });
      expect(result.originalAmount).toBe(50000);
      expect(result.couponDiscount).toBe(0);
      expect(result.pointsDiscount).toBe(0);
      expect(result.shippingFee).toBe(0); // 50000 >= 30000
      expect(result.totalPayable).toBe(50000);
    });
  });

  describe('findAll', () => {
    it('보유 쿠폰 목록 조회', async () => {
      const uc = mockUserCoupon(mockPercentageCoupon);
      mockUserCouponRepo.find.mockResolvedValue([uc]);
      mockPointHistoryRepo.findOne.mockResolvedValue({ balance: 3000 });

      const result = await service.findAll(10);
      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0].code).toBe('PERCENT10');
      expect(result.points.balance).toBe(3000);
    });

    it('status 필터 적용', async () => {
      mockUserCouponRepo.find.mockResolvedValue([]);
      mockPointHistoryRepo.findOne.mockResolvedValue(null);

      const result = await service.findAll(10, 'used');
      expect(result.coupons).toHaveLength(0);
      expect(mockUserCouponRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10, status: 'used' } }),
      );
    });
  });

  describe('getPoints', () => {
    it('적립금 잔액 조회', async () => {
      mockPointHistoryRepo.findOne.mockResolvedValue({ balance: 5000 });
      mockPointHistoryRepo.find.mockResolvedValue([
        { id: 1, type: 'earn', amount: 5000, balance: 5000, description: '주문 적립', createdAt: now },
      ]);

      const result = await service.getPoints(10);
      expect(result.balance).toBe(5000);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].type).toBe('earn');
    });

    it('적립금 내역 없으면 잔액 0', async () => {
      mockPointHistoryRepo.findOne.mockResolvedValue(null);
      mockPointHistoryRepo.find.mockResolvedValue([]);

      const result = await service.getPoints(10);
      expect(result.balance).toBe(0);
      expect(result.history).toHaveLength(0);
    });
  });
});
