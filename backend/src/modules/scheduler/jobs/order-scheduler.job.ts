import { DataSource, LessThan, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notification/notification.service';
import { SettingsService } from '../../settings/settings.service';
import { MembershipService } from '../../membership/membership.service';
import { canOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';
import { buildGuestOrderLookupUrl, buildOrderEmailItems, buildOrderUrl } from '../../notification/order-email-context';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { PointsService } from '../../points/points.service';
import { runFirstTerminalTransitionRecovery } from '../../payments/services/order-terminal-recovery.util';

interface OrderSchedulerJobDependencies {
  orderRepo: Repository<Order>;
  userRepo: Repository<User>;
  dataSource: DataSource;
  notificationService: NotificationService;
  settingsService: SettingsService;
  membershipService: MembershipService;
  pointsService: Pick<PointsService, 'getRunningBalanceInTx'>;
  logger: Logger;
}

export class OrderSchedulerJob {
  constructor(private readonly deps: OrderSchedulerJobDependencies) {}

  async handlePendingOrderCancellation(): Promise<void> {
    const intervalHours = await this.getSettingNumber('scheduler_pending_cancel_hours', 24);
    const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

    const pendingOrders = await this.deps.orderRepo.find({
      where: { status: OrderStatus.PENDING, createdAt: LessThan(cutoff) },
      relations: { items: true, user: true },
    });

    if (pendingOrders.length === 0) {
      this.deps.logger.debug('[cron:pending-order-cancel] No pending orders to cancel');
      return;
    }

    this.deps.logger.log(`[cron:pending-order-cancel] Cancelling ${pendingOrders.length} pending orders`);

    for (const order of pendingOrders) {
      await this.cancelOrderAndRecover(order);
    }

    this.deps.logger.log(`[cron:pending-order-cancel] Completed cancelling ${pendingOrders.length} orders`);
  }

  async handleDeliveredOrderAutoConfirm(): Promise<void> {
    const intervalDays = await this.getSettingNumber('scheduler_delivered_confirm_days', 7);
    const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);

    const deliveredOrders = await this.deps.orderRepo.find({
      where: { status: OrderStatus.DELIVERED, updatedAt: LessThan(cutoff) },
      relations: { user: true, items: true },
    });

    if (deliveredOrders.length === 0) {
      this.deps.logger.debug('[cron:delivered-order-confirm] No delivered orders to confirm');
      return;
    }

    this.deps.logger.log(`[cron:delivered-order-confirm] Confirming ${deliveredOrders.length} delivered orders`);

    for (const order of deliveredOrders) {
      if (!canOrderStatusTransition(order.status, OrderStatus.COMPLETED)) {
        this.deps.logger.warn(
          `[cron:delivered-order-confirm] transition blocked: ${order.status} → ${OrderStatus.COMPLETED} (order=${order.orderNumber})`,
        );
        continue;
      }

      await this.deps.orderRepo.update(order.id, { status: OrderStatus.COMPLETED });

      const userId = this.getOrderUserId(order);
      if (userId !== null) {
        const completedAmount = Number(order.totalAmount) - Number(order.discountAmount ?? 0);
        void this.deps.membershipService.incrementAccumulatedAmount(userId, completedAmount)
          .catch((err) => this.deps.logger.warn(`Failed to increment tier amount for user ${userId}: ${String(err)}`));
      }

      const email = order.user?.email ?? this.getGuestEmailNormalized(order);
      if (email) {
        const locale = this.getOrderLocale(order);
        void Promise.resolve(
          this.deps.notificationService.sendOrderConfirmed(email, {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            recipientName: order.recipientName,
            locale,
            orderItems: buildOrderEmailItems(order, locale),
            orderUrl: this.resolveOrderUrl(Number(order.id), order),
          }),
        )
          .catch((err) => this.deps.logger.warn(`Failed to send confirmation email: ${String(err)}`));
      }
    }

    this.deps.logger.log(`[cron:delivered-order-confirm] Completed confirming ${deliveredOrders.length} orders`);
  }

  private async cancelOrderAndRecover(order: Order): Promise<void> {
    const queryRunner = this.deps.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lockedOrder = await queryRunner.manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const lockedPayment = await queryRunner.manager.findOne(Payment, {
        where: { orderId: Number(order.id) },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        lockedOrder.status !== OrderStatus.PENDING
        || (lockedPayment && lockedPayment.status !== PaymentStatus.PENDING)
      ) {
        await queryRunner.rollbackTransaction();
        return;
      }

      const recovery = await runFirstTerminalTransitionRecovery(queryRunner.manager, {
        orderId: Number(order.id),
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService: this.deps.pointsService,
        pointRestoreDescription: `주문 ${order.orderNumber} 결제 미완료 자동 취소로 인한 적립금 복구`,
        applyMutations: async (recoveredOrder) => {
          if (recoveredOrder.status !== OrderStatus.PENDING) {
            return false;
          }

          if (lockedPayment) {
            await queryRunner.manager.update(Payment, lockedPayment.id, {
              status: PaymentStatus.CANCELLED,
              cancelledAt: new Date(),
              cancelReason: '결제 미완료 자동 취소',
            });
          }
          await queryRunner.manager.update(Order, recoveredOrder.id, { status: OrderStatus.CANCELLED });
          return true;
        },
      });

      if (!recovery.didMutate) {
        await queryRunner.rollbackTransaction();
        return;
      }

      await queryRunner.commitTransaction();

      const email = order.user?.email ?? this.getGuestEmailNormalized(order);
      if (email) {
        const locale = this.getOrderLocale(order);
        void Promise.resolve(
          this.deps.notificationService.sendOrderCancelled(email, {
            recipientName: order.recipientName,
            orderNumber: order.orderNumber,
            reason: '결제 미완료 자동 취소',
            locale,
            orderItems: buildOrderEmailItems(order, locale),
            orderUrl: this.resolveOrderUrl(Number(order.id), order),
          }),
        )
          .catch((err) => this.deps.logger.warn(`Failed to send cancellation email: ${String(err)}`));
      }

      this.deps.logger.log(`[cron:pending-order-cancel] Cancelled order ${order.orderNumber}`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      this.deps.logger.error(`[cron:pending-order-cancel] Failed to cancel order ${order.orderNumber}: ${String(err)}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async getSettingNumber(key: string, defaultValue: number): Promise<number> {
    try {
      const settings = await this.deps.settingsService.getMap();
      const value = settings[key];
      return value ? parseInt(value, 10) : defaultValue;
    } catch {
      return defaultValue;
    }
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
    return this.getOrderUserId(order) === null
      ? buildGuestOrderLookupUrl(locale)
      : buildOrderUrl(orderId, locale);
  }
}
