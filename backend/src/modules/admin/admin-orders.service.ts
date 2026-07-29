import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryRunner, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../payments/entities/shipping.entity';
import { PaymentsService } from '../payments/payments.service';
import { runFirstTerminalTransitionRecovery } from '../payments/services/order-terminal-recovery.util';
import { MembershipService } from '../membership/membership.service';
import { PointsService } from '../points/points.service';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { RegisterShippingDto } from './dto/register-shipping.dto';
import { findOrThrow } from '../../common/utils/repository.util';
import { paginate, PaginatedResult } from '../../common/utils/pagination.util';
import { assertOrderStatusTransition } from '../orders/policies/order-status-transition.policy';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationService } from '../notification/notification.service';
import {
  buildGuestOrderLookupUrl,
  buildOrderEmailItems,
  buildOrderUrl,
} from '../notification/order-email-context';

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
        '(order.orderNumber LIKE :kw OR order.recipientName LIKE :kw OR user.email LIKE :kw OR order.guest_email_normalized LIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    if (query.startDate) {
      qb.andWhere('order.createdAt >= :startDate', { startDate: query.startDate });
    }

    if (query.endDate) {
      qb.andWhere('order.createdAt <= :endDate', { endDate: `${query.endDate} 23:59:59` });
    }

    const result = await paginate(qb, { page, limit });
    return {
      ...result,
      items: result.items.map((order) => this.decorateOrder(order)),
    };
  }

  async updateStatus(orderId: number, nextStatus: OrderStatus): Promise<Order | null> {
    const order = await findOrThrow(
      this.orderRepository,
      { id: orderId },
      '주문을 찾을 수 없습니다.',
      ['items', 'user'],
    );

    const currentStatus = order.status;
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: ['order'],
    });
    const isCancelledConfirmationRecovery =
      currentStatus === OrderStatus.CANCELLED &&
      nextStatus === OrderStatus.REFUNDED &&
      this.isGatewayConfirmationReconciliation(payment);
    if (!isCancelledConfirmationRecovery) {
      assertOrderStatusTransition(currentStatus, nextStatus);
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        '주문 취소는 취소 사유를 입력하는 전용 취소 기능을 사용해주세요.',
      );
    }

    if (nextStatus === OrderStatus.SHIPPED) {
      const shipping = await this.shippingRepository.findOne({ where: { orderId } });
      if (!shipping || !shipping.trackingNumber) {
        throw new BadRequestException('운송장이 등록되지 않았습니다. 먼저 운송장을 등록해주세요.');
      }
    }

    const applyStatusMutation = async (manager: EntityManager): Promise<void> => {
      if (this.shouldRestoreStockAndPoints(currentStatus, nextStatus)) {
        const recovery = await runFirstTerminalTransitionRecovery(manager, {
          orderId,
          nextOrderStatus: nextStatus,
          pointsService: this.pointsService,
          pointRestoreDescription: `주문 ${order.orderNumber} 취소/환불로 인한 적립금 복구`,
          applyMutations: async (lockedOrder) => {
            if (!isCancelledConfirmationRecovery) {
              assertOrderStatusTransition(lockedOrder.status, nextStatus);
            }
            await manager.update(Order, orderId, { status: nextStatus });
            await this.syncShippingStatus(manager, orderId, nextStatus);
            return true;
          },
        });

        if (!recovery.lockedOrder) {
          throw new BadRequestException('주문을 찾을 수 없습니다.');
        }
        if (!recovery.didMutate) {
          throw new BadRequestException('결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
        }
        return;
      }

      await manager.update(Order, orderId, { status: nextStatus });
      await this.syncShippingStatus(manager, orderId, nextStatus);
    };

    if (nextStatus === OrderStatus.PAID && this.isGatewayConfirmationReconciliation(payment)) {
      await this.paymentsService.reconcileConfirmedPayment(orderId);
    } else if (nextStatus === OrderStatus.REFUNDED) {
      if (payment && this.isGatewayRefundReconciliation(payment)) {
        await this.dataSource.transaction(applyStatusMutation);
      } else if (payment && (this.isGatewayRefundAmbiguous(payment) || this.isGatewayCancellationAmbiguous(payment))) {
        throw new ConflictException('결제 취소 상태 확인이 필요합니다. 수동 확인 후 다시 시도해주세요.');
      } else if (payment) {
        await this.paymentsService.cancelAdmin(orderId, '관리자 환불 처리', async (manager) => {
          await applyStatusMutation(manager);
        });
      } else {
        await this.dataSource.transaction(applyStatusMutation);
      }
    } else {
      await this.dataSource.transaction(applyStatusMutation);
    }

    if (nextStatus === OrderStatus.DELIVERED) {
      if (this.isGuestOrder(order)) {
        void this.sendDeliveredNotification(orderId, order);
      } else {
        void this.messageNotificationService?.sendShippingDelivered(orderId);
      }
    }

    if (nextStatus === OrderStatus.COMPLETED) {
      const userId = this.getOrderUserId(order);
      if (userId !== null) {
        const completedAmount = Number(order.totalAmount) - Number(order.discountAmount ?? 0);
        void this.membershipService
          .incrementAccumulatedAmount(userId, completedAmount)
          .catch((err) =>
            this.logger.warn(`Failed to increment tier amount for user ${userId}: ${String(err)}`),
          );
      }
    }
    this.logger.log(`Order #${orderId} status changed: ${currentStatus} → ${nextStatus}`);

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    return updatedOrder ? this.decorateOrder(updatedOrder) : null;
  }

  async cancelOrder(orderId: number, reason: string): Promise<Order | null> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new BadRequestException('취소 사유를 입력해주세요.');
    }

    const cancellationLockRunner = await this.acquireOrderCancellationLock(orderId);
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

      let shouldGatewayCancel = false;
      await this.dataSource.transaction(async (manager) => {
        const lockedOrder = await manager.findOne(Order, {
          where: { id: orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedOrder) {
          throw new BadRequestException('주문을 찾을 수 없습니다.');
        }

        const lockedPayment = await manager.findOne(Payment, {
          where: { orderId },
          relations: ['order'],
          lock: { mode: 'pessimistic_write' },
        });
        this.assertPaymentStateAllowsCancellation(lockedOrder.status, lockedPayment);
        assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);

        if (lockedPayment?.status === PaymentStatus.CONFIRMED) {
          shouldGatewayCancel = true;
          return;
        }

        const cancelledAt = lockedPayment?.cancelledAt ?? new Date();
        const recovery = await runFirstTerminalTransitionRecovery(manager, {
          orderId,
          nextOrderStatus: OrderStatus.CANCELLED,
          pointsService: this.pointsService,
          pointRestoreDescription: `주문 ${order.orderNumber} 취소/환불로 인한 적립금 복구`,
          applyMutations: async (recoveryOrder) => {
            const canCancelLocally =
              recoveryOrder.status === OrderStatus.PENDING ||
              this.isGatewayCancellationReconciliation(lockedPayment);
            if (!canCancelLocally) {
              return false;
            }

            assertOrderStatusTransition(recoveryOrder.status, OrderStatus.CANCELLED);
            await manager.update(Order, orderId, {
              status: OrderStatus.CANCELLED,
              cancelReason: trimmedReason,
              cancelledAt,
            });

            if (lockedPayment && lockedPayment.status === PaymentStatus.PENDING) {
              await manager.update(Payment, lockedPayment.id, {
                status: PaymentStatus.CANCELLED,
                cancelReason: trimmedReason,
                cancelledAt,
              });
            }

            return true;
          },
        });

        if (!recovery.lockedOrder) {
          throw new BadRequestException('주문을 찾을 수 없습니다.');
        }
        if (!recovery.didMutate) {
          throw new BadRequestException(
            '결제 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.',
          );
        }
      });

      if (shouldGatewayCancel) {
        await this.paymentsService.cancelPaidOrder(orderId, trimmedReason);
      }

      this.logger.log(
        `Order #${orderId} cancelled by admin: ${currentStatus} → ${OrderStatus.CANCELLED}`,
      );
      orderForNotification = order;
    } finally {
      await this.releaseOrderCancellationLock(cancellationLockRunner, orderId);
    }

    void this.sendCancellationNotifications(orderId, orderForNotification, trimmedReason);

    const updatedOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    return updatedOrder ? this.decorateOrder(updatedOrder) : null;
  }

  private assertPaymentStateAllowsCancellation(status: OrderStatus, payment: Payment | null): void {
    if (payment?.status === PaymentStatus.PARTIAL_CANCELLED) {
      throw new BadRequestException(
        '부분 환불된 주문은 남은 결제 금액을 환불 처리한 뒤 취소해주세요.',
      );
    }

    if (this.isGatewayCancellationAmbiguous(payment) || this.isGatewayRefundAmbiguous(payment)) {
      throw new BadRequestException('결제 취소 상태 확인이 필요합니다. 수동 확인 후 다시 시도해주세요.');
    }

    if ([OrderStatus.PAID, OrderStatus.PREPARING].includes(status)) {
      if (!payment) {
        throw new BadRequestException('결제 완료 주문의 결제 정보를 찾을 수 없습니다.');
      }

      if (
        payment.status !== PaymentStatus.CONFIRMED &&
        !this.isGatewayCancellationReconciliation(payment)
      ) {
        throw new BadRequestException('현재 결제 상태에서는 주문 취소를 진행할 수 없습니다.');
      }
    }
  }

  private isGatewayConfirmationReconciliation(payment: Payment | null): boolean {
    return (
      payment?.status === PaymentStatus.CONFIRMED &&
      (this.hasGatewayReconciliationMarker(payment, 'gatewayConfirmationSucceeded') ||
        this.hasGatewayReconciliationMarker(payment, 'gatewayConfirmationDuplicateLike'))
    );
  }

  private isGatewayCancellationReconciliation(payment: Payment | null): boolean {
    return (
      payment?.status === PaymentStatus.CANCELLED &&
      this.hasGatewayReconciliationMarker(payment, 'gatewayCancellationSucceeded')
    );
  }

  private isGatewayRefundReconciliation(payment: Payment | null): boolean {
    return (
      payment?.status === PaymentStatus.REFUNDED &&
      this.hasGatewayReconciliationMarker(payment, 'gatewayRefundSucceeded')
    );
  }

  private isGatewayCancellationAmbiguous(payment: Payment | null): boolean {
    return (
      payment?.status === PaymentStatus.CONFIRMED &&
      this.hasGatewayReconciliationMarker(payment, 'gatewayCancellationAmbiguous')
    );
  }

  private isGatewayRefundAmbiguous(payment: Payment | null): boolean {
    return (
      payment?.status === PaymentStatus.CONFIRMED &&
      this.hasGatewayReconciliationMarker(payment, 'gatewayRefundAmbiguous')
    );
  }

  private hasGatewayReconciliationMarker(
    payment: Payment | null,
    marker:
      | 'gatewayConfirmationSucceeded'
      | 'gatewayConfirmationDuplicateLike'
      | 'gatewayCancellationSucceeded'
      | 'gatewayRefundSucceeded'
      | 'gatewayCancellationAmbiguous'
      | 'gatewayRefundAmbiguous',
  ): boolean {
    if (
      !payment ||
      typeof payment.rawResponse !== 'object' ||
      payment.rawResponse === null ||
      Array.isArray(payment.rawResponse)
    ) {
      return false;
    }

    const rawResponse = payment.rawResponse as Record<string, unknown>;
    return rawResponse.reconciliationRequired === true && rawResponse[marker] === true;
  }

  private async acquireOrderCancellationLock(orderId: number): Promise<QueryRunner> {
    const lockName = this.orderCancellationLockName(orderId);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const rows = (await queryRunner.query('SELECT GET_LOCK(?, 10) AS acquired', [
        lockName,
      ])) as Array<{ acquired?: number | string }>;
      const acquired = rows[0]?.acquired;
      if (Number(acquired) !== 1) {
        throw new ConflictException(
          '주문 취소 처리가 이미 진행 중입니다. 잠시 후 다시 시도해주세요.',
        );
      }
      return queryRunner;
    } catch (err) {
      await queryRunner.release().catch(() => undefined);
      throw err;
    }
  }

  private async releaseOrderCancellationLock(
    queryRunner: QueryRunner,
    orderId: number,
  ): Promise<void> {
    const lockName = this.orderCancellationLockName(orderId);
    try {
      await queryRunner.query('SELECT RELEASE_LOCK(?)', [lockName]);
    } catch (err) {
      this.logger.warn(
        `Failed to release order cancellation lock for order ${orderId}: ${String(err)}`,
      );
    } finally {
      await queryRunner.release().catch((err) => {
        this.logger.warn(
          `Failed to release order cancellation query runner for order ${orderId}: ${String(err)}`,
        );
      });
    }
  }

  private orderCancellationLockName(orderId: number): string {
    return `admin-order-cancel:${orderId}`;
  }

  private async sendCancellationNotifications(
    orderId: number,
    order: Order,
    reason: string,
  ): Promise<void> {
    const locale = this.getOrderLocale(order);
    const email = order.user?.email ?? this.getGuestEmailNormalized(order);

    if (!email) {
      return;
    }

    await Promise.all([
      this.notificationService.sendOrderCancelled(email, {
        recipientName: order.recipientName,
        orderNumber: order.orderNumber,
        reason,
        locale,
        orderItems: buildOrderEmailItems(order, locale),
        orderUrl: this.resolveOrderUrl(orderId, order),
      }),
      ...(this.isGuestOrder(order)
        ? []
        : [this.messageNotificationService.sendOrderCancelled(orderId, reason)]),
    ]).catch((err) => {
      this.logger.warn(
        `Failed to send cancellation notification for order ${orderId}: ${String(err)}`,
      );
    });
  }

  private shouldRestoreStockAndPoints(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): boolean {
    const restoreTargets = new Set<OrderStatus>([OrderStatus.CANCELLED, OrderStatus.REFUNDED]);
    return !restoreTargets.has(currentStatus) && restoreTargets.has(nextStatus);
  }

  private async syncShippingStatus(
    manager: EntityManager,
    orderId: number,
    nextStatus: OrderStatus,
  ): Promise<void> {
    if (nextStatus === OrderStatus.SHIPPED) {
      await manager.update(
        Shipping,
        { orderId },
        {
          status: ShippingStatus.SHIPPED,
          shippedAt: new Date(),
        },
      );
      return;
    }

    if (nextStatus === OrderStatus.DELIVERED) {
      await manager.update(
        Shipping,
        { orderId },
        {
          status: ShippingStatus.DELIVERED,
          deliveredAt: new Date(),
        },
      );
    }
  }

  async registerShipping(orderId: number, dto: RegisterShippingDto): Promise<Shipping | null> {
    const order = await findOrThrow(
      this.orderRepository,
      { id: orderId },
      '주문을 찾을 수 없습니다.',
      ['items', 'user'],
    );

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

    this.logger.log(
      `Shipping registered for order #${orderId}: ${dto.carrier} ${dto.trackingNumber}`,
    );
    void this.sendShippingStartedNotification(orderId, order, dto.carrier, dto.trackingNumber);

    return this.shippingRepository.findOne({ where: { orderId } });
  }

  private decorateOrder(order: Order): Order {
    const customerType = this.isGuestOrder(order) ? 'guest' : 'member';
    return Object.assign(order, {
      customerType,
      guestEmailNormalized: this.getGuestEmailNormalized(order),
      user: customerType === 'guest' ? null : (order.user ?? null),
    });
  }

  private async sendDeliveredNotification(orderId: number, order: Order): Promise<void> {
    const shipping = await this.shippingRepository.findOne({ where: { orderId } });
    const email = this.getGuestEmailNormalized(order);
    const locale = this.getOrderLocale(order);

    if (!email || !shipping?.trackingNumber) {
      return;
    }

    await this.notificationService.sendShippingUpdate(email, {
      recipientName: order.recipientName,
      orderNumber: order.orderNumber,
      carrier: shipping.carrier ?? 'unknown',
      trackingNumber: shipping.trackingNumber,
      locale,
      orderItems: buildOrderEmailItems(order, locale),
      orderUrl: buildGuestOrderLookupUrl(locale),
    });
  }

  private async sendShippingStartedNotification(
    orderId: number,
    order: Order,
    carrier: string,
    trackingNumber: string,
  ): Promise<void> {
    if (this.isGuestOrder(order)) {
      const email = this.getGuestEmailNormalized(order);
      const locale = this.getOrderLocale(order);
      if (!email) {
        return;
      }

      await this.notificationService.sendShippingUpdate(email, {
        recipientName: order.recipientName,
        orderNumber: order.orderNumber,
        carrier,
        trackingNumber,
        locale,
        orderItems: buildOrderEmailItems(order, locale),
        orderUrl: buildGuestOrderLookupUrl(locale),
      });
      return;
    }

    void this.messageNotificationService?.sendShippingStarted(orderId);
  }

  private isGuestOrder(order: Order): boolean {
    return this.getOrderUserId(order) === null;
  }

  private getOrderUserId(order: Order): number | null {
    const userId = (order as Order & { userId?: number | null }).userId;
    return userId == null ? null : Number(userId);
  }

  private getGuestEmailNormalized(order: Order): string | null {
    return (order as Order & { guestEmailNormalized?: string | null }).guestEmailNormalized ?? null;
  }

  private getOrderLocale(order: Order): 'ko' | 'en' {
    return (order as Order & { orderLocale?: 'ko' | 'en' }).orderLocale ?? 'ko';
  }

  private resolveOrderUrl(orderId: number, order: Order): string | undefined {
    const locale = this.getOrderLocale(order);
    return this.isGuestOrder(order)
      ? buildGuestOrderLookupUrl(locale)
      : buildOrderUrl(orderId, locale);
  }
}
