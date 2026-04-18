import {
  Injectable, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { PaymentsService } from '../payments/payments.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';

const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED, OrderStatus.REFUNDED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.REFUNDED],
  [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED, OrderStatus.REFUND_REQUESTED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.REFUND_REQUESTED]: [OrderStatus.REFUNDED],
  [OrderStatus.REFUNDED]: [],
};

@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    private readonly paymentsService: PaymentsService,
  ) {}

  async findAll(query: AdminOrderQueryDto): Promise<PaginatedResult<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query.keyword) {
      qb.andWhere(
        '(order.orderNumber LIKE :kw OR order.recipientName LIKE :kw OR user.email LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    if (query.startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('order.createdAt <= :endDate', { endDate: `${query.endDate} 23:59:59` });
    }

    return paginate(qb, { page, limit });
  }

  async updateStatus(orderId: number, nextStatus: OrderStatus): Promise<Order | null> {
    const order = await findOrThrow(this.orderRepository, { id: orderId }, '주문을 찾을 수 없습니다.');

    const currentStatus = order.status;
    const allowed = ALLOWED_ORDER_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `상태 전이가 허용되지 않습니다: ${currentStatus} → ${nextStatus}`,
      );
    }

    if (nextStatus === OrderStatus.SHIPPED) {
      const shipping = await this.shippingRepository.findOne({ where: { orderId } });
      if (!shipping || !shipping.trackingNumber) {
        throw new BadRequestException('운송장이 등록되지 않았습니다. 먼저 운송장을 등록해주세요.');
      }
    }

    if (nextStatus === OrderStatus.REFUNDED) {
      const payment = await this.paymentRepository.findOne({ where: { orderId } });
      if (payment) {
        await this.paymentsService.cancelAdmin(orderId, '관리자 환불 처리');
      }
    }

    await this.orderRepository.update(orderId, { status: nextStatus });

    this.logger.log(`Order #${orderId} status changed: ${currentStatus} → ${nextStatus}`);

    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
  }

  async registerShipping(orderId: number, dto: RegisterShippingDto): Promise<Shipping | null> {
    await findOrThrow(this.orderRepository, { id: orderId }, '주문을 찾을 수 없습니다.');

    const existing = await this.shippingRepository.findOne({ where: { orderId } });
    if (existing && existing.trackingNumber) {
      throw new ConflictException('이미 운송장이 등록되어 있습니다.');
    }

    if (existing) {
      await this.shippingRepository.update(existing.id, {
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        status: ShippingStatus.PREPARING,
      });
    } else {
      const shipping = this.shippingRepository.create({
        orderId,
        carrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
        status: ShippingStatus.PREPARING,
      });
      await this.shippingRepository.save(shipping);
    }

    this.logger.log(`Shipping registered for order #${orderId}: ${dto.carrier} ${dto.trackingNumber}`);

    return this.shippingRepository.findOne({ where: { orderId } });
  }
}
