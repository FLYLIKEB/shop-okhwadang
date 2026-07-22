import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { NotificationService } from '../notification/notification.service';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { buildGuestOrderLookupUrl, buildOrderEmailItems, buildOrderUrl } from '../notification/order-email-context';
import { OrderPostCommitPayload } from './order-creation.workflow.service';

@Injectable()
export class OrderPostCommitService {
  private readonly logger = new Logger(OrderPostCommitService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationService: NotificationService,
    @Optional()
    private readonly messageNotificationService: MessageNotificationService | undefined,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
  ) {}

  async dispatchOrderCreated(userId: number | null, payload: OrderPostCommitPayload): Promise<void> {
    try {
      const { savedOrder, totalPayable, recipientName } = payload;
      const orderUserId = userId ?? this.getOrderUserId(savedOrder);

      void this.notifyOrderCreated(
        orderUserId,
        savedOrder,
        Number(savedOrder.id),
        savedOrder.orderNumber,
        totalPayable,
        recipientName,
      ).catch((err) => this.logger.warn(`Failed to send order created email: ${String(err)}`));

      if (orderUserId !== null) {
        void this.messageNotificationService?.sendOrderCreated(Number(savedOrder.id));
      }
    } catch (err) {
      this.logger.error('주문 post-commit 처리 실패 (주문 자체는 이미 커밋됨)', err as Error);
    }
  }

  private async notifyOrderCreated(
    userId: number | null,
    orderSnapshot: Order,
    orderId: number,
    orderNumber: string,
    totalAmount: number,
    recipientName: string,
  ): Promise<void> {
    const order = typeof this.orderRepository.findOne === 'function'
      ? await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'user'],
      })
      : null;
    const notificationOrder = order ?? orderSnapshot;
    const locale = this.getOrderLocale(notificationOrder);
    const guestEmailNormalized = this.getGuestEmailNormalized(notificationOrder);
    const orderUrl = userId === null
      ? buildGuestOrderLookupUrl(locale)
      : buildOrderUrl(orderId, locale);

    if (userId === null && !guestEmailNormalized) {
      return;
    }

    await this.notificationDispatchHelper.dispatch({
      event: 'order.confirmed',
      ...(userId === null
        ? {
          recipient: {
            email: guestEmailNormalized!,
            name: recipientName,
          },
        }
        : { userId }),
      resourceId: orderId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) =>
        this.notificationService.sendOrderConfirmed(recipient.email, {
          recipientName,
          orderNumber,
          totalAmount,
          locale,
          orderItems: buildOrderEmailItems(notificationOrder, locale),
          orderUrl,
        }),
    });
  }

  private getOrderUserId(order: Order | null | undefined): number | null {
    const userId = (order as (Order & { userId?: number | null }) | null | undefined)?.userId;
    return userId == null ? null : Number(userId);
  }

  private getGuestEmailNormalized(order: Order | null | undefined): string | null {
    return (order as (Order & { guestEmailNormalized?: string | null }) | null | undefined)?.guestEmailNormalized ?? null;
  }

  private getOrderLocale(order: Order | null | undefined): 'ko' | 'en' {
    return (order as (Order & { orderLocale?: 'ko' | 'en' }) | null | undefined)?.orderLocale ?? 'ko';
  }
}
