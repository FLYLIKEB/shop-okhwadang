import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DataSource, EntityManager, Like } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { UserCoupon } from './entities/user-coupon.entity';
import { PointHistory } from './entities/point-history.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { CalculateDiscountDto } from './dto/calculate-discount.dto';
import { IssueCouponDto } from './dto/issue-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { AdminCouponListQueryDto } from './dto/admin-coupon-list-query.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { PointsService, PointHistoryResponseItem } from '../points/points.service';
import { ShippingFeeCalculatorService } from '../shipping/services/shipping-fee-calculator.service';
import { Product, ProductStatus } from '../products/entities/product.entity';
import type { CouponShippingItemDto } from './dto/calculate-discount.dto';

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

export interface AdminCouponResponse {
  id: number;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  totalQuantity: number | null;
  issuedCount: number;
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface PointsInfo {
  balance: number;
  willExpireSoon: number;
}

export interface CouponListResponse {
  coupons: CouponResponse[];
  points: PointsInfo;
}

export interface AdminCouponListResponse {
  items: AdminCouponResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface CalculateDiscountResponse {
  originalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  finalAmount: number;
  shippingFee: number;
  totalPayable: number;
}

export interface IssueCouponBatchResult {
  couponId: number;
  issued: boolean;
  reason?: string;
}

export interface PointsResponse {
  balance: number;
  history: PointHistoryResponseItem[];
}

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
    private readonly pointsService: PointsService,
    private readonly shippingFeeCalculator: ShippingFeeCalculatorService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

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

  private toAdminCouponResponse(coupon: Coupon): AdminCouponResponse {
    return {
      id: Number(coupon.id),
      code: coupon.code,
      name: coupon.name,
      type: coupon.type,
      value: Number(coupon.value),
      minOrderAmount: Number(coupon.minOrderAmount),
      maxDiscount: coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
      totalQuantity: coupon.totalQuantity != null ? Number(coupon.totalQuantity) : null,
      issuedCount: Number(coupon.issuedCount),
      startsAt: coupon.startsAt,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
    };
  }

  private sameOptionalDate(input: string | undefined, value: Date): boolean {
    return input !== undefined && new Date(input).getTime() === value.getTime();
  }

  private assertIssuedCouponMutability(coupon: Coupon, dto: UpdateCouponDto): void {
    const immutableFieldChanged = (
      (dto.type !== undefined && dto.type !== coupon.type)
      || (dto.value !== undefined && dto.value !== Number(coupon.value))
      || (dto.minOrderAmount !== undefined && dto.minOrderAmount !== Number(coupon.minOrderAmount))
      || (dto.maxDiscount !== undefined && (dto.maxDiscount ?? null) !== (coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null))
      || (dto.startsAt !== undefined && !this.sameOptionalDate(dto.startsAt, coupon.startsAt))
      || (dto.expiresAt !== undefined && !this.sameOptionalDate(dto.expiresAt, coupon.expiresAt))
      || (dto.isActive !== undefined && dto.isActive !== coupon.isActive)
    );

    if (immutableFieldChanged) {
      throw new BadRequestException('발급 이력이 있는 쿠폰은 할인/기간/활성 상태를 수정할 수 없습니다.');
    }
  }

  private assertCouponTemplateUsable(coupon: Coupon, now: Date): void {
    if (!coupon.isActive) {
      throw new BadRequestException('비활성화된 쿠폰입니다.');
    }
    if (coupon.startsAt > now) {
      throw new BadRequestException('아직 사용할 수 없는 쿠폰입니다.');
    }
    if (coupon.expiresAt < now) {
      throw new BadRequestException('만료된 쿠폰입니다.');
    }
  }

  private assertUserCouponUsable(uc: UserCoupon, now: Date): void {
    if (uc.status !== 'available') {
      throw new BadRequestException('이미 사용된 쿠폰입니다.');
    }
    this.assertCouponTemplateUsable(uc.coupon, now);
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

    const balance = await this.pointsService.getUserPointBalance(userId);

    return {
      coupons: userCoupons.map((uc) => this.toResponse(uc)),
      points: { balance, willExpireSoon: 0 },
    };
  }

  async findAdminCoupons(query: AdminCouponListQueryDto): Promise<AdminCouponListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const keyword = query.q?.trim();
    const statusFilter = query.status === 'active' ? true : query.status === 'inactive' ? false : undefined;
    const baseWhere: Record<string, unknown> = statusFilter === undefined ? {} : { isActive: statusFilter };
    const where = keyword
      ? [
          { ...baseWhere, code: Like(`%${keyword}%`) },
          { ...baseWhere, name: Like(`%${keyword}%`) },
        ]
      : (statusFilter === undefined ? undefined : baseWhere);

    const [items, total] = await this.couponRepo.findAndCount({
      where,
      order: { createdAt: 'DESC', id: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items: items.map((coupon) => this.toAdminCouponResponse(coupon)),
      total,
      page,
      limit,
    };
  }

  async findAdminCoupon(id: number): Promise<AdminCouponResponse> {
    const coupon = await findOrThrow(this.couponRepo, { id }, '쿠폰을 찾을 수 없습니다.');
    return this.toAdminCouponResponse(coupon);
  }

  private async resolveShippingPolicies(items: CouponShippingItemDto[]): Promise<{ isFreeShipping: boolean }[]> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.productRepo.find({
      where: { id: In(productIds), status: ProductStatus.ACTIVE },
    });
    const productMap = new Map(products.map((product) => [Number(product.id), product]));
    if (products.length !== productIds.length || items.some((item) => !productMap.has(item.productId))) {
      throw new BadRequestException('배송비 계산 상품을 찾을 수 없습니다.');
    }
    return items.map((item) => ({ isFreeShipping: Boolean(productMap.get(item.productId)?.isFreeShipping) }));
  }

  async calculate(
    userId: number,
    dto: CalculateDiscountDto,
    trustedShippingPolicies?: { isFreeShipping: boolean }[],
  ): Promise<CalculateDiscountResponse> {
    const { orderAmount, userCouponId, pointsToUse = 0 } = dto;

    let couponDiscount = 0;

    if (userCouponId) {
      const uc = await findOrThrow(this.userCouponRepo, { id: userCouponId, userId }, '쿠폰을 찾을 수 없습니다.', ['coupon']);

      const now = new Date();
      this.assertUserCouponUsable(uc, now);
      const minOrder = Number(uc.coupon.minOrderAmount);
      if (orderAmount < minOrder) {
        throw new BadRequestException(`${minOrder.toLocaleString()}원 이상 주문 시 사용 가능한 쿠폰입니다.`);
      }

      couponDiscount = this.computeCouponDiscount(orderAmount, uc.coupon);
    }

    if (pointsToUse > 0) {
      const balance = await this.pointsService.getUserPointBalance(userId);
      if (pointsToUse > balance) {
        throw new BadRequestException('적립금이 부족합니다.');
      }
    }

    const pointsDiscount = Math.min(pointsToUse, orderAmount - couponDiscount);
    const afterDiscount = Math.max(0, orderAmount - couponDiscount - pointsDiscount);
    // The authority uses the pre-discount merchandise subtotal for the free-shipping threshold.
    const shippingQuote = await this.shippingFeeCalculator.calculate(
      orderAmount,
      dto.zipcode,
      trustedShippingPolicies ?? await this.resolveShippingPolicies(dto.items),
    );
    const shippingFee = shippingQuote.shippingFee;
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
    const balance = await this.pointsService.getUserPointBalance(userId);
    const history = await this.pointHistoryRepo.find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 50,
    });

    return {
      balance,
      history: history.map((entry) => this.pointsService.toHistoryResponse(entry)),
    };
  }

  async createCoupon(dto: CreateCouponDto): Promise<AdminCouponResponse> {
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
    return this.toAdminCouponResponse(saved);
  }

  async updateCoupon(id: number, dto: UpdateCouponDto): Promise<AdminCouponResponse> {
    const coupon = await findOrThrow(this.couponRepo, { id }, '쿠폰을 찾을 수 없습니다.');

    if (coupon.issuedCount > 0) {
      this.assertIssuedCouponMutability(coupon, dto);
    }

    if (dto.totalQuantity !== undefined) {
      if (dto.totalQuantity !== null && dto.totalQuantity < coupon.issuedCount) {
        throw new BadRequestException('총 발급 수량은 이미 발급된 수량보다 작을 수 없습니다.');
      }
      coupon.totalQuantity = dto.totalQuantity ?? null;
    }

    if (dto.code !== undefined) coupon.code = dto.code;
    if (dto.name !== undefined) coupon.name = dto.name;
    if (dto.type !== undefined) coupon.type = dto.type;
    if (dto.value !== undefined) coupon.value = dto.value;
    if (dto.minOrderAmount !== undefined) coupon.minOrderAmount = dto.minOrderAmount;
    if (dto.maxDiscount !== undefined) coupon.maxDiscount = dto.maxDiscount ?? null;
    if (dto.startsAt !== undefined) coupon.startsAt = new Date(dto.startsAt);
    if (dto.expiresAt !== undefined) coupon.expiresAt = new Date(dto.expiresAt);
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    const saved = await this.couponRepo.save(coupon);
    this.logger.log(`Coupon updated: id=${saved.id}`);
    return this.toAdminCouponResponse(saved);
  }

  async removeCoupon(id: number): Promise<{ message: string }> {
    const coupon = await findOrThrow(this.couponRepo, { id }, '쿠폰을 찾을 수 없습니다.');
    if (coupon.issuedCount > 0) {
      throw new BadRequestException('이미 발급된 쿠폰은 삭제할 수 없습니다.');
    }

    await this.couponRepo.remove(coupon);
    this.logger.log(`Coupon removed: id=${coupon.id}`);
    return { message: '쿠폰이 삭제되었습니다.' };
  }

  async issueCoupon(dto: IssueCouponDto): Promise<UserCoupon> {
    return this.dataSource.transaction(async (manager) => {
      return this.issueCouponInTx(manager, dto);
    });
  }

  async issueCouponsForUser(
    userId: number,
    couponIds: number[],
  ): Promise<IssueCouponBatchResult[]> {
    return this.dataSource.transaction(async (manager) => {
      const results: IssueCouponBatchResult[] = [];
      for (const couponId of couponIds) {
        try {
          await this.issueCouponInTx(manager, { userId, couponId });
          results.push({ couponId, issued: true });
        } catch (err) {
          results.push({
            couponId,
            issued: false,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
      return results;
    });
  }

  private async issueCouponInTx(
    manager: EntityManager,
    dto: IssueCouponDto,
  ): Promise<UserCoupon> {
    const coupon = await manager.findOne(Coupon, {
      where: { id: dto.couponId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!coupon) {
      throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
    }
    this.assertCouponTemplateUsable(coupon, new Date());
    if (coupon.totalQuantity != null && coupon.issuedCount >= coupon.totalQuantity) {
      throw new BadRequestException('발급 수량이 소진된 쿠폰입니다.');
    }

    const existing = await manager.findOne(UserCoupon, {
      where: { userId: dto.userId, couponId: dto.couponId },
    });
    if (existing) {
      throw new BadRequestException('이미 발급된 쿠폰입니다.');
    }

    const uc = manager.create(UserCoupon, {
      userId: dto.userId,
      couponId: dto.couponId,
      status: 'available',
    });
    const saved = await manager.save(UserCoupon, uc);
    await manager.increment(Coupon, { id: dto.couponId }, 'issuedCount', 1);
    this.logger.log(`Coupon issued: couponId=${dto.couponId}, userId=${dto.userId}`);
    return saved;
  }

  async useCoupon(
    userCouponId: number,
    userId: number,
    orderId: number,
    manager?: EntityManager,
  ): Promise<void> {
    const run = async (m: EntityManager) => {
      const uc = await m.findOne(UserCoupon, {
        where: { id: userCouponId },
        relations: ['coupon'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!uc) {
        throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
      }
      assertOwnership(uc.userId, userId, '권한이 없는 쿠폰입니다.');
      const now = new Date();
      this.assertUserCouponUsable(uc, now);

      uc.status = 'used';
      uc.usedAt = now;
      uc.orderId = orderId;
      await m.save(UserCoupon, uc);
    };

    if (manager) {
      await run(manager);
    } else {
      await this.dataSource.transaction(run);
    }
  }
}
