import {
  Injectable, BadRequestException,
  Logger, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { MockShippingAdapter } from './adapters/mock-shipping.adapter';
import { CjShippingAdapter } from './adapters/cj-shipping.adapter';
import {
  CarrierCode,
  ShippingProvider,
  TrackingResult,
} from './interfaces/shipping-provider.interface';
import { RegisterTrackingDto } from './dto/register-tracking.dto';
import { TrackShipmentDto } from './dto/track-shipment.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { assertOwnership } from '../../common/utils/ownership.util';
import { NotificationService } from '../notification/notification.service';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { ShippingFeeCalculatorService, ShippingFeeQuote } from './services/shipping-fee-calculator.service';
import { ShippingQuoteItemDto } from './dto/shipping-quote.dto';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { assertShippingStatusTransition } from './policies/shipping-status-transition.policy';
import { buildOrderEmailItems, buildOrderUrl } from '../notification/order-email-context';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly trackingCache = new Map<string, TrackingResult>();

  constructor(
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductOption)
    private readonly productOptionRepository: Repository<ProductOption>,
    private readonly notificationService: NotificationService,
    @Optional()
    private readonly messageNotificationService: MessageNotificationService | undefined,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    private readonly mockAdapter: MockShippingAdapter,
    private readonly cjAdapter: CjShippingAdapter,
    private readonly shippingFeeCalculator: ShippingFeeCalculatorService,
  ) {}

  async getByOrderId(orderId: number, userId: number): Promise<{
    id: number;
    order_id: number;
    carrier: string | null;
    tracking_number: string | null;
    status: ShippingStatus;
    shipped_at: Date | null;
    delivered_at: Date | null;
    tracking: TrackingResult | null;
  }> {
    const order = await findOrThrow(this.orderRepository, { id: orderId }, '배송 정보를 찾을 수 없습니다.');
    assertOwnership(order.userId, userId);

    const shipping = await findOrThrow(this.shippingRepository, { orderId }, '배송 정보를 찾을 수 없습니다.');
    const normalizedShipping = await this.syncShippingStatusFromOrder(order, shipping);

    let tracking: TrackingResult | null = null;
    if (normalizedShipping.trackingNumber) {
      try {
        tracking = await this.getTrackingWithStaleFallback(
          normalizedShipping.trackingNumber,
          (normalizedShipping.carrier as CarrierCode) ?? 'mock',
        );
      } catch (err) {
        this.logger.warn(`Carrier API error for orderId=${orderId}: ${String(err)}`);
      }
    }

    return {
      id: Number(shipping.id),
      order_id: orderId,
      carrier: shipping.carrier,
      tracking_number: normalizedShipping.trackingNumber,
      status: normalizedShipping.status,
      shipped_at: normalizedShipping.shippedAt,
      delivered_at: normalizedShipping.deliveredAt,
      tracking,
    };
  }

  async track(dto: TrackShipmentDto): Promise<{
    carrier: string;
    trackingNumber: string;
    status: string;
    steps: unknown[];
  }> {
    try {
      const result = await this.getTrackingWithStaleFallback(dto.trackingNumber, dto.carrier);
      return {
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        status: result.status,
        steps: result.steps,
      };
    } catch {
      throw new BadRequestException('배송 추적 중 오류가 발생했습니다.');
    }
  }

  async registerTracking(orderId: number, dto: RegisterTrackingDto): Promise<Shipping | null> {
    const order = await findOrThrow(this.orderRepository, { id: orderId }, '주문 정보를 찾을 수 없습니다.');

    const shipping = await findOrThrow(this.shippingRepository, { orderId }, '배송 정보를 찾을 수 없습니다.');

    this.validateTransition(shipping.status, ShippingStatus.PREPARING);

    const provider = this.resolveProvider(dto.carrier);
    await provider.registerTrackingNumber(String(orderId), dto.trackingNumber);

    await this.shippingRepository.update(shipping.id, {
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
      status: ShippingStatus.PREPARING,
    });

    await this.orderRepository.update(orderId, { status: OrderStatus.PREPARING });

    void this.notifyShippingUpdate(
      order.userId,
      orderId,
      order.orderNumber,
      order.recipientName,
      dto.carrier,
      dto.trackingNumber,
    );
    void this.messageNotificationService?.sendShippingStarted(orderId);

    return this.shippingRepository.findOne({ where: { orderId } });
  }

  async quote(
    subtotal: number,
    zipcode: string,
    items?: ShippingQuoteItemDto[],
  ): Promise<ShippingFeeQuote> {
    if (!items || items.length === 0) {
      return this.shippingFeeCalculator.calculate(subtotal, zipcode);
    }

    const quoteContext = await this.buildQuoteContext(items);
    return this.shippingFeeCalculator.calculate(
      quoteContext.subtotal,
      zipcode,
      quoteContext.itemPolicies,
    );
  }

  private async buildQuoteContext(items: ShippingQuoteItemDto[]): Promise<{
    subtotal: number;
    itemPolicies: { isFreeShipping: boolean }[];
  }> {
    const productIds = [...new Set(items.map((item) => item.productId))];
    const optionIds = [
      ...new Set(
        items
          .map((item) => item.productOptionId)
          .filter((id): id is number => id != null),
      ),
    ];

    const [products, options] = await Promise.all([
      this.productRepository.find({ where: { id: In(productIds) } }),
      optionIds.length > 0
        ? this.productOptionRepository.find({ where: { id: In(optionIds) } })
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map((product) => [Number(product.id), product]));
    const optionMap = new Map(options.map((option) => [Number(option.id), option]));

    let subtotal = 0;
    const itemPolicies: { isFreeShipping: boolean }[] = [];

    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      if (!product) {
        throw new BadRequestException('상품을 찾을 수 없습니다.');
      }

      let priceAdjustment = 0;
      if (item.productOptionId != null) {
        const option = optionMap.get(Number(item.productOptionId));
        if (!option || Number(option.productId) !== Number(item.productId)) {
          throw new BadRequestException('해당 상품의 옵션을 찾을 수 없습니다.');
        }
        priceAdjustment = Number(option.priceAdjustment);
      }

      const unitPrice = Number(product.salePrice ?? product.price) + priceAdjustment;
      subtotal += unitPrice * item.quantity;
      itemPolicies.push({ isFreeShipping: product.isFreeShipping });
    }

    return { subtotal, itemPolicies };
  }

  private async notifyShippingUpdate(
    userId: number,
    orderId: number,
    orderNumber: string,
    recipientName: string,
    carrier: string,
    trackingNumber: string,
  ): Promise<void> {
    const order = typeof this.orderRepository.findOne === 'function'
      ? await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      })
      : null;
    const locale = 'ko';

    await this.notificationDispatchHelper.dispatch({
      event: 'shipping.updated',
      userId,
      resourceId: orderId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) =>
        this.notificationService.sendShippingUpdate(recipient.email, {
          recipientName,
          orderNumber,
          carrier,
          trackingNumber,
          orderItems: buildOrderEmailItems(order, locale),
          orderUrl: buildOrderUrl(orderId, locale),
        }),
    });
  }

  validateTransition(current: ShippingStatus, next: ShippingStatus): void {
    assertShippingStatusTransition(current, next);
  }

  private async syncShippingStatusFromOrder(order: Order, shipping: Shipping): Promise<Shipping> {
    if (order.status === OrderStatus.SHIPPED && shipping.status === ShippingStatus.PREPARING) {
      const shippedAt = shipping.shippedAt ?? new Date();
      await this.shippingRepository.update(
        { id: shipping.id, status: ShippingStatus.PREPARING },
        { status: ShippingStatus.SHIPPED, shippedAt },
      );
      return { ...shipping, status: ShippingStatus.SHIPPED, shippedAt };
    }

    if (order.status === OrderStatus.DELIVERED && shipping.status !== ShippingStatus.DELIVERED) {
      const deliveredAt = shipping.deliveredAt ?? new Date();
      const shippedAt = shipping.shippedAt ?? deliveredAt;
      await this.shippingRepository.update(
        { id: shipping.id, status: shipping.status },
        { status: ShippingStatus.DELIVERED, shippedAt, deliveredAt },
      );
      void this.messageNotificationService?.sendShippingDelivered(Number(order.id));
      return { ...shipping, status: ShippingStatus.DELIVERED, shippedAt, deliveredAt };
    }

    return shipping;
  }

  private resolveProvider(carrier: CarrierCode): ShippingProvider {
    switch (carrier) {
      case 'cj':
        return this.cjAdapter;
      case 'hanjin':
      case 'lotte':
      case 'mock':
      default:
        return this.mockAdapter;
    }
  }

  private async getTrackingWithStaleFallback(
    trackingNumber: string,
    carrier: CarrierCode,
  ): Promise<TrackingResult> {
    const cacheKey = `${carrier}:${trackingNumber}`;
    const provider = this.resolveProvider(carrier);

    try {
      const result = await provider.getTrackingStatus(trackingNumber, carrier);
      this.trackingCache.set(cacheKey, result);
      return result;
    } catch (err) {
      const stale = this.trackingCache.get(cacheKey);
      if (stale) {
        this.logger.warn(
          `Carrier lookup failed; serving stale cache for ${cacheKey}: ${String(err)}`,
        );
        return stale;
      }

      throw err;
    }
  }
}
