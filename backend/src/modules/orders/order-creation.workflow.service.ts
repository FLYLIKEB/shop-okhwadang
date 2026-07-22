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

export type OrderLocale = 'ko' | 'en';

interface OrderItemBuildResult {
  orderItems: Partial<OrderItem>[];
  subtotalAmount: number;
  shippingItemPolicies: { isFreeShipping: boolean }[];
}

interface OrderPriceResult {
  discountAmount: number;
  discountedAmount: number;
  shippingFee: number;
  totalPayable: number;
}

interface SharedOrderCreatePayload {
  items: OrderItemDto[];
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
    await this.ensureSufficientPoints(manager, userId, pointsToUse);

    const { orderItems, subtotalAmount, shippingItemPolicies } = await this.validateAndReserveStock(manager, dto);

    const pricing = await this.calculateDiscountAndShipping(
      userId,
      dto,
      subtotalAmount,
      pointsToUse,
      shippingItemPolicies,
    );

    const savedOrder = await this.saveOrder(manager, {
      userId,
      totalAmount: pricing.totalPayable,
      discountAmount: pricing.discountAmount,
      shippingFee: pricing.shippingFee,
      pointsUsed: pointsToUse,
      guestEmailNormalized: null,
      orderLocale: this.resolveOrderLocale(dto),
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail ?? null,
      memo: dto.memo ?? null,
    });

    await this.applyCouponAndPoints(manager, userId, dto, pointsToUse, savedOrder);
    await this.savePolicyConsent(manager, userId, savedOrder, dto);
    await this.saveOrderItems(manager, orderItems, Number(savedOrder.id));
    await this.clearCartItems(manager, userId, dto);

    return {
      savedOrder,
      totalPayable: pricing.totalPayable,
      recipientName: dto.recipientName,
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
    const orderItems: Partial<OrderItem>[] = [];
    const shippingItemPolicies: { isFreeShipping: boolean }[] = [];
    let subtotalAmount = 0;

    for (const item of dto.items) {
      const product = await manager
        .createQueryBuilder(Product, 'product')
        .setLock('pessimistic_write')
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
          .setLock('pessimistic_write')
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

        await manager.update(ProductOption, option.id, {
          stock: option.stock - item.quantity,
        });
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `재고가 부족합니다. (${product.name}: ${product.stock}개 남음)`,
          );
        }

        await manager.update(Product, product.id, {
          stock: product.stock - item.quantity,
        });
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
    const policies = dto.policyConsents?.length
      ? dto.policyConsents.map((policy) => ({
        slug: policy.slug,
        version: policy.version ?? null,
        effectiveDate: policy.effectiveDate ?? null,
      }))
      : await this.loadCurrentPolicySnapshots(manager);

    await manager.save(PolicyConsent, {
      userId,
      context: PolicyConsentContext.CHECKOUT,
      resourceType: 'order',
      resourceId: Number(savedOrder.id),
      policies,
      marketingConsent: dto.marketingConsent ?? false,
    });
  }

  async loadCurrentPolicySnapshots(manager: EntityManager): Promise<PolicyConsentSnapshot[]> {
    const rows = await manager.query(`
      SELECT slug, title, policy_version AS version, policy_effective_date AS effectiveDate
      FROM pages
      WHERE is_current_policy = 1
        AND slug IN ('terms', 'privacy', 'shipping', 'returns', 'shipping-returns')
      ORDER BY slug ASC
    `) as Array<{ slug: string; title: string | null; version: string | null; effectiveDate: string | null }>;

    if (rows.length > 0) {
      return rows.map((row) => ({
        slug: row.slug,
        title: row.title,
        version: row.version,
        effectiveDate: row.effectiveDate,
      }));
    }

    return [
      { slug: 'terms', version: null, effectiveDate: null },
      { slug: 'privacy', version: null, effectiveDate: null },
      { slug: 'shipping-returns', version: null, effectiveDate: null },
    ];
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
  private async calculateDiscountAndShipping(
    userId: number,
    dto: CreateOrderDto,
    subtotalAmount: number,
    pointsToUse: number,
    shippingItemPolicies: { isFreeShipping: boolean }[],
  ): Promise<OrderPriceResult> {
    let discountAmount = 0;
    let discountedAmount = subtotalAmount;

    if (dto.userCouponId || pointsToUse > 0) {
      const calculateDto: CalculateDiscountDto = {
        orderAmount: subtotalAmount,
        userCouponId: dto.userCouponId,
        pointsToUse,
      };
      const discountResult = await this.couponsService.calculate(userId, calculateDto);
      discountAmount = discountResult.couponDiscount;
      discountedAmount = discountResult.finalAmount;
    }

    const shippingFee = await this.calculateShippingFee(
      subtotalAmount,
      dto.zipcode,
      shippingItemPolicies,
    );
    const totalPayable = discountedAmount + shippingFee;

    return {
      discountAmount,
      discountedAmount,
      shippingFee,
      totalPayable,
    };
  }

  private async applyCouponAndPoints(
    manager: EntityManager,
    userId: number,
    dto: CreateOrderDto,
    pointsToUse: number,
    savedOrder: Order,
  ): Promise<void> {
    if (dto.userCouponId) {
      await this.couponsService.useCoupon(dto.userCouponId, userId, Number(savedOrder.id), manager);
    }

    if (pointsToUse > 0) {
      await this.pointsService.deductFifo(
        manager,
        userId,
        pointsToUse,
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
