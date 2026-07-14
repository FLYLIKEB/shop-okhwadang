import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { NotificationService } from '../notification/notification.service';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { buildOrderEmailItems, buildOrderUrl } from '../notification/order-email-context';
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

  async dispatchOrderCreated(userId: number, payload: OrderPostCommitPayload): Promise<void> {
    try {
      const { savedOrder, totalPayable, recipientName } = payload;

      void this.notifyOrderCreated(
        userId,
        Number(savedOrder.id),
        savedOrder.orderNumber,
        totalPayable,
        recipientName,
      ).catch((err) => this.logger.warn(`Failed to send order created email: ${String(err)}`));
      void this.messageNotificationService?.sendOrderCreated(Number(savedOrder.id));
    } catch (err) {
      this.logger.error('주문 post-commit 처리 실패 (주문 자체는 이미 커밋됨)', err as Error);
    }
  }

  private async notifyOrderCreated(
    userId: number,
    orderId: number,
    orderNumber: string,
    totalAmount: number,
    recipientName: string,
  ): Promise<void> {
    const order = typeof this.orderRepository.findOne === 'function'
      ? await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items'],
      })
      : null;
    const locale = 'ko';

    await this.notificationDispatchHelper.dispatch({
      event: 'order.confirmed',
      userId,
      resourceId: orderId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send: (recipient) =>
        this.notificationService.sendOrderConfirmed(recipient.email, {
          recipientName,
          orderNumber,
          totalAmount,
          orderItems: buildOrderEmailItems(order, locale),
          orderUrl: buildOrderUrl(orderId, locale),
        }),
    });
  }
}
