import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
  ForbiddenException, Logger, Inject, InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentGatewayType, PaymentMethod } from './entities/payment.entity';
import { Shipping, ShippingStatus } from './entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';

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
    @Inject('PaymentGateway')
    private readonly gateway: PaymentGateway,
  ) {}

  async prepare(dto: PreparePaymentDto, userId: number) {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('주문을 찾을 수 없습니다.');
    if (Number(order.userId) !== Number(userId)) throw new ForbiddenException('접근 권한이 없습니다.');
    if (order.status !== OrderStatus.PENDING) {
      throw new ConflictException('이미 처리된 주문입니다.');
    }

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

    const result = await this.gateway.prepare(String(dto.orderId), Number(order.totalAmount));

    return {
      paymentId: Number(payment.id),
      orderId: dto.orderId,
      orderNumber: order.orderNumber,
      amount: Number(order.totalAmount),
      gateway: 'mock',
      clientKey: result.clientKey,
    };
  }

  async confirm(dto: ConfirmPaymentDto, userId: number) {
    const payment = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId },
      relations: ['order'],
    });
    if (!payment) throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    if (Number(payment.order.userId) !== Number(userId)) throw new ForbiddenException('접근 권한이 없습니다.');

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
            carrier: 'mock',
            status: ShippingStatus.PAYMENT_CONFIRMED,
          }),
        );
      }

      this.logger.log(`Payment confirmed: orderId=${dto.orderId}`);

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

  async cancel(dto: CancelPaymentDto, userId: number) {
    const payment = await this.paymentRepository.findOne({
      where: { orderId: dto.orderId },
      relations: ['order'],
    });
    if (!payment) throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    if (Number(payment.order.userId) !== Number(userId)) throw new ForbiddenException('접근 권한이 없습니다.');

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

  async handleWebhook(payload: unknown, signature: string): Promise<void> {
    if (!this.gateway.verifyWebhook(payload, signature)) {
      throw new UnauthorizedException('웹훅 서명 검증 실패');
    }
    const safe = { orderId: (payload as Record<string, unknown>)?.orderId, status: (payload as Record<string, unknown>)?.status, type: (payload as Record<string, unknown>)?.type };
    this.logger.log(`Webhook received: ${JSON.stringify(safe)}`);
  }
}
