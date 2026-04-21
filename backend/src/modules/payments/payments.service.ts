import {
  Injectable, BadRequestException, ConflictException,
  Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType, PaymentMethod } from './entities/payment.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { resolveGatewayByLocale } from './payments.module';
import { assertOwnership } from '../../common/utils/ownership.util';
import { findOrThrow } from '../../common/utils/repository.util';
import { NotificationService } from '../notification/notification.service';
import { NotificationDispatchHelper } from '../notification/notification-dispatch.helper';
import { PaymentConfirmationService } from './services/payment-confirmation.service';
import { PaymentRefundService } from './services/payment-refund.service';
import { PaymentWebhookService } from './services/payment-webhook.service';

const DEFAULT_CARRIER = process.env.DEFAULT_CARRIER || 'mock';

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
    @Inject('PaymentGateway')
    private readonly gateway: PaymentGateway,
    private readonly tossAdapter: TossPaymentAdapter,
    private readonly stripeAdapter: StripePaymentAdapter,
    private readonly notificationService: NotificationService,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    private readonly dataSource: DataSource,
  ) {
    this.paymentConfirmationService = new PaymentConfirmationService({
      paymentRepository: this.paymentRepository,
      orderRepository: this.orderRepository,
      shippingRepository: this.shippingRepository,
      dataSource: this.dataSource,
      notificationService: this.notificationService,
      notificationDispatchHelper: this.notificationDispatchHelper,
      resolveGatewayByType: (gatewayType) => this.resolveGatewayByType(gatewayType),
      logger: this.logger,
      defaultCarrier: DEFAULT_CARRIER,
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
      paymentRepository: this.paymentRepository,
      dataSource: this.dataSource,
      logger: this.logger,
    });
  }

  private resolveGateway(locale?: string): PaymentGateway {
    if (!locale) return this.gateway;
    const name = resolveGatewayByLocale(locale);
    if (name === 'toss') return this.tossAdapter;
    if (name === 'stripe') return this.stripeAdapter;
    return this.gateway;
  }

  // NOTE: PaymentGatewayType enum에는 아직 STRIPE 값이 없어서 INICIS를 overseas 게이트웨이
  // placeholder로 겸용 중 (stripe/inicis 문자열 → INICIS enum). 실제 Inicis 연동을 추가하려면
  // enum에 STRIPE를 추가하고 마이그레이션으로 기존 INICIS 데이터를 재분류해야 한다. (#476 후속)
  private resolveGatewayByType(gatewayType: PaymentGatewayType): PaymentGateway {
    switch (gatewayType) {
      case PaymentGatewayType.TOSS:
        return this.tossAdapter;
      case PaymentGatewayType.INICIS:
        return this.stripeAdapter; // 임시: INICIS enum이 stripe 어댑터를 의미함 (위 NOTE 참고)
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
      case 'inicis':
        return PaymentGatewayType.INICIS; // 임시: stripe도 INICIS enum으로 저장 (위 NOTE 참고)
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
  }> {
    const order = await findOrThrow(this.orderRepository, { id: dto.orderId }, '주문을 찾을 수 없습니다.');
    assertOwnership(order.userId, userId);
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('이미 처리된 주문입니다.');
    }

    const selectedGateway = this.resolveGateway(dto.locale);
    const gatewayName = dto.locale ? resolveGatewayByLocale(dto.locale) : 'mock';

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

    const result = await selectedGateway.prepare(String(dto.orderId), Number(order.totalAmount));

    return {
      paymentId: Number(payment.id),
      orderId: dto.orderId,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      gateway: gatewayName,
      clientKey: result.clientKey,
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
    const cancelGateway = this.resolveGatewayByType(payment.gateway);
    const result = await cancelGateway.cancel(payment.paymentKey!, reason);

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.CANCELLED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
      rawResponse: result.rawResponse as object,
    });

    await this.orderRepository.update(dto.orderId, { status: OrderStatus.CANCELLED });

    return {
      paymentId: Number(payment.id),
      status: PaymentStatus.CANCELLED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
    };
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
}
