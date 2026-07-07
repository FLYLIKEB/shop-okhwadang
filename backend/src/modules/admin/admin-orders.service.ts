import {
  Injectable, BadRequestException,
  ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { restoreOrderStock } from '../orders/order-stock.util';
import { PaymentsService } from '../payments/payments.service';
import { MembershipService } from '../membership/membership.service';
import { PointsService } from '../points/points.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { assertOrderStatusTransition } from '../orders/policies/order-status-transition.policy';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationService } from '../notification/notification.service';
import { buildOrderEmailItems, buildOrderUrl } from '../notification/order-email-context';

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
    private readonly dataSource: DataSource,
    private readonly membershipService: MembershipService,
    private readonly pointsService: PointsService,
    private readonly notificationService: NotificationService,
    private readonly messageNotificationService: MessageNotificationService,
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
    const order = await findOrThrow(
      this.orderRepository,
      { id: orderId },
      '주문을 찾을 수 없습니다.',
      ['items', 'user'],
    );

    const currentStatus = order.status;
    assertOrderStatusTransition(currentStatus, nextStatus);

    if (nextStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException('주문 취소는 취소 사유를 입력하는 전용 취소 기능을 사용해주세요.');
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

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Order, orderId, { status: nextStatus });
      await this.syncShippingStatus(manager, orderId, nextStatus);

      if (this.shouldRestoreStockAndPoints(currentStatus, nextStatus)) {
        await this.restoreStock(manager, orderId);
        await this.restorePoints(manager, order);
      }
    });

    if (nextStatus === OrderStatus.DELIVERED) {
      void this.messageNotificationService?.sendShippingDelivered(orderId);
    }

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


  async cancelOrder(orderId: number, reason: string): Promise<Order | null> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new BadRequestException('취소 사유를 입력해주세요.');
    }

    await this.acquireOrderCancellationLock(orderId);
    let orderForNotification: Order;

    try {
      const order = await findOrThrow(
        this.orderRepository,
        { id: orderId },
        '주문을 찾을 수 없습니다.',
        ['items', 'user'],
      );

      const currentStatus = order.status;
      assertOrderStatusTransition(currentStatus, OrderStatus.CANCELLED);

      const payment = await this.paymentRepository.findOne({ where: { orderId }, relations: ['order'] });
      this.assertPaymentStateAllowsCancellation(currentStatus, payment);

      if (payment?.status === PaymentStatus.CONFIRMED) {
        await this.paymentsService.cancelPaidOrder(orderId, trimmedReason);
      } else {
        const cancelledAt = new Date();
        await this.dataSource.transaction(async (manager) => {
          const lockedOrder = await manager.findOne(Order, {
            where: { id: orderId },
            relations: ['user'],
            lock: { mode: 'pessimistic_write' },
          });

          if (!lockedOrder) {
            throw new BadRequestException('주문을 찾을 수 없습니다.');
          }

          assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);

          await manager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            cancelReason: trimmedReason,
            cancelledAt,
          });

          if (payment && payment.status === PaymentStatus.PENDING) {
            await manager.update(Payment, payment.id, {
              status: PaymentStatus.CANCELLED,
              cancelReason: trimmedReason,
              cancelledAt,
            });
          }

          if (this.shouldRestoreStockAndPoints(lockedOrder.status, OrderStatus.CANCELLED)) {
            await this.restoreStock(manager, orderId);
            await this.restorePoints(manager, lockedOrder);
          }
        });
      }

      this.logger.log(`Order #${orderId} cancelled by admin: ${currentStatus} → ${OrderStatus.CANCELLED}`);
      orderForNotification = order;
    } finally {
      await this.releaseOrderCancellationLock(orderId);
    }

    void this.sendCancellationNotifications(orderId, orderForNotification, trimmedReason);

    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
  }

  private assertPaymentStateAllowsCancellation(status: OrderStatus, payment: Payment | null): void {
    if (payment?.status === PaymentStatus.PARTIAL_CANCELLED) {
      throw new BadRequestException('부분 환불된 주문은 남은 결제 금액을 환불 처리한 뒤 취소해주세요.');
    }

    if ([OrderStatus.PAID, OrderStatus.PREPARING].includes(status)) {
      if (!payment) {
        throw new BadRequestException('결제 완료 주문의 결제 정보를 찾을 수 없습니다.');
      }

      if (payment.status !== PaymentStatus.CONFIRMED) {
        throw new BadRequestException('현재 결제 상태에서는 주문 취소를 진행할 수 없습니다.');
      }
    }
  }

  private async acquireOrderCancellationLock(orderId: number): Promise<void> {
    const lockName = this.orderCancellationLockName(orderId);
    const rows = await this.dataSource.query('SELECT GET_LOCK(?, 10) AS acquired', [lockName]) as Array<{ acquired?: number | string }>;
    const acquired = rows[0]?.acquired;
    if (Number(acquired) !== 1) {
      throw new ConflictException('주문 취소 처리가 이미 진행 중입니다. 잠시 후 다시 시도해주세요.');
    }
  }

  private async releaseOrderCancellationLock(orderId: number): Promise<void> {
    const lockName = this.orderCancellationLockName(orderId);
    try {
      await this.dataSource.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch (err) {
      this.logger.warn(`Failed to release order cancellation lock for order ${orderId}: ${String(err)}`);
    }
  }

  private orderCancellationLockName(orderId: number): string {
    return `admin-order-cancel:${orderId}`;
  }

  private async sendCancellationNotifications(orderId: number, order: Order, reason: string): Promise<void> {
    await Promise.all([
      this.notificationService.sendOrderCancelled(order.user?.email ?? '', {
        recipientName: order.recipientName,
        orderNumber: order.orderNumber,
        reason,
        orderItems: buildOrderEmailItems(order, 'ko'),
        orderUrl: buildOrderUrl(orderId, 'ko'),
      }),
      this.messageNotificationService.sendOrderCancelled(orderId, reason),
    ]).catch((err) => {
      this.logger.warn(`Failed to send cancellation notification for order ${orderId}: ${String(err)}`);
    });
  }

  private shouldRestoreStockAndPoints(currentStatus: OrderStatus, nextStatus: OrderStatus): boolean {
    const restoreTargets = new Set<OrderStatus>([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);
    return !restoreTargets.has(currentStatus) && restoreTargets.has(nextStatus);
  }

  private async syncShippingStatus(
    manager: EntityManager,
    orderId: number,
    nextStatus: OrderStatus,
  ): Promise<void> {
    if (nextStatus === OrderStatus.SHIPPED) {
      await manager.update(Shipping, { orderId }, {
        status: ShippingStatus.SHIPPED,
        shippedAt: new Date(),
      });
      return;
    }

    if (nextStatus === OrderStatus.DELIVERED) {
      await manager.update(Shipping, { orderId }, {
        status: ShippingStatus.DELIVERED,
        deliveredAt: new Date(),
      });
    }
  }

  /**
   * 재고 복구는 `restoreOrderStock` 유틸 (`orders/order-stock.util.ts`) 에 위임.
   * 정책 및 멱등성 설명은 유틸 docstring 참고.
   */
  private async restoreStock(manager: EntityManager, orderId: number): Promise<void> {
    await restoreOrderStock(manager, orderId);
  }

  private async restorePoints(manager: EntityManager, order: Order): Promise<void> {
    if (!order.pointsUsed || order.pointsUsed <= 0) {
      return;
    }

    const currentBalance = await this.pointsService.getRunningBalanceInTx(
      manager,
      order.userId,
    );
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
    void this.messageNotificationService?.sendShippingStarted(orderId);

    return this.shippingRepository.findOne({ where: { orderId } });
  }
}
