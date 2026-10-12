import {
  Injectable,
  BadRequestException,
  ConflictException,
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
import { User } from '../users/entities/user.entity';
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
  startsAt: Date;
  expiresAt: Date;
  status: 'available' | 'used' | 'expired';
  availabilityReason: 'not_started' | 'inactive' | null;
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

const DECIMAL_12_2_MAX = 9999999999.99;
const INT32_MAX = 2147483647;

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

  private toResponse(uc: UserCoupon, now = new Date()): CouponResponse {
    const availability = this.resolveUserCouponAvailability(uc, now);
    return {
      id: Number(uc.id),
      couponId: Number(uc.couponId),
      code: uc.coupon.code,
      name: uc.coupon.name,
      type: uc.coupon.type,
      value: Number(uc.coupon.value),
      minOrderAmount: Number(uc.coupon.minOrderAmount),
      maxDiscount: uc.coupon.maxDiscount != null ? Number(uc.coupon.maxDiscount) : null,
      startsAt: uc.coupon.startsAt,
      expiresAt: uc.coupon.expiresAt,
      status: availability.status,
      availabilityReason: availability.reason,
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
    return input !== undefined && this.parseDate(input).getTime() === value.getTime();
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
    if (coupon.startsAt > now) {
      throw new BadRequestException('아직 사용할 수 없는 쿠폰입니다.');
    }
    if (coupon.expiresAt <= now) {
      throw new BadRequestException('만료된 쿠폰입니다.');
    }
    if (!coupon.isActive) {
      throw new BadRequestException('비활성화된 쿠폰입니다.');
    }
  }

  private assertUserCouponUsable(uc: UserCoupon, now: Date): void {
    if (uc.status !== 'available') {
      throw new BadRequestException('이미 사용된 쿠폰입니다.');
    }
    this.assertCouponTemplateUsable(uc.coupon, now);
  }

  private resolveUserCouponAvailability(
    uc: UserCoupon,
    now: Date,
  ): { status: 'available' | 'used' | 'expired'; reason: 'not_started' | 'inactive' | null } {
    if (uc.status !== 'available') {
      return { status: uc.status, reason: null };
    }
    if (uc.coupon.expiresAt <= now) {
      return { status: 'expired', reason: null };
    }
    if (uc.coupon.startsAt > now) {
      return { status: 'available', reason: 'not_started' };
    }
    if (!uc.coupon.isActive) {
      return { status: 'available', reason: 'inactive' };
    }
    return { status: 'available', reason: null };
  }

  private assertCouponTemplatePayload(input: {
    type: Coupon['type'];
    value: number;
    minOrderAmount: number;
    maxDiscount?: number | null;
    startsAt: Date;
    expiresAt: Date;
    totalQuantity?: number | null;
  }): void {
    if (input.type !== 'percentage' && input.type !== 'fixed') {
      throw new BadRequestException('지원하지 않는 쿠폰 유형입니다.');
    }
    this.assertFiniteDecimal(input.value, '쿠폰 할인 값', 0.01);
    this.assertFiniteDecimal(input.minOrderAmount, '최소 주문 금액', 0);
    if (input.maxDiscount != null) {
      this.assertFiniteDecimal(input.maxDiscount, '최대 할인 금액', 0);
    }
    if (!Number.isFinite(input.startsAt.getTime()) || !Number.isFinite(input.expiresAt.getTime())) {
      throw new BadRequestException('쿠폰 기간이 올바르지 않습니다.');
    }
    if (input.expiresAt <= input.startsAt) {
      throw new BadRequestException('쿠폰 만료일은 시작일보다 늦어야 합니다.');
    }
    if (input.type === 'percentage' && input.value > 100) {
      throw new BadRequestException('정률 쿠폰 할인율은 100%를 초과할 수 없습니다.');
    }
    if (input.totalQuantity != null) {
      this.assertPositiveInt(input.totalQuantity, '총 발급 수량');
    }
  }

  private assertFiniteDecimal(value: unknown, label: string, min: number): asserts value is number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > DECIMAL_12_2_MAX) {
      throw new BadRequestException(`${label}이 올바르지 않습니다.`);
    }
  }

  private assertPositiveInt(value: unknown, label: string): asserts value is number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > INT32_MAX) {
      throw new BadRequestException(`${label}은 1 이상의 정수여야 합니다.`);
    }
  }

  private parseDate(value: string): Date {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      throw new BadRequestException('쿠폰 기간이 올바르지 않습니다.');
    }
    return date;
  }

  private normalizeRequiredText(value: unknown, label: string, maxLength: number): string {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${label}을 입력해 주세요.`);
    }
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > maxLength) {
      throw new BadRequestException(`${label}이 올바르지 않습니다.`);
    }
    return trimmed;
  }

  private assertNoNulls(dto: Record<string, unknown>, fields: string[]): void {
    for (const field of fields) {
      if (dto[field] === null) {
        throw new BadRequestException(`${field} 값은 null일 수 없습니다.`);
      }
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { code?: string; driverError?: { code?: string } };
    return candidate.code === 'ER_DUP_ENTRY' || candidate.driverError?.code === 'ER_DUP_ENTRY';
  }

  computeCouponDiscount(orderAmount: number, coupon: Coupon): number {
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return 0;
    }
    const value = Number(coupon.value);
    const maxDiscount = coupon.maxDiscount != null ? Number(coupon.maxDiscount) : Infinity;
    const discount = coupon.type === 'percentage'
      ? Math.min(Math.floor((orderAmount * value) / 100), maxDiscount, orderAmount)
      : Math.min(value, orderAmount);

    return Math.max(0, discount);
  }

  async findAll(userId: number, status?: string): Promise<CouponListResponse> {
    const where: Record<string, unknown> = { userId };
    const statusFilter =
      status === 'available' || status === 'used' || status === 'expired'
        ? status
        : undefined;

    const userCoupons = await this.userCouponRepo.find({
      where,
      relations: ['coupon'],
      order: { issuedAt: 'DESC' },
    });

    const balance = await this.pointsService.getUserPointBalance(userId);
    const now = new Date();
    const coupons = userCoupons
      .map((uc) => this.toResponse(uc, now))
      .filter((coupon) => {
        if (statusFilter === undefined) return true;
        if (statusFilter === 'available') {
          return coupon.status === 'available' && coupon.availabilityReason === null;
        }
        return coupon.status === statusFilter;
      });

    return {
      coupons,
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
    this.assertFiniteDecimal(orderAmount, '주문 금액', 0);
    if (!Number.isInteger(pointsToUse) || pointsToUse < 0) {
      throw new BadRequestException('사용할 적립금이 올바르지 않습니다.');
    }

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
    this.assertNoNulls(dto as unknown as Record<string, unknown>, ['code', 'name', 'type', 'value', 'minOrderAmount', 'startsAt', 'expiresAt', 'isActive']);
    const code = this.normalizeRequiredText(dto.code, '쿠폰 코드', 50);
    const name = this.normalizeRequiredText(dto.name, '쿠폰 이름', 255);
    const minOrderAmount = dto.minOrderAmount ?? 0;
    const startsAt = this.parseDate(dto.startsAt);
    const expiresAt = this.parseDate(dto.expiresAt);
    this.assertCouponTemplatePayload({
      type: dto.type,
      value: dto.value,
      minOrderAmount,
      maxDiscount: dto.maxDiscount,
      startsAt,
      expiresAt,
      totalQuantity: dto.totalQuantity,
    });

    const coupon = this.couponRepo.create({
      code,
      name,
      type: dto.type,
      value: dto.value,
      minOrderAmount,
      maxDiscount: dto.maxDiscount ?? null,
      totalQuantity: dto.totalQuantity ?? null,
      startsAt,
      expiresAt,
      isActive: dto.isActive ?? true,
    });

    try {
      const saved = await this.couponRepo.save(coupon);
      this.logger.log(`Coupon created: code=${saved.code}`);
      return this.toAdminCouponResponse(saved);
    } catch (err) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException('이미 사용 중인 쿠폰 코드입니다.');
      }
      throw err;
    }
  }

  async updateCoupon(id: number, dto: UpdateCouponDto): Promise<AdminCouponResponse> {
    this.assertNoNulls(dto as unknown as Record<string, unknown>, ['code', 'name', 'type', 'value', 'minOrderAmount', 'startsAt', 'expiresAt', 'isActive']);
    return this.dataSource.transaction(async (manager) => {
      const coupon = await manager.findOne(Coupon, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon) {
        throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
      }

      if (coupon.issuedCount > 0) {
        this.assertIssuedCouponMutability(coupon, dto);
      }

      if (dto.totalQuantity !== undefined) {
        if (dto.totalQuantity !== null) {
          this.assertPositiveInt(dto.totalQuantity, '총 발급 수량');
        }
        if (dto.totalQuantity !== null && dto.totalQuantity < coupon.issuedCount) {
          throw new BadRequestException('총 발급 수량은 이미 발급된 수량보다 작을 수 없습니다.');
        }
        coupon.totalQuantity = dto.totalQuantity ?? null;
      }

      this.assertCouponTemplatePayload({
        type: dto.type ?? coupon.type,
        value: dto.value ?? Number(coupon.value),
        minOrderAmount: dto.minOrderAmount ?? Number(coupon.minOrderAmount),
        maxDiscount: dto.maxDiscount !== undefined ? dto.maxDiscount : coupon.maxDiscount != null ? Number(coupon.maxDiscount) : null,
        startsAt: dto.startsAt !== undefined ? this.parseDate(dto.startsAt) : coupon.startsAt,
        expiresAt: dto.expiresAt !== undefined ? this.parseDate(dto.expiresAt) : coupon.expiresAt,
        totalQuantity: dto.totalQuantity !== undefined ? dto.totalQuantity : coupon.totalQuantity,
      });

      if (dto.code !== undefined) coupon.code = this.normalizeRequiredText(dto.code, '쿠폰 코드', 50);
      if (dto.name !== undefined) coupon.name = this.normalizeRequiredText(dto.name, '쿠폰 이름', 255);
      if (dto.type !== undefined) coupon.type = dto.type;
      if (dto.value !== undefined) coupon.value = dto.value;
      if (dto.minOrderAmount !== undefined) coupon.minOrderAmount = dto.minOrderAmount;
      if (dto.maxDiscount !== undefined) coupon.maxDiscount = dto.maxDiscount ?? null;
      if (dto.startsAt !== undefined) coupon.startsAt = this.parseDate(dto.startsAt);
      if (dto.expiresAt !== undefined) coupon.expiresAt = this.parseDate(dto.expiresAt);
      if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

      try {
        const saved = await manager.save(Coupon, coupon);
        this.logger.log(`Coupon updated: id=${saved.id}`);
        return this.toAdminCouponResponse(saved);
      } catch (err) {
        if (this.isDuplicateKeyError(err)) {
          throw new ConflictException('이미 사용 중인 쿠폰 코드입니다.');
        }
        throw err;
      }
    });
  }

  async removeCoupon(id: number): Promise<{ message: string }> {
    await this.dataSource.transaction(async (manager) => {
      const coupon = await manager.findOne(Coupon, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!coupon) {
        throw new NotFoundException('쿠폰을 찾을 수 없습니다.');
      }
      if (coupon.issuedCount > 0) {
        throw new BadRequestException('이미 발급된 쿠폰은 삭제할 수 없습니다.');
      }

      await manager.remove(Coupon, coupon);
      this.logger.log(`Coupon removed: id=${coupon.id}`);
    });
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
    const results: IssueCouponBatchResult[] = [];
    for (const couponId of couponIds) {
      try {
        await this.dataSource.transaction(async (manager) => {
          await this.issueCouponInTx(manager, { userId, couponId });
        });
        results.push({ couponId, issued: true });
      } catch (err) {
        if (!(err instanceof BadRequestException || err instanceof NotFoundException)) {
          throw err;
        }
        results.push({
          couponId,
          issued: false,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
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
    const user = await manager.findOne(User, { where: { id: dto.userId, isActive: true } });
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
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
    let saved: UserCoupon;
    try {
      saved = await manager.save(UserCoupon, uc);
    } catch (err) {
      if (this.isDuplicateKeyError(err)) {
        throw new BadRequestException('이미 발급된 쿠폰입니다.');
      }
      throw err;
    }
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
