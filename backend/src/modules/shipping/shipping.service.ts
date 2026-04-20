import {
  Injectable, BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
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
import { ShippingFeeCalculatorService, ShippingFeeQuote } from './services/shipping-fee-calculator.service';

const ALLOWED_TRANSITIONS: Record<ShippingStatus, ShippingStatus[]> = {
  [ShippingStatus.PAYMENT_CONFIRMED]: [ShippingStatus.PREPARING],
  [ShippingStatus.PREPARING]: [ShippingStatus.SHIPPED, ShippingStatus.FAILED],
  [ShippingStatus.SHIPPED]: [ShippingStatus.IN_TRANSIT, ShippingStatus.FAILED],
  [ShippingStatus.IN_TRANSIT]: [ShippingStatus.DELIVERED, ShippingStatus.FAILED],
  [ShippingStatus.DELIVERED]: [],
  [ShippingStatus.FAILED]: [],
};

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly trackingCache = new Map<string, TrackingResult>();

  constructor(
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
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

    let tracking: TrackingResult | null = null;
    if (shipping.trackingNumber) {
      try {
        tracking = await this.getTrackingWithStaleFallback(
          shipping.trackingNumber,
          (shipping.carrier as CarrierCode) ?? 'mock',
        );
      } catch (err) {
        this.logger.warn(`Carrier API error for orderId=${orderId}: ${String(err)}`);
      }
    }

    return {
      id: Number(shipping.id),
      order_id: orderId,
      carrier: shipping.carrier,
      tracking_number: shipping.trackingNumber,
      status: shipping.status,
      shipped_at: shipping.shippedAt,
      delivered_at: shipping.deliveredAt,
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
      order.orderNumber,
      order.recipientName,
      dto.carrier,
      dto.trackingNumber,
    );

    return this.shippingRepository.findOne({ where: { orderId } });
  }

  async quote(subtotal: number, zipcode: string): Promise<ShippingFeeQuote> {
    return this.shippingFeeCalculator.calculate(subtotal, zipcode);
  }

  private async notifyShippingUpdate(
    userId: number,
    orderNumber: string,
    recipientName: string,
    carrier: string,
    trackingNumber: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user?.email) return;
      await this.notificationService.sendShippingUpdate(user.email, {
        recipientName,
        orderNumber,
        carrier,
        trackingNumber,
      });
    } catch (err) {
      this.logger.warn(`Shipping update email failed: ${String(err)}`);
    }
  }

  validateTransition(current: ShippingStatus, next: ShippingStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException('유효하지 않은 배송 상태 변경입니다.');
    }
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
