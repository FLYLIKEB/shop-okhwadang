import {
  Injectable, BadRequestException,
  ConflictException, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { Product } from '../products/entities/product.entity';
import { ProductOption } from '../products/entities/product-option.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PaymentsService } from '../payments/payments.service';
import { MembershipService } from '../membership/membership.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { assertOrderStatusTransition } from '../orders/policies/order-status-transition.policy';

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
    private readonly membershipService: MembershipService,
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
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    const currentStatus = order.status;
    assertOrderStatusTransition(currentStatus, nextStatus);

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

    await this.orderRepository.manager.transaction(async (manager) => {
      if (this.shouldRestoreStockAndPoints(currentStatus, nextStatus)) {
        await this.restoreStock(manager, order);
        await this.restorePoints(manager, order);
      }
    });

    await this.orderRepository.update(orderId, { status: nextStatus });

    if (nextStatus === OrderStatus.COMPLETED) {
      const completedAmount = Number(order.totalAmount) - Number(order.discountAmount ?? 0);
      void this.membershipService.incrementAccumulatedAmount(order.userId, completedAmount)
        .catch((err) => this.logger.warn(`Failed to increment tier amount for user ${order.userId}: ${String(err)}`));
    }

    this.logger.log(`Order #${orderId} status changed: ${currentStatus} → ${nextStatus}`);

    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
  }

  private shouldRestoreStockAndPoints(currentStatus: OrderStatus, nextStatus: OrderStatus): boolean {
    const restoreTargets = new Set<OrderStatus>([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);
    return !restoreTargets.has(currentStatus) && restoreTargets.has(nextStatus);
  }

  private async restoreStock(manager: EntityManager, order: Order): Promise<void> {
    for (const item of order.items ?? []) {
      await manager.increment(Product, { id: item.productId }, 'stock', item.quantity);
      if (item.productOptionId) {
        await manager.increment(ProductOption, { id: item.productOptionId }, 'stock', item.quantity);
      }
    }
  }

  private async restorePoints(manager: EntityManager, order: Order): Promise<void> {
    if (!order.pointsUsed || order.pointsUsed <= 0) {
      return;
    }

    const latest = await manager.findOne(PointHistory, {
      where: { userId: order.userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const currentBalance = latest?.balance ?? 0;
    const restoredBalance = currentBalance + order.pointsUsed;

    await manager.save(PointHistory, {
      userId: order.userId,
      type: 'admin_adjust',
      amount: order.pointsUsed,
      balance: restoredBalance,
      orderId: Number(order.id),
      description: `주문 ${order.orderNumber} 취소/환불로 인한 적립금 복구`,
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
