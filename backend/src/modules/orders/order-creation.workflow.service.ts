import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, EntityManager } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import {
  CreateOrderDto,
  OrderItemDto,
  PolicyConsentSnapshotDto,
} from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Product, ProductStatus } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { PointsService } from '../points/points.service';
import { CouponsService } from '../coupons/coupons.service';
import { CalculateDiscountDto } from '../coupons/dto/calculate-discount.dto';
import { ShippingFeeCalculatorService } from '../shipping/services/shipping-fee-calculator.service';
import {
  PolicyConsent,
  PolicyConsentContext,
  PolicyConsentSnapshot,
} from '../pages/entities/policy-consent.entity';
import {
  REQUIRED_CHECKOUT_POLICY_SLUGS,
  REQUIRED_CHECKOUT_POLICY_SQL,
} from '../../common/constants/policy.constants';

export type OrderLocale = 'ko' | 'en';

interface OrderItemBuildResult {
  orderItems: Partial<OrderItem>[];
  subtotalAmount: number;
  shippingItemPolicies: { isFreeShipping: boolean }[];
}

interface SharedOrderCreatePayload {
  items: OrderItemDto[];
  policyConsents?: PolicyConsentSnapshotDto[];
}

interface SharedOrderAddressPayload {
  recipientName: string;
  recipientPhone: string;
  zipcode: string;
  address: string;
  addressDetail?: string | null;
  memo?: string | null;
}

interface SharedPolicyConsentPayload {
  policyConsents?: PolicyConsentSnapshotDto[];
  marketingConsent?: boolean;
}

export interface CheckoutPricingAuthorityInput extends SharedOrderCreatePayload {
  zipcode: string;
  userCouponId?: number;
  pointsToUse?: number;
  locale?: OrderLocale;
}

export interface CheckoutPricingAuthorityResult {
  items?: CheckoutPricingItem[];
  subtotalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  shippingFee: number;
  isFreeShipping: boolean;
  isRemoteArea: boolean;
  remoteAreaSurcharge: number;
  totalPayable: number;
  appliedUserCouponId?: number;
  appliedPointsUsed: number;
  freeShippingThreshold: number;
}

export interface CheckoutPricingPreviewResult extends CheckoutPricingAuthorityResult {
  items: CheckoutPricingItem[];
}

export interface CheckoutPricingItem {
  productId: number;
  productOptionId: number | null;
  productName: string;
  optionName: string | null;
  unitPrice: number;
  subtotal: number;
  quantity: number;
}

export interface PersistOrderInput extends SharedOrderAddressPayload {
  userId: number | null;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  pointsUsed: number;
  guestEmailNormalized: string | null;
  orderLocale: OrderLocale;
}

export interface OrderPostCommitPayload {
  savedOrder: Order;
  totalPayable: number;
  recipientName: string;
}

@Injectable()
export class OrderCreationWorkflowService {
  constructor(
    private readonly pointsService: PointsService,
    private readonly couponsService: CouponsService,
    private readonly shippingFeeCalculator: ShippingFeeCalculatorService,
  ) {}

  assertCreatePayload(dto: SharedOrderCreatePayload): void {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('주문 항목이 없습니다.');
    }
  }

  async runCreateOrderTransaction(
    manager: EntityManager,
    userId: number,
    dto: CreateOrderDto,
    pointsToUse: number,
  ): Promise<OrderPostCommitPayload> {
    /*
     * Transaction lock order is fixed: user (point ledger) -> inventory
     * (product/option tuple sorted by IDs) -> order. Take the canonical user
     * lock before inventory so concurrent orders cannot both observe and spend
     * the same ledger balance, while retaining one ordering across checkouts.
     */
    await this.pointsService.lockUserForPointChanges(manager, userId);

    const { orderItems, subtotalAmount, shippingItemPolicies } = await this.validateAndReserveStock(manager, dto);

    const pricing = await this.calculatePricing(manager, userId, {
      zipcode: dto.zipcode,
      subtotalAmount,
      shippingItemPolicies,
      userCouponId: dto.userCouponId,
      pointsToUse,
    });

    const savedOrder = await this.saveOrder(manager, {
      userId,
      totalAmount: pricing.totalPayable,
      discountAmount: pricing.couponDiscount,
      shippingFee: pricing.shippingFee,
      pointsUsed: pricing.appliedPointsUsed,
      guestEmailNormalized: null,
      orderLocale: this.resolveOrderLocale(dto),
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail ?? null,
      memo: dto.memo ?? null,
    });

    await this.applyCouponAndPoints(manager, userId, dto.userCouponId, pricing.appliedPointsUsed, savedOrder);
    await this.savePolicyConsent(manager, userId, savedOrder, dto);
    await this.saveOrderItems(manager, orderItems, Number(savedOrder.id));
    if (!dto.preserveCart) {
      await this.clearCartItems(manager, userId, dto);
    }

    return {
      savedOrder,
      totalPayable: pricing.totalPayable,
      recipientName: dto.recipientName,
    };
  }

  async previewPricing(
    manager: EntityManager,
    userId: number | null,
    input: CheckoutPricingAuthorityInput,
  ): Promise<CheckoutPricingPreviewResult> {
    const { subtotalAmount, shippingItemPolicies, orderItems } = await this.buildOrderItems(manager, input, false);

    const pricing = await this.calculatePricing(manager, userId, {
      zipcode: input.zipcode,
      subtotalAmount,
      shippingItemPolicies,
      userCouponId: input.userCouponId,
      pointsToUse: input.pointsToUse,
    });
    return {
      ...pricing,
      items: orderItems.map((item) => ({
        productId: Number(item.productId),
        productOptionId: item.productOptionId != null ? Number(item.productOptionId) : null,
        productName: String(item.productName ?? ''),
        optionName: item.optionName != null ? String(item.optionName) : null,
        unitPrice: Number(item.price),
        subtotal: Number(item.price) * Number(item.quantity),
        quantity: Number(item.quantity),
      })),
    };
  }

  async calculatePricing(
    manager: EntityManager,
    userId: number | null,
    input: {
      zipcode: string;
      subtotalAmount: number;
      shippingItemPolicies: { isFreeShipping: boolean }[];
      userCouponId?: number;
      pointsToUse?: number;
    },
  ): Promise<CheckoutPricingAuthorityResult> {
    const requestedPoints = input.pointsToUse ?? 0;

    if (userId === null) {
      if (input.userCouponId || requestedPoints > 0) {
        throw new BadRequestException('비회원은 쿠폰이나 적립금을 사용할 수 없습니다.');
      }
    } else {
      await this.ensureSufficientPoints(manager, userId, requestedPoints);
    }

    let couponDiscount = 0;
    let pointsDiscount = 0;

    if (userId !== null && (input.userCouponId || requestedPoints > 0)) {
      const calculateDto: CalculateDiscountDto = {
        orderAmount: input.subtotalAmount,
        zipcode: input.zipcode,
        items: [],
        userCouponId: input.userCouponId,
        pointsToUse: requestedPoints,
      };
      const discountResult = await this.couponsService.calculate(userId, calculateDto, input.shippingItemPolicies);
      couponDiscount = discountResult.couponDiscount;
      pointsDiscount = discountResult.pointsDiscount;
    }

    const shippingQuote = await this.shippingFeeCalculator.calculate(
      input.subtotalAmount,
      input.zipcode,
      input.shippingItemPolicies,
    );
    const discountedMerchandiseSubtotal = Math.max(0, input.subtotalAmount - couponDiscount - pointsDiscount);
    const totalPayable = discountedMerchandiseSubtotal + shippingQuote.shippingFee;

    return {
      subtotalAmount: input.subtotalAmount,
      couponDiscount,
      pointsDiscount,
      shippingFee: shippingQuote.shippingFee,
      isFreeShipping: shippingQuote.isFreeShipping,
      isRemoteArea: shippingQuote.isRemoteArea,
      remoteAreaSurcharge: shippingQuote.remoteAreaSurcharge,
      totalPayable,
      appliedUserCouponId: input.userCouponId,
      appliedPointsUsed: pointsDiscount,
      freeShippingThreshold: shippingQuote.threshold,
    };
  }

  createOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
    return `ORD-${date}-${random}`;
  }

  async validateAndReserveStock(
    manager: EntityManager,
    dto: SharedOrderCreatePayload,
  ): Promise<OrderItemBuildResult> {
    return this.buildOrderItems(manager, dto, true);
  }

  async calculateShippingFee(
    subtotalAmount: number,
    zipcode: string,
    shippingItemPolicies: { isFreeShipping: boolean }[],
  ): Promise<number> {
    const shippingQuote = await this.shippingFeeCalculator.calculate(
      subtotalAmount,
      zipcode,
      shippingItemPolicies,
    );

    return shippingQuote.shippingFee;
  }

  async saveOrder(manager: EntityManager, input: PersistOrderInput): Promise<Order> {
    const order = manager.create(Order, {
      userId: input.userId,
      guestEmailNormalized: input.guestEmailNormalized,
      orderNumber: this.createOrderNumber(),
      orderLocale: input.orderLocale,
      status: OrderStatus.PENDING,
      totalAmount: input.totalAmount,
      discountAmount: input.discountAmount,
      shippingFee: input.shippingFee,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      zipcode: input.zipcode,
      address: input.address,
      addressDetail: input.addressDetail ?? null,
      memo: input.memo ?? null,
      pointsUsed: input.pointsUsed,
    });

    return manager.save(Order, order);
  }

  async savePolicyConsent(
    manager: EntityManager,
    userId: number | null,
    savedOrder: Order,
    dto: SharedPolicyConsentPayload,
  ): Promise<void> {
    if (!dto.policyConsents || dto.policyConsents.length === 0) {
      throw new BadRequestException('필수 정책 동의 정보가 없습니다.');
    }
    const currentPolicies = await this.loadCurrentPolicySnapshots(manager);
    const policies = dto.policyConsents.map((policy) => ({
      slug: policy.slug,
      version: policy.version ?? null,
      effectiveDate: policy.effectiveDate ?? null,
    }));

    this.assertPolicyConsentMatchesCurrent(currentPolicies, policies);

    await manager.save(PolicyConsent, {
      userId,
      context: PolicyConsentContext.CHECKOUT,
      resourceType: 'order',
      resourceId: Number(savedOrder.id),
      policies,
      marketingConsent: dto.marketingConsent ?? false,
    });
  }

  private assertPolicyConsentMatchesCurrent(
    currentPolicies: PolicyConsentSnapshot[],
    submittedPolicies: PolicyConsentSnapshot[],
  ): void {
    const submittedBySlug = new Map<string, PolicyConsentSnapshot>();
    for (const policy of submittedPolicies) {
      if (submittedBySlug.has(policy.slug)) {
        throw new BadRequestException('필수 정책 동의 정보가 중복되었습니다.');
      }
      submittedBySlug.set(policy.slug, policy);
    }

    if (submittedBySlug.size !== currentPolicies.length) {
      throw new BadRequestException('필수 정책 동의 정보가 누락되었습니다.');
    }

    for (const currentPolicy of currentPolicies) {
      const submitted = submittedBySlug.get(currentPolicy.slug);
      if (
        !submitted
        || submitted.version !== currentPolicy.version
        || this.normalizePolicyEffectiveDate(submitted.effectiveDate)
          !== this.normalizePolicyEffectiveDate(currentPolicy.effectiveDate)
      ) {
        throw new BadRequestException('정책 버전이 변경되었습니다. 최신 정책에 다시 동의해 주세요.');
      }
    }
  }

  private normalizePolicyEffectiveDate(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    return value instanceof Date ? value.toISOString().slice(0, 10) : value;
  }

  async loadCurrentPolicySnapshots(manager: EntityManager): Promise<PolicyConsentSnapshot[]> {
    const rows = await manager.query(`
      SELECT slug, title, policy_version AS version,
             DATE_FORMAT(policy_effective_date, '%Y-%m-%d') AS effectiveDate
      FROM pages
      WHERE is_current_policy = 1
        AND slug IN (${REQUIRED_CHECKOUT_POLICY_SQL})
      ORDER BY slug ASC
    `) as Array<{ slug: string; title: string | null; version: string | null; effectiveDate: string | null }>;

    if (rows.length === REQUIRED_CHECKOUT_POLICY_SLUGS.length) {
      return rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        version: row.version,
        effectiveDate: this.normalizePolicyEffectiveDate(row.effectiveDate),
      }));
    }

    throw new BadRequestException('체크아웃 필수 정책을 불러올 수 없습니다.');
  }

  async saveOrderItems(
    manager: EntityManager,
    orderItems: Partial<OrderItem>[],
    orderId: number,
  ): Promise<void> {
    const itemEntities = orderItems.map((item) =>
      manager.create(OrderItem, { ...item, orderId }),
    );
    await manager.save(OrderItem, itemEntities);
  }

  private resolveOrderLocale(dto: CreateOrderDto): OrderLocale {
    return (dto as CreateOrderDto & { orderLocale?: OrderLocale }).orderLocale === 'en' ? 'en' : 'ko';
  }

  /**
   * 재고 정책 (issue #723):
   *   - 옵션이 있는 상품: `product_option.stock` 만이 판매 가능 수량의 원장이다.
   *     주문 시 옵션 재고만 차감하고, 상품 총 재고 (`product.stock`) 는 건드리지 않는다.
   *     상품 총 재고는 옵션 합으로의 집계값/표시용이며, 옵션 재고와 동시 차감 시
   *     이중 차감 버그가 발생한다.
   *   - 옵션이 없는 상품: `product.stock` 이 원장이며, 그대로 차감한다.
   *
   * 취소·환불 시 복구도 동일한 분기를 사용한다 (AdminOrdersService.restoreStock 참고).
   */
  private async buildOrderItems(
    manager: EntityManager,
    dto: SharedOrderCreatePayload,
    reserveStock: boolean,
  ): Promise<OrderItemBuildResult> {
    const orderItems: Partial<OrderItem>[] = [];
    const shippingItemPolicies: { isFreeShipping: boolean }[] = [];
    let subtotalAmount = 0;

    const itemsInLockOrder = [...dto.items].sort((left, right) => {
      const productDifference = Number(left.productId) - Number(right.productId);
      if (productDifference !== 0) return productDifference;
      return Number(left.productOptionId ?? 0) - Number(right.productOptionId ?? 0);
    });

    for (const item of itemsInLockOrder) {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock(reserveStock ? 'pessimistic_write' : 'pessimistic_read')
        .where('product.id = :id', { id: item.productId })
        .getOne();

      if (!product) {
        throw new NotFoundException(`상품을 찾을 수 없습니다. (id: ${item.productId})`);
      }

      if (product.status !== ProductStatus.ACTIVE) {
        throw new BadRequestException('판매 중인 상품만 주문할 수 있습니다.');
      }

      let optionName: string | null = null;
      let priceAdjustment = 0;

      if (item.productOptionId != null) {
        const option = await manager
          .createQueryBuilder(ProductOption, 'option')
          .setLock(reserveStock ? 'pessimistic_write' : 'pessimistic_read')
          .where('option.id = :id', { id: item.productOptionId })
          .getOne();

        if (!option || Number(option.productId) !== Number(item.productId)) {
          throw new BadRequestException('해당 상품의 옵션을 찾을 수 없습니다.');
        }

        if (option.stock < item.quantity) {
          throw new BadRequestException(
            `재고가 부족합니다. (${product.name} - ${option.name}: ${option.value}: ${option.stock}개 남음)`,
          );
        }

        optionName = `${option.name}: ${option.value}`;
        priceAdjustment = Number(option.priceAdjustment);

        if (reserveStock) {
          await manager.update(ProductOption, option.id, {
            stock: option.stock - item.quantity,
          });
        }
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `재고가 부족합니다. (${product.name}: ${product.stock}개 남음)`,
          );
        }

        if (reserveStock) {
          await manager.update(Product, product.id, {
            stock: product.stock - item.quantity,
          });
        }
      }

      const unitPrice = Number(product.salePrice ?? product.price) + priceAdjustment;
      const subtotal = unitPrice * item.quantity;
      subtotalAmount += subtotal;

      orderItems.push({
        productId: Number(item.productId),
        productOptionId: item.productOptionId ?? null,
        productName: product.name,
        optionName,
        price: unitPrice,
        quantity: item.quantity,
        isFreeShipping: product.isFreeShipping,
      });
      shippingItemPolicies.push({ isFreeShipping: product.isFreeShipping });
    }

    return { orderItems, subtotalAmount, shippingItemPolicies };
  }

  private async ensureSufficientPoints(
    manager: EntityManager,
    userId: number,
    pointsToUse: number,
  ): Promise<void> {
    if (pointsToUse <= 0) return;

    const balance = await this.pointsService.getEffectiveBalanceInTx(manager, userId);
    if (pointsToUse > balance) {
      throw new BadRequestException('적립금이 부족합니다.');
    }
  }

  private async applyCouponAndPoints(
    manager: EntityManager,
    userId: number,
    userCouponId: number | undefined,
    appliedPointsUsed: number,
    savedOrder: Order,
  ): Promise<void> {
    if (userCouponId) {
      await this.couponsService.useCoupon(userCouponId, userId, Number(savedOrder.id), manager);
    }

    if (appliedPointsUsed > 0) {
      await this.pointsService.deductFifo(
        manager,
        userId,
        appliedPointsUsed,
        `주문 사용 (${savedOrder.orderNumber})`,
        Number(savedOrder.id),
      );
    }
  }

  private async clearCartItems(
    manager: EntityManager,
    userId: number,
    dto: CreateOrderDto,
  ): Promise<void> {
    const pairs = dto.items.map((item) => ({
      productId: item.productId,
      productOptionId: item.productOptionId ?? null,
    }));

    if (pairs.length === 0) {
      return;
    }

    await manager
      .createQueryBuilder()
      .delete()
      .from(CartItem)
      .where('userId = :userId', { userId })
      .andWhere(
        new Brackets((qb) => {
          pairs.forEach((pair, index) => {
            const condition = pair.productOptionId === null
              ? `(productId = :productId${index} AND productOptionId IS NULL)`
              : `(productId = :productId${index} AND productOptionId = :productOptionId${index})`;
            const params = pair.productOptionId === null
              ? { [`productId${index}`]: pair.productId }
              : { [`productId${index}`]: pair.productId, [`productOptionId${index}`]: pair.productOptionId };

            if (index === 0) {
              qb.where(condition, params);
            } else {
              qb.orWhere(condition, params);
            }
          });
        }),
      )
      .execute();
  }
}
