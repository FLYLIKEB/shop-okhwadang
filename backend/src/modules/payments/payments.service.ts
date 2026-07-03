import {
  Injectable, BadRequestException, ConflictException, NotFoundException,
  Logger, Inject, Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType, PaymentMethod } from './entities/payment.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { restoreOrderStock } from '../orders/order-stock.util';
import { PointHistory } from '../coupons/entities/point-history.entity';
import { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { NaverPayPaymentAdapter } from './adapters/naverpay.adapter';
import { PayPalPaymentAdapter } from './adapters/paypal.adapter';
import {
  getAvailableGatewaysByLocale,
  isCheckoutGatewayName,
  resolveGatewayByLocale,
} from './payments.module';
import { assertOwnership } from '../../common/utils/ownership.util';
import { findOrThrow } from '../../common/utils/repository.util';
import { NotificationService } from '../notification/notification.service';
import { MessageNotificationService } from '../notification/message-notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { PaymentConfirmationService } from './services/payment-confirmation.service';
import { PaymentRefundService } from './services/payment-refund.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { PAYMENT_CONFIG, PaymentConfig } from '../../config/payment.config';
import { OrderEventEmitter } from '../orders/order-event.emitter';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly paymentConfirmationService: PaymentConfirmationService;
  private readonly paymentRefundService: PaymentRefundService;
  private readonly paymentWebhookService: PaymentWebhookService;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(PaymentWebhookEvent)
    private readonly webhookEventRepository: Repository<PaymentWebhookEvent>,
    @Inject('PaymentGateway')
    private readonly gateway: PaymentGateway,
    @Inject(PAYMENT_CONFIG)
    private readonly paymentConfig: PaymentConfig,
    private readonly tossAdapter: TossPaymentAdapter,
    private readonly stripeAdapter: StripePaymentAdapter,
    private readonly inicisAdapter: KGInicisPaymentAdapter,
    private readonly naverpayAdapter: NaverPayPaymentAdapter,
    private readonly paypalAdapter: PayPalPaymentAdapter,
    private readonly notificationService: NotificationService,
    @Optional()
    private readonly messageNotificationService: MessageNotificationService | undefined,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    @Optional()
    private readonly orderEventEmitter: OrderEventEmitter | undefined,
    private readonly dataSource: DataSource,
  ) {
    this.paymentConfirmationService = new PaymentConfirmationService({
      paymentRepository: this.paymentRepository,
      orderRepository: this.orderRepository,
      shippingRepository: this.shippingRepository,
      dataSource: this.dataSource,
      notificationService: this.notificationService,
      messageNotificationService: this.messageNotificationService,
      notificationDispatchHelper: this.notificationDispatchHelper,
      resolveGatewayByType: (gatewayType) => this.resolveGatewayByType(gatewayType),
      logger: this.logger,
      defaultCarrier: this.paymentConfig.defaultCarrier,
      orderEventEmitter: this.orderEventEmitter,
    });
    this.paymentRefundService = new PaymentRefundService({
      paymentRepository: this.paymentRepository,
      refundRepository: this.refundRepository,
      dataSource: this.dataSource,
      resolveGatewayByType: (gatewayType) => this.resolveGatewayByType(gatewayType),
      logger: this.logger,
    });
    this.paymentWebhookService = new PaymentWebhookService({
      gateway: this.gateway,
      gatewayType: this.gatewayNameToType(this.paymentConfig.gateway),
      paymentRepository: this.paymentRepository,
      webhookEventRepository: this.webhookEventRepository,
      dataSource: this.dataSource,
      logger: this.logger,
    });
  }

  private resolveGatewayByName(name: string): PaymentGateway {
    if (name === 'toss') return this.tossAdapter;
    if (name === 'stripe') return this.stripeAdapter;
    if (name === 'inicis') return this.inicisAdapter;
    if (name === 'naverpay') return this.naverpayAdapter;
    if (name === 'paypal') return this.paypalAdapter;
    return this.gateway;
  }

  private resolveGatewayByType(gatewayType: PaymentGatewayType): PaymentGateway {
    switch (gatewayType) {
      case PaymentGatewayType.TOSS:
        return this.tossAdapter;
      case PaymentGatewayType.STRIPE:
        return this.stripeAdapter;
      case PaymentGatewayType.INICIS:
        return this.inicisAdapter;
      case PaymentGatewayType.NAVERPAY:
        return this.naverpayAdapter;
      case PaymentGatewayType.PAYPAL:
        return this.paypalAdapter;
      case PaymentGatewayType.MOCK:
      default:
        return this.gateway;
    }
  }

  private gatewayNameToType(name: string): PaymentGatewayType {
    switch (name) {
      case 'toss':
        return PaymentGatewayType.TOSS;
      case 'stripe':
        return PaymentGatewayType.STRIPE;
      case 'inicis':
        return PaymentGatewayType.INICIS;
      case 'naverpay':
        return PaymentGatewayType.NAVERPAY;
      case 'paypal':
        return PaymentGatewayType.PAYPAL;
      case 'mock':
      default:
        return PaymentGatewayType.MOCK;
    }
  }

  async prepare(dto: PreparePaymentDto, userId: number): Promise<{
    paymentId: number;
    orderId: number;
    orderNumber: string;
    amount: number;
    gateway: string;
    clientKey: string;
    availableGateways: string[];
    redirectUrl?: string;
    gatewayPayload?: Record<string, string | number | boolean>;
  }> {
    const order = await findOrThrow(this.orderRepository, { id: dto.orderId }, '주문을 찾을 수 없습니다.');
    assertOwnership(order.userId, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('이미 처리된 주문입니다.');
    }

    const locale = dto.locale ?? 'ko';
    const availableGateways = getAvailableGatewaysByLocale(locale);
    const gatewayName = dto.gateway && isCheckoutGatewayName(dto.gateway)
      ? dto.gateway
      : dto.locale
        ? resolveGatewayByLocale(locale)
        : this.paymentConfig.gateway;
    const selectedGateway = this.resolveGatewayByName(gatewayName);

    let payment = await this.paymentRepository.findOne({ where: { orderId: dto.orderId } });
    if (!payment) {
      payment = this.paymentRepository.create({
        orderId: dto.orderId,
        amount: Number(order.totalAmount),
        status: PaymentStatus.PENDING,
        method: PaymentMethod.MOCK,
        gateway: this.gatewayNameToType(gatewayName),
      });
      payment = await this.paymentRepository.save(payment);
    } else {
      await this.paymentRepository.update(payment.id, {
        gateway: this.gatewayNameToType(gatewayName),
      });
      payment = await findOrThrow(this.paymentRepository, { id: payment.id }, '결제 정보를 찾을 수 없습니다.');
    }

    const result = await selectedGateway.prepare(String(dto.orderId), Number(order.totalAmount), {
      locale,
      orderNumber: order.orderNumber,
    });

    return {
      paymentId: Number(payment.id),
      orderId: dto.orderId,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      gateway: gatewayName,
      clientKey: result.clientKey,
      availableGateways,
      ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
      ...(result.gatewayPayload ? { gatewayPayload: result.gatewayPayload } : {}),
    };
  }

  async confirm(dto: ConfirmPaymentDto, userId: number): Promise<{
    paymentId: number;
    orderId: number;
    orderNumber: string;
    status: PaymentStatus;
    method: string;
    amount: number;
    paidAt: Date;
  }> {
    return this.paymentConfirmationService.confirm(dto, userId);
  }

  async cancel(dto: CancelPaymentDto, userId: number): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    const payment = await findOrThrow(this.paymentRepository, { orderId: dto.orderId }, '결제 정보를 찾을 수 없습니다.', ['order']);
    assertOwnership(payment.order.userId, userId);

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('취소 가능한 상태가 아닙니다.');
    }

    const reason = dto.reason ?? '고객 요청';
    return this.cancelConfirmedOrderPayment(payment, dto.orderId, reason);
  }

  async cancelPaidOrder(
    orderId: number,
    reason: string,
    manager?: EntityManager,
  ): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    const payment = manager
      ? await manager.findOne(Payment, { where: { orderId }, relations: ['order'] })
      : await this.paymentRepository.findOne({ where: { orderId }, relations: ['order'] });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    return this.cancelConfirmedOrderPayment(payment, orderId, reason, manager);
  }

  async cancelAdmin(orderId: number, reason: string): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
    );

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('환불 가능한 상태가 아닙니다.');
    }

    const cancelGateway = this.resolveGatewayByType(payment.gateway);
    const result = await cancelGateway.cancel(payment.paymentKey!, reason);

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.REFUNDED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
      rawResponse: result.rawResponse as object,
    });

    return {
      paymentId: Number(payment.id),
      status: PaymentStatus.REFUNDED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
    };
  }

  async partialRefund(orderId: number, dto: CreateRefundDto): Promise<Refund> {
    return this.paymentRefundService.partialRefund(orderId, dto);
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    return this.paymentWebhookService.handleWebhook(payload, signature);
  }

  private async cancelConfirmedOrderPayment(
    payment: Payment,
    orderId: number,
    reason: string,
    manager?: EntityManager,
  ): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('취소 가능한 상태가 아닙니다.');
    }

    const cancelGateway = this.resolveGatewayByType(payment.gateway);
    const result = await cancelGateway.cancel(payment.paymentKey!, reason);

    const applyCancellation = async (txManager: EntityManager): Promise<void> => {
      await txManager.update(Payment, payment.id, {
        status: PaymentStatus.CANCELLED,
        cancelledAt: result.cancelledAt,
        cancelReason: reason,
        rawResponse: result.rawResponse as object,
      });
      await txManager.update(Order, orderId, { status: OrderStatus.CANCELLED });
      await restoreOrderStock(txManager, orderId);
      await this.restorePoints(txManager, payment.order);
    };

    try {
      if (manager) {
        await applyCancellation(manager);
      } else {
        // PG 취소 성공 후 결제 상태/주문 상태/재고/포인트 복구를 한 트랜잭션으로 묶는다.
        // 재고 복구 정책 및 멱등성: `orders/order-stock.util.ts` 참고.
        await this.dataSource.transaction(applyCancellation);
      }
    } catch (err) {
      await this.persistCancellationReconciliation(payment, orderId, reason, result, err);
      throw err;
    }

    return {
      paymentId: Number(payment.id),
      status: PaymentStatus.CANCELLED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
    };
  }

  private async persistCancellationReconciliation(
    payment: Payment,
    orderId: number,
    reason: string,
    result: { cancelledAt: Date; rawResponse?: unknown },
    err: unknown,
  ): Promise<void> {
    const reconciliationPayload = {
      gatewayCancellationSucceeded: true,
      reconciliationRequired: true,
      orderId,
      rawResponse: result.rawResponse,
      error: err instanceof Error ? err.message : String(err),
    };

    try {
      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.CANCELLED,
        cancelledAt: result.cancelledAt,
        cancelReason: reason,
        rawResponse: reconciliationPayload,
      });
    } catch (persistErr) {
      this.logger.error(
        `Failed to persist cancellation reconciliation for payment ${payment.id}: ${String(persistErr)}`,
      );
    }
  }

  private async restorePoints(manager: EntityManager, order: Order): Promise<void> {
    if (!order.pointsUsed || order.pointsUsed <= 0) return;

    const last = await manager.findOne(PointHistory, {
      where: { userId: order.userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const balance = Number(last?.balance ?? 0) + Number(order.pointsUsed);
    await manager.save(PointHistory, {
      userId: order.userId,
      type: 'admin_adjust',
      amount: order.pointsUsed,
      balance,
      orderId: Number(order.id),
      description: `주문 ${order.orderNumber} 취소로 인한 적립금 복구`,
    });
  }
}
