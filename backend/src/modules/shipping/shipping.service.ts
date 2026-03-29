import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { MockShippingAdapter } from './adapters/mock-shipping.adapter';
import { CarrierCode, TrackingResult } from './interfaces/shipping-provider.interface';
import { RegisterTrackingDto } from './dto/register-tracking.dto';
import { TrackShipmentDto } from './dto/track-shipment.dto';

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
  private readonly mockAdapter: MockShippingAdapter;

  constructor(
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    this.mockAdapter = new MockShippingAdapter();
  }

  async getByOrderId(orderId: number, userId: number) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'SHIPPING_NOT_FOUND' });
    if (Number(order.userId) !== Number(userId)) throw new ForbiddenException({ code: 'FORBIDDEN' });

    const shipping = await this.shippingRepository.findOne({ where: { orderId } });
    if (!shipping) throw new NotFoundException({ code: 'SHIPPING_NOT_FOUND' });

    let tracking: TrackingResult | null = null;
    if (shipping.trackingNumber) {
      try {
        tracking = await this.mockAdapter.getTrackingStatus(
          shipping.trackingNumber,
          shipping.carrier as CarrierCode,
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

  async track(dto: TrackShipmentDto) {
    try {
      const result = await this.mockAdapter.getTrackingStatus(dto.trackingNumber, dto.carrier);
      return {
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        status: result.status,
        steps: result.steps,
      };
    } catch {
      throw new BadRequestException({ code: 'CARRIER_API_ERROR' });
    }
  }

  async registerTracking(orderId: number, dto: RegisterTrackingDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND' });

    const shipping = await this.shippingRepository.findOne({ where: { orderId } });
    if (!shipping) throw new NotFoundException({ code: 'SHIPPING_NOT_FOUND' });

    this.validateTransition(shipping.status, ShippingStatus.PREPARING);

    await this.mockAdapter.registerTrackingNumber(String(orderId), dto.trackingNumber);

    await this.shippingRepository.update(shipping.id, {
      carrier: dto.carrier,
      trackingNumber: dto.trackingNumber,
      status: ShippingStatus.PREPARING,
    });

    await this.orderRepository.update(orderId, { status: OrderStatus.PREPARING });

    return this.shippingRepository.findOne({ where: { orderId } });
  }

  validateTransition(current: ShippingStatus, next: ShippingStatus): void {
    const allowed = ALLOWED_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException({ code: 'INVALID_STATUS_TRANSITION' });
    }
  }
}
