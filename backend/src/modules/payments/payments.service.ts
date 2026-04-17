import {
  Injectable, BadRequestException, ConflictException,
  Logger, Inject, InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  private resolveGateway(locale?: string): PaymentGateway {
    if (!locale) return this.gateway;
    const name = resolveGatewayByLocale(locale);
    if (name === 'toss') return this.tossAdapter;
    if (name === 'stripe') return this.stripeAdapter;
    return this.gateway;
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
        gateway: PaymentGatewayType.MOCK,
      });
      payment = await this.paymentRepository.save(payment);
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
      const result = await this.gateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber);

      await this.paymentRepository.update(payment.id, {
        status: PaymentStatus.CONFIRMED,
        paymentKey: dto.paymentKey,
        method: result.method as PaymentMethod,
        paidAt: new Date(),
        rawResponse: result.rawResponse as object,
      });

      await this.orderRepository.update(dto.orderId, { status: OrderStatus.PAID });

      const existing = await this.shippingRepository.findOne({ where: { orderId: dto.orderId } });
      if (!existing) {
        await this.shippingRepository.save(
          this.shippingRepository.create({
            orderId: dto.orderId,
            carrier: DEFAULT_CARRIER,
            status: ShippingStatus.PAYMENT_CONFIRMED,
          }),
        );
      }

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
    const result = await this.gateway.cancel(payment.paymentKey!, reason);

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
    const safe = { orderId: (payload as Record<string, unknown>)?.orderId, status: (payload as Record<string, unknown>)?.status, type: (payload as Record<string, unknown>)?.type };
    this.logger.log(`Webhook received: ${JSON.stringify(safe)}`);
  }
}
