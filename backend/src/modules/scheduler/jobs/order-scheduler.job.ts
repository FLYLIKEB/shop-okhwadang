import { DataSource, LessThan, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';
import { User } from '../../users/entities/user.entity';
import { NotificationService } from '../../notification/notification.service';
import { SettingsService } from '../../settings/settings.service';
import { MembershipService } from '../../membership/membership.service';
import { canOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';

interface OrderSchedulerJobDependencies {
  orderRepo: Repository<Order>;
  userRepo: Repository<User>;
  dataSource: DataSource;
  notificationService: NotificationService;
  settingsService: SettingsService;
  membershipService: MembershipService;
  logger: Logger;
}

export class OrderSchedulerJob {
  constructor(private readonly deps: OrderSchedulerJobDependencies) {}

  async handlePendingOrderCancellation(): Promise<void> {
    const intervalHours = await this.getSettingNumber('scheduler_pending_cancel_hours', 24);
    const cutoff = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

    const pendingOrders = await this.deps.orderRepo.find({
      where: { status: OrderStatus.PENDING, createdAt: LessThan(cutoff) },
      relations: { items: true },
    });

    if (pendingOrders.length === 0) {
      this.deps.logger.debug('[cron:pending-order-cancel] No pending orders to cancel');
      return;
    }

    this.deps.logger.log(`[cron:pending-order-cancel] Cancelling ${pendingOrders.length} pending orders`);

    for (const order of pendingOrders) {
      await this.cancelOrderAndRestoreStock(order);
    }

    this.deps.logger.log(`[cron:pending-order-cancel] Completed cancelling ${pendingOrders.length} orders`);
  }

  async handleDeliveredOrderAutoConfirm(): Promise<void> {
    const intervalDays = await this.getSettingNumber('scheduler_delivered_confirm_days', 7);
    const cutoff = new Date(Date.now() - intervalDays * 24 * 60 * 60 * 1000);

    const deliveredOrders = await this.deps.orderRepo.find({
      where: { status: OrderStatus.DELIVERED, updatedAt: LessThan(cutoff) },
      relations: { user: true },
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

      const completedAmount = Number(order.totalAmount) - Number(order.discountAmount ?? 0);
      void this.deps.membershipService.incrementAccumulatedAmount(order.userId, completedAmount)
        .catch((err) => this.deps.logger.warn(`Failed to increment tier amount for user ${order.userId}: ${String(err)}`));

      if (order.user?.email) {
        void Promise.resolve(
          this.deps.notificationService.sendOrderConfirmed(order.user.email, {
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount,
            recipientName: order.recipientName,
          }),
        )
          .catch((err) => this.deps.logger.warn(`Failed to send confirmation email: ${String(err)}`));
      }
    }

    this.deps.logger.log(`[cron:delivered-order-confirm] Completed confirming ${deliveredOrders.length} orders`);
  }

  private async cancelOrderAndRestoreStock(order: Order): Promise<void> {
    if (!canOrderStatusTransition(order.status, OrderStatus.CANCELLED)) {
      this.deps.logger.warn(
        `[cron:pending-order-cancel] transition blocked: ${order.status} → ${OrderStatus.CANCELLED} (order=${order.orderNumber})`,
      );
      return;
    }

    const queryRunner = this.deps.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of order.items) {
        if (item.productOptionId) {
          await queryRunner.manager.increment(
            ProductOption,
            { id: item.productOptionId },
            'stock',
            item.quantity,
          );
        } else {
          await queryRunner.manager.increment(
            Product,
            { id: item.productId },
            'stock',
            item.quantity,
          );
        }
      }

      await queryRunner.manager.update(Order, order.id, { status: OrderStatus.CANCELLED });

      await queryRunner.commitTransaction();

      const user = await this.deps.userRepo.findOne({ where: { id: order.userId } });
      if (user?.email) {
        void Promise.resolve(
          this.deps.notificationService.sendEmail({
            to: user.email,
            subject: `[옥화당] 주문 자동 취소 안내`,
            text: `안녕하세요. 고객님의 주문(${order.orderNumber})이 결제 미완료로 자동 취소되었습니다.`,
            html: `<p>안녕하세요.</p><p>고객님의 주문(<strong>${order.orderNumber}</strong>)이 결제 미완료로 자동 취소되었습니다.</p>`,
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
}
