import {
  Injectable, BadRequestException, ConflictException,
  Logger, Inject, InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType, PaymentMethod } from './entities/payment.entity';
import { Shipping, ShippingStatus } from './entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { resolveGatewayByLocale } from './payments.module';
import { assertOwnership } from '../../common/utils/ownership.util';
import { findOrThrow } from '../../common/utils/repository.util';
import { NotificationService } from '../notification/notification.service';

const DEFAULT_CARRIER = process.env.DEFAULT_CARRIER || 'mock';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject('PaymentGateway')
    private readonly gateway: PaymentGateway,
    private readonly tossAdapter: TossPaymentAdapter,
    private readonly stripeAdapter: StripePaymentAdapter,
    private readonly notificationService: NotificationService,
    private readonly dataSource: DataSource,
  ) {}

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
    const payment = await findOrThrow(this.paymentRepository, { orderId: dto.orderId }, '결제 정보를 찾을 수 없습니다.', ['order']);
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
      const confirmGateway = this.resolveGatewayByType(payment.gateway);
      const result = await confirmGateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber);

      await this.dataSource.transaction(async (manager) => {
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
            carrier: DEFAULT_CARRIER,
            status: ShippingStatus.PAYMENT_CONFIRMED,
          });
        }
      });

      this.logger.log(`Payment confirmed: orderId=${dto.orderId}`);

      void this.notifyPaymentConfirmed(
        payment.order.userId,
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
      await this.paymentRepository.update(payment.id, { status: PaymentStatus.FAILED });
      if (err instanceof ConflictException || err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('결제 승인에 실패했습니다.');
    }
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

  private async notifyPaymentConfirmed(
    userId: number,
    orderNumber: string,
    recipientName: string,
    amount: number,
    method: string,
  ): Promise<void> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user?.email) return;
      await this.notificationService.sendPaymentConfirmed(user.email, {
        recipientName,
        orderNumber,
        amount,
        method,
      });
    } catch (err) {
      this.logger.warn(`Payment confirmation email failed: ${String(err)}`);
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!this.gateway.verifyWebhook(payload, signature)) {
      throw new UnauthorizedException('웹훅 서명 검증 실패');
    }
    const safe = {
      orderId: (payload as Record<string, unknown>)?.orderId,
      status: (payload as Record<string, unknown>)?.status,
      type: (payload as Record<string, unknown>)?.type,
    };
    this.logger.log(`Webhook received: ${JSON.stringify(safe)}`);

    const parsedOrderId = Number(safe.orderId);
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      this.logger.warn('Webhook ignored: invalid orderId');
      return;
    }

    const normalized = String(
      (payload as Record<string, unknown>)?.eventType
      ?? safe.status
      ?? safe.type
      ?? '',
    ).toUpperCase();

    if (!normalized) {
      this.logger.warn(`Webhook ignored: unknown event for orderId=${parsedOrderId}`);
      return;
    }

    const payment = await this.paymentRepository.findOne({ where: { orderId: parsedOrderId } });
    if (!payment) {
      this.logger.warn(`Webhook ignored: payment not found (orderId=${parsedOrderId})`);
      return;
    }

    if (
      normalized.includes('DONE')
      || normalized.includes('PAID')
      || normalized.includes('CONFIRM')
    ) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.CONFIRMED,
          paidAt: payment.paidAt ?? new Date(),
          rawResponse: payload as object,
        });
        await manager.update(Order, parsedOrderId, { status: OrderStatus.PAID });
      });
      return;
    }

    if (normalized.includes('REFUND')) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.REFUNDED,
          cancelledAt: new Date(),
          rawResponse: payload as object,
        });
        await manager.update(Order, parsedOrderId, { status: OrderStatus.REFUNDED });
      });
      return;
    }

    if (normalized.includes('CANCEL')) {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Payment, payment.id, {
          status: PaymentStatus.CANCELLED,
          cancelledAt: new Date(),
          rawResponse: payload as object,
        });
        await manager.update(Order, parsedOrderId, { status: OrderStatus.CANCELLED });
      });
    }
  }
}
