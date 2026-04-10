import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointHistory } from './entities/point-history.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { findOrThrow } from '../../common/utils/repository.util';

export interface CouponResponse {
  id: number;
  couponId: number;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  expiresAt: Date;
  status: 'available' | 'used' | 'expired';
  issuedAt: Date;
  usedAt: Date | null;
}

export interface PointsInfo {
  balance: number;
  willExpireSoon: number;
}

export interface CouponListResponse {
  coupons: CouponResponse[];
  points: PointsInfo;
}

export interface CalculateDiscountResponse {
  originalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  finalAmount: number;
  shippingFee: number;
  totalPayable: number;
}

export interface PointHistoryItem {
  id: number;
  type: 'earn' | 'spend' | 'expire' | 'admin_adjust';
  amount: number;
  balance: number;
  description: string | null;
  createdAt: Date;
}

export interface PointsResponse {
  balance: number;
  history: PointHistoryItem[];
}

const SHIPPING_FEE = 3000;

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
    @InjectRepository(UserCoupon)
    private readonly userCouponRepo: Repository<UserCoupon>,
    @InjectRepository(PointHistory)
    private readonly pointHistoryRepo: Repository<PointHistory>,
    private readonly dataSource: DataSource,
  ) {}

  private async getUserPointBalance(userId: number): Promise<number> {
    const latest = await this.pointHistoryRepo.findOne({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return latest ? latest.balance : 0;
  }

  private toResponse(uc: UserCoupon): CouponResponse {
    return {
      id: Number(uc.id),
      couponId: Number(uc.couponId),
      code: uc.coupon.code,
      name: uc.coupon.name,
      type: uc.coupon.type,
      value: Number(uc.coupon.value),
      minOrderAmount: Number(uc.coupon.minOrderAmount),
      maxDiscount: uc.coupon.maxDiscount != null ? Number(uc.coupon.maxDiscount) : null,
      expiresAt: uc.coupon.expiresAt,
      status: uc.status,
      issuedAt: uc.issuedAt,
      usedAt: uc.usedAt,
    };
  }

  computeCouponDiscount(orderAmount: number, coupon: Coupon): number {
    const value = Number(coupon.value);
    const maxDiscount = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : Infinity;

    if (coupon.type === 'percentage') {
      return Math.min(Math.floor((orderAmount * value) / 100), maxDiscount);
    }
    return Math.min(value, orderAmount);
  }

  async findAll(userId: number, status?: string): Promise<CouponListResponse> {
    const where: Record<string, unknown> = { userId };
    if (status === 'available' || status === 'used' || status === 'expired') {
      where.status = status;
    }

    const userCoupons = await this.userCouponRepo.find({
      where,
      relations: ['coupon'],
      order: { issuedAt: 'DESC' },
    });

    const balance = await this.getUserPointBalance(userId);

    return {
      coupons: userCoupons.map((uc) => this.toResponse(uc)),
      points: { balance, willExpireSoon: 0 },
    };
  }

  async calculate(userId: number, dto: CalculateDiscountDto): Promise<CalculateDiscountResponse> {
    const { orderAmount, userCouponId, pointsToUse = 0 } = dto;

    let couponDiscount = 0;

    if (userCouponId) {
      const uc = await findOrThrow(this.userCouponRepo, { id: userCouponId, userId }, '쿠폰을 찾을 수 없습니다.', ['coupon']);

      const now = new Date();
      if (uc.coupon.expiresAt < now) {
        throw new BadRequestException('만료된 쿠폰입니다.');
      }
      if (uc.status !== 'available') {
        throw new BadRequestException('이미 사용된 쿠폰입니다.');
      }
      const minOrder = Number(uc.coupon.minOrderAmount);
      if (orderAmount < minOrder) {
        throw new BadRequestException(`${minOrder.toLocaleString()}원 이상 주문 시 사용 가능한 쿠폰입니다.`);
      }

      couponDiscount = this.computeCouponDiscount(orderAmount, uc.coupon);
    }

    if (pointsToUse > 0) {
      const balance = await this.getUserPointBalance(userId);
      if (pointsToUse > balance) {
        throw new BadRequestException('적립금이 부족합니다.');
      }
    }

    const pointsDiscount = Math.min(pointsToUse, orderAmount - couponDiscount);
    const afterDiscount = Math.max(0, orderAmount - couponDiscount - pointsDiscount);
    const shippingFee = afterDiscount >= 30000 ? 0 : SHIPPING_FEE;
    const finalAmount = afterDiscount;
    const totalPayable = Math.max(0, finalAmount + shippingFee);

    return {
      originalAmount: orderAmount,
      couponDiscount,
      pointsDiscount,
      finalAmount,
      shippingFee,
      totalPayable,
    };
  }

  async getPoints(userId: number): Promise<PointsResponse> {
    const balance = await this.getUserPointBalance(userId);
    const history = await this.pointHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 50,
    });

    return {
      balance,
      history: history.map((h) => ({
        id: Number(h.id),
        type: h.type,
        amount: h.amount,
        balance: h.balance,
        description: h.description,
        createdAt: h.createdAt,
      })),
    };
  }

  async createCoupon(dto: CreateCouponDto): Promise<Coupon> {
    const coupon = this.couponRepo.create({
      code: dto.code,
      name: dto.name,
      type: dto.type,
      value: dto.value,
      minOrderAmount: dto.minOrderAmount ?? 0,
      maxDiscount: dto.maxDiscount ?? null,
      totalQuantity: dto.totalQuantity ?? null,
      startsAt: new Date(dto.startsAt),
      expiresAt: new Date(dto.expiresAt),
      isActive: dto.isActive ?? true,
    });

    const saved = await this.couponRepo.save(coupon);
    this.logger.log(`Coupon created: code=${saved.code}`);
    return saved;
  }

  async issueCoupon(dto: IssueCouponDto): Promise<UserCoupon> {
    const coupon = await findOrThrow(this.couponRepo, { id: dto.couponId }, '쿠폰을 찾을 수 없습니다.');
    if (!coupon.isActive) {
      throw new BadRequestException('비활성화된 쿠폰입니다.');
    }
    if (coupon.totalQuantity != null && coupon.issuedCount >= coupon.totalQuantity) {
      throw new BadRequestException('발급 수량이 소진된 쿠폰입니다.');
    }

    const existing = await this.userCouponRepo.findOne({
      where: { userId: dto.userId, couponId: dto.couponId },
    });
    if (existing) {
      throw new BadRequestException('이미 발급된 쿠폰입니다.');
    }

    return await this.dataSource.transaction(async (manager) => {
      const uc = manager.create(UserCoupon, {
        userId: dto.userId,
        couponId: dto.couponId,
        status: 'available',
      });
      const saved = await manager.save(UserCoupon, uc);
      await manager.increment(Coupon, { id: dto.couponId }, 'issuedCount', 1);
      this.logger.log(`Coupon issued: couponId=${dto.couponId}, userId=${dto.userId}`);
      return saved;
    });
  }

  async useCoupon(userCouponId: number, userId: number, orderId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const uc = await manager.findOne(UserCoupon, {
        where: { id: userCouponId },
        relations: ['coupon'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!uc) {
        throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
      }
      if (Number(uc.userId) !== Number(userId)) {
        throw new BadRequestException('권한이 없는 쿠폰입니다.');
      }
      if (uc.status !== 'available') {
        throw new BadRequestException('이미 사용된 쿠폰입니다.');
      }

      const now = new Date();
      if (uc.coupon.expiresAt < now) {
        throw new BadRequestException('만료된 쿠폰입니다.');
      }

      uc.status = 'used';
      uc.usedAt = now;
      uc.orderId = orderId;
      await manager.save(UserCoupon, uc);
    });
  }
}
