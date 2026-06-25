import {
  Injectable, NotFoundException, BadRequestException, Logger, Optional,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { assertOwnership } from '../../common/utils/ownership.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { PointsService } from '../points/points.service';
import { NotificationService } from '../notification/notification.service';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { CouponsService } from '../coupons/coupons.service';
import { CalculateDiscountDto } from '../coupons/dto/calculate-discount.dto';
import { ShippingFeeCalculatorService } from '../shipping/services/shipping-fee-calculator.service';
import { OrderEventEmitter } from './order-event.emitter';
import {
  PolicyConsent,
  PolicyConsentContext,
  PolicyConsentSnapshot,
} from '../pages/entities/policy-consent.entity';
import { OrderCompletedEvent } from './events/order-completed.event';
import { applyLocale } from '../../common/utils/locale.util';

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

/**
 * 트랜잭션 내부에서 준비된, post-commit 후처리에 필요한 페이로드.
 * 트랜잭션 커밋 이후 알림/이벤트 디스패치 단계로 넘겨진다.
 */
interface OrderPostCommitPayload {
  savedOrder: Order;
  totalPayable: number;
  recipientName: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly pointsService: PointsService,
    private readonly notificationService: NotificationService,
    @Optional()
    private readonly messageNotificationService: MessageNotificationService | undefined,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    private readonly couponsService: CouponsService,
    private readonly shippingFeeCalculator: ShippingFeeCalculatorService,
    private readonly orderEventEmitter: OrderEventEmitter,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
    return `ORD-${date}-${random}`;
  }

  /**
   * 주문 생성 오케스트레이션.
   *
   * 단계:
   *   1) pre-flight 검증 (트랜잭션 외부에서 처리 가능한 입력 검증)
   *   2) 트랜잭션 블록 — 재고 차감, 가격 계산, 주문/아이템 저장, 쿠폰/포인트 사용, 카트 정리
   *   3) post-commit 후처리 — 이벤트 발행 / 알림 디스패치 (실패가 주문에 영향 주면 안 됨)
   *
   * DB write 순서는 절대 변경되지 않는다:
   *   - product/option stock UPDATE → order INSERT → coupon/point UPDATE → order_items INSERT → cart DELETE
   */
  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    this.assertCreatePayload(dto);

    const pointsToUse = dto.pointsUsed ?? 0;

    // --- 1) 트랜잭션 블록: 모든 DB write 는 이 안에서만 일어난다 ---
    const postCommit = await this.dataSource.transaction(async (manager) => {
      return this.runCreateOrderTransaction(manager, userId, dto, pointsToUse);
    });

    this.logger.log(
      `Order created: ${postCommit.savedOrder.orderNumber} userId=${userId}`,
    );

    // --- 2) post-commit side effects: 커밋 이후에만 실행되어야 함 ---
    await this.dispatchPostCommitEffects(userId, postCommit);

    return this.findOne(Number(postCommit.savedOrder.id), userId);
  }

  /**
   * 트랜잭션 외부에서 수행 가능한 입력 검증.
   */
  private assertCreatePayload(dto: CreateOrderDto): void {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('주문 항목이 없습니다.');
    }
  }

  /**
   * 트랜잭션 내부 로직의 전체 순서를 담당. DB write 순서를 보장하기 위해 의도적으로 순차 실행.
   */
  private async runCreateOrderTransaction(
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

    const savedOrder = await this.persistOrder(manager, userId, dto, pointsToUse, pricing);
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
   *  취소·환불 시 복구도 동일한 분기를 사용한다 (AdminOrdersService.restoreStock 참고).
   */
  private async validateAndReserveStock(
    manager: EntityManager,
    dto: CreateOrderDto,
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

        // 옵션 재고만 원장으로 차감. product.stock 은 건드리지 않는다.
        await manager.update(ProductOption, option.id, {
          stock: option.stock - item.quantity,
        });
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `재고가 부족합니다. (${product.name}: ${product.stock}개 남음)`,
          );
        }
        // 옵션이 없는 상품만 product.stock 을 원장으로 차감.
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

    const shippingQuote = await this.shippingFeeCalculator.calculate(
      subtotalAmount,
      dto.zipcode,
      shippingItemPolicies,
    );
    const shippingFee = shippingQuote.shippingFee;
    const totalPayable = discountedAmount + shippingFee;

    return {
      discountAmount,
      discountedAmount,
      shippingFee,
      totalPayable,
    };
  }

  private async persistOrder(
    manager: EntityManager,
    userId: number,
    dto: CreateOrderDto,
    pointsToUse: number,
    pricing: OrderPriceResult,
  ): Promise<Order> {
    const order = manager.create(Order, {
      userId,
      orderNumber: this.generateOrderNumber(),
      status: OrderStatus.PENDING,
      totalAmount: pricing.totalPayable,
      discountAmount: pricing.discountAmount,
      shippingFee: pricing.shippingFee,
      recipientName: dto.recipientName,
      recipientPhone: dto.recipientPhone,
      zipcode: dto.zipcode,
      address: dto.address,
      addressDetail: dto.addressDetail ?? null,
      memo: dto.memo ?? null,
      pointsUsed: pointsToUse,
    });
    return manager.save(Order, order);
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

  private async savePolicyConsent(
    manager: EntityManager,
    userId: number,
    savedOrder: Order,
    dto: CreateOrderDto,
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

  private async loadCurrentPolicySnapshots(manager: EntityManager): Promise<PolicyConsentSnapshot[]> {
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

  private async saveOrderItems(
    manager: EntityManager,
    orderItems: Partial<OrderItem>[],
    orderId: number,
  ): Promise<void> {
    const itemEntities = orderItems.map((item) =>
      manager.create(OrderItem, { ...item, orderId }),
    );
    await manager.save(OrderItem, itemEntities);
  }

  private async clearCartItems(
    manager: EntityManager,
    userId: number,
    dto: CreateOrderDto,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .delete()
      .from(CartItem)
      .where('userId = :userId', { userId })
      .andWhere('productId IN (:...productIds)', {
        productIds: dto.items.map((i) => i.productId),
      })
      .execute();
  }

  /**
   * 트랜잭션 커밋 이후 실행되어야 하는 side effect.
   * 여기서의 실패는 주문 자체를 롤백하지 않는다.
   */
  private async dispatchPostCommitEffects(
    userId: number,
    payload: OrderPostCommitPayload,
  ): Promise<void> {
    try {
      const { savedOrder, totalPayable, recipientName } = payload;

      const priorOrderCount = await this.orderRepository.count({ where: { userId } });
      const isFirstPurchase = priorOrderCount <= 1;
      this.orderEventEmitter.emitOrderCompleted(
        new OrderCompletedEvent(
          userId,
          Number(savedOrder.id),
          savedOrder.orderNumber,
          isFirstPurchase,
        ),
      );

      void this.notifyOrderCreated(
        userId,
        Number(savedOrder.id),
        savedOrder.orderNumber,
        totalPayable,
        recipientName,
      );
      void this.messageNotificationService?.sendOrderCreated(Number(savedOrder.id));
    } catch (err) {
      this.logger.error('주문 post-commit 처리 실패 (주문 자체는 이미 커밋됨)', err as Error);
    }
  }

  async findAll(
    userId: number,
    page = 1,
    limit = 10,
    locale?: string,
  ): Promise<PaginatedResult<Order>> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .loadRelationCountAndMap('order.itemCount', 'order.items')
      .where('order.userId = :userId', { userId })
      .orderBy('order.createdAt', 'DESC');

    const paged = await paginate(qb, { page, limit });
    return {
      ...paged,
      items: paged.items.map((order) => this.localizeOrder(order, locale)),
    };
  }

  async findOne(id: number, userId: number, locale?: string): Promise<Order> {
    const order = await this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.product', 'product')
      .leftJoinAndSelect('item.option', 'option')
      .where('order.id = :id', { id })
      .getOne();

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    assertOwnership(order.userId, userId);

    return this.localizeOrder(order, locale);
  }

  private localizeOrder(order: Order, locale?: string): Order {
    if (!locale || locale === 'ko') {
      return order;
    }

    const localizedItems = order.items?.map((item) => {
      const localizedProduct = item.product
        ? applyLocale(item.product, locale, ['name'])
        : item.product;
      const localizedOption = item.option
        ? applyLocale(item.option, locale, ['name', 'value'])
        : item.option;

      return {
        ...item,
        product: localizedProduct,
        option: localizedOption,
        productName: localizedProduct?.name || item.productName,
        optionName: localizedOption
          ? `${localizedOption.name}: ${localizedOption.value}`
          : item.optionName,
      };
    });

    return { ...order, items: localizedItems ?? [] };
  }

  private async notifyOrderCreated(
    userId: number,
    orderId: number,
    orderNumber: string,
    totalAmount: number,
    recipientName: string,
  ): Promise<void> {
    await this.notificationDispatchHelper.dispatch({
      event: 'order.confirmed',
      userId,
      resourceId: orderId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) =>
        this.notificationService.sendOrderConfirmed(recipient.email, {
          recipientName,
          orderNumber,
          totalAmount,
        }),
    });
  }
}
