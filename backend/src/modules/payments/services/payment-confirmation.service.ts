import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { Payment, PaymentMethod, PaymentStatus, PaymentGatewayType } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { assertOwnership } from '../../../common/utils/ownership.util';
import { findOrThrow } from '../../../common/utils/repository.util';

type ResolveGatewayByType = (gatewayType: PaymentGatewayType) => PaymentGateway;

interface PaymentConfirmationDependencies {
  paymentRepository: Repository<Payment>;
  orderRepository: Repository<Order>;
  shippingRepository: Repository<Shipping>;
  dataSource: DataSource;
  notificationService: NotificationService;
  notificationDispatchHelper: NotificationDispatchHelper;
  resolveGatewayByType: ResolveGatewayByType;
  logger: Logger;
  defaultCarrier: string;
}

export class PaymentConfirmationService {
  constructor(private readonly deps: PaymentConfirmationDependencies) {}

  async confirm(
    dto: ConfirmPaymentDto,
    userId: number,
  ): Promise<{
    paymentId: number;
    orderId: number;
    orderNumber: string;
    status: PaymentStatus;
    method: string;
    amount: number;
    paidAt: Date;
  }> {
    const payment = await findOrThrow(
      this.deps.paymentRepository,
      { orderId: dto.orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    assertOwnership(payment.order.userId, userId);

    if (payment.status === PaymentStatus.CONFIRMED) {
      throw new ConflictException('이미 승인된 결제입니다.');
    }
    if (payment.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('결제 승인이 불가능한 상태입니다.');
    }

    if (Number(payment.order.totalAmount) !== Number(dto.amount)) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }

    try {
      const confirmGateway = this.deps.resolveGatewayByType(payment.gateway);
      const result = await confirmGateway.confirm(
        dto.paymentKey,
        Number(payment.amount),
        payment.order.orderNumber,
      );

      await this.deps.dataSource.transaction(async (manager) => {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.CONFIRMED,
          paymentKey: dto.paymentKey,
          method: result.method as PaymentMethod,
          paidAt: new Date(),
          rawResponse: result.rawResponse as object,
        });

        await manager.update(Order, dto.orderId, { status: OrderStatus.PAID });

        const existing = await manager.findOne(Shipping, { where: { orderId: dto.orderId } });
        if (!existing) {
          await manager.save(Shipping, {
            orderId: dto.orderId,
            carrier: this.deps.defaultCarrier,
            status: ShippingStatus.PAYMENT_CONFIRMED,
          });
        }
      });

      this.deps.logger.log(`Payment confirmed: orderId=${dto.orderId}`);

      void this.notifyPaymentConfirmed(
        payment.order.userId,
        dto.orderId,
        payment.order.orderNumber,
        payment.order.recipientName,
        Number(payment.amount),
        result.method,
      );

      return {
        paymentId: Number(payment.id),
        orderId: dto.orderId,
        orderNumber: payment.order.orderNumber,
        status: PaymentStatus.CONFIRMED,
        method: result.method,
        amount: Number(payment.amount),
        paidAt: new Date(),
      };
    } catch (err) {
      await this.deps.paymentRepository.update(payment.id, { status: PaymentStatus.FAILED });
      if (err instanceof ConflictException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('결제 승인에 실패했습니다.');
    }
  }

  private async notifyPaymentConfirmed(
    userId: number,
    orderId: number,
    orderNumber: string,
    recipientName: string,
    amount: number,
    method: string,
  ): Promise<void> {
    await this.deps.notificationDispatchHelper.dispatch({
      event: 'payment.confirmed',
      userId,
      resourceId: orderId,
      mode: 'fire-and-forget',
      logger: this.deps.logger,
      send: (recipient) =>
        this.deps.notificationService.sendPaymentConfirmed(recipient.email, {
          recipientName,
          orderNumber,
          amount,
          method,
        }),
    });
  }
}
