import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
  Inject,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  Payment,
  PaymentStatus,
  PaymentGatewayType,
  PaymentMethod,
} from './entities/payment.entity';
import { PaymentWebhookEvent } from './entities/payment-webhook-event.entity';
import { Refund } from './entities/refund.entity';
import { Shipping } from './entities/shipping.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { PointsService } from '../points/points.service';
import { PaymentGateway } from './interfaces/payment-gateway.interface';
import { PreparePaymentDto } from './dto/prepare-payment.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { ReconcileRefundDto } from './dto/reconcile-refund.dto';
import { TossPaymentAdapter } from './adapters/toss.adapter';
import { StripePaymentAdapter } from './adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from './adapters/inicis.adapter';
import { PayPalPaymentAdapter } from './adapters/paypal.adapter';
import { EximbayPaymentAdapter } from './adapters/eximbay.adapter';
import {
  getAvailableGatewaysByLocale,
  isCheckoutGatewayName,
  resolveGatewayByLocale,
} from './checkout-gateway.policy';
import { assertOwnership } from '../../common/utils/ownership.util';
import { findOrThrow } from '../../common/utils/repository.util';
import { PaymentConfirmationService } from './services/payment-confirmation.service';
import { PaymentRefundService } from './services/payment-refund.service';
import { PaymentWebhookService } from './services/payment-webhook.service';
import { runFirstTerminalTransitionRecovery } from './services/order-terminal-recovery.util';
import { assertOrderStatusTransition } from '../orders/policies/order-status-transition.policy';
import { PAYMENT_CONFIG, PaymentConfig } from '../../config/payment.config';
import { IdempotencyService } from '../../common/services/idempotency.service';


class AmbiguousGatewayOutcomeError extends Error {
  constructor(
    readonly kind: 'cancel' | 'refund',
    readonly rawResponse: unknown,
    readonly source: unknown,
  ) {
    super(`${kind} gateway outcome ambiguous`);
  }
}
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
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
    private readonly paypalAdapter: PayPalPaymentAdapter,
    private readonly eximbayAdapter: EximbayPaymentAdapter,
    private readonly pointsService: PointsService,
    private readonly paymentConfirmationService: PaymentConfirmationService,
    private readonly dataSource: DataSource,
    private readonly idempotencyService: IdempotencyService,
  ) {
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
      orderRepository: this.orderRepository,
      webhookEventRepository: this.webhookEventRepository,
      dataSource: this.dataSource,
      pointsService: this.pointsService,
      logger: this.logger,
      defaultCarrier: this.paymentConfig.defaultCarrier,
    });
  }

  private resolveGatewayByName(name: string): PaymentGateway {
    if (name === 'toss') return this.tossAdapter;
    if (name === 'stripe') return this.stripeAdapter;
    if (name === 'inicis') return this.inicisAdapter;
    if (name === 'paypal') return this.paypalAdapter;
    if (name === 'eximbay') return this.eximbayAdapter;
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
      case PaymentGatewayType.PAYPAL:
        return this.paypalAdapter;
      case PaymentGatewayType.EXIMBAY:
        return this.eximbayAdapter;
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
      case 'paypal':
        return PaymentGatewayType.PAYPAL;
      case 'eximbay':
        return PaymentGatewayType.EXIMBAY;
      case 'mock':
      default:
        return PaymentGatewayType.MOCK;
    }
  }
  private gatewayTypeToCheckoutGatewayName(
    gatewayType: PaymentGatewayType,
    fallback: string,
  ): string {
    switch (gatewayType) {
      case PaymentGatewayType.TOSS:
        return 'toss';
      case PaymentGatewayType.STRIPE:
        return 'stripe';
      case PaymentGatewayType.INICIS:
        return 'inicis';
      case PaymentGatewayType.PAYPAL:
        return 'paypal';
      case PaymentGatewayType.EXIMBAY:
        return 'eximbay';
      case PaymentGatewayType.MOCK:
      default:
        return fallback;
    }
  }

  async prepare(
    dto: PreparePaymentDto,
    userId: number,
    idempotencyKey?: string,
  ): Promise<{
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
    return (await this.idempotencyService.execute(
      `member:${userId}`,
      'payment.prepare',
      idempotencyKey,
      dto,
      async () => {
        const order = await findOrThrow(
          this.orderRepository,
          { id: dto.orderId },
          '주문을 찾을 수 없습니다.',
        );
        this.assertMemberOwnership(order.userId, userId);
        return this.prepareForOrder(Number(order.id), {
          locale: dto.locale,
          gateway: dto.gateway,
          customerKey: this.createTossCustomerKey(userId),
          idempotencyKey,
        });
      },
    )).result;
  }

  private createTossCustomerKey(userId: number): string {
    return createHmac('sha256', this.paymentConfig.toss.secretKey)
      .update(`ockhwadang:user:${userId}`)
      .digest('hex')
      .slice(0, 50);
  }

  async prepareForOrder(
    orderId: number,
    options: Pick<PreparePaymentDto, 'locale' | 'gateway'> & { customerKey?: string; idempotencyKey?: string },
  ): Promise<{
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
    const normalizedOrderId = Number(orderId);
    const locale = options.locale ?? 'ko';
    const availableGateways = getAvailableGatewaysByLocale(locale);
    const gatewayName =
      options.gateway &&
      isCheckoutGatewayName(options.gateway) &&
      availableGateways.includes(options.gateway)
        ? options.gateway
        : options.locale
          ? resolveGatewayByLocale(locale)
          : this.paymentConfig.gateway;
    const prepared = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: normalizedOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException('이미 처리된 주문입니다.');
      }

      let payment = await manager.findOne(Payment, {
        where: { orderId: normalizedOrderId },
        lock: { mode: 'pessimistic_write' },
      });
      let effectiveGatewayName: string = gatewayName;
      if (!payment) {
        payment = manager.create(Payment, {
          orderId: normalizedOrderId,
          amount: Number(order.totalAmount),
          status: PaymentStatus.PENDING,
          method: gatewayName === 'bank_transfer' ? PaymentMethod.BANK_TRANSFER : PaymentMethod.MOCK,
          gateway:
            gatewayName === 'bank_transfer'
              ? PaymentGatewayType.MOCK
              : this.gatewayNameToType(gatewayName),
        });
        payment = await manager.save(Payment, payment);
      } else {
        if (payment.status === PaymentStatus.CONFIRMED) {
          throw new ConflictException('이미 승인된 결제입니다.');
        }

        effectiveGatewayName =
          payment.method === PaymentMethod.BANK_TRANSFER
            ? 'bank_transfer'
            : this.gatewayTypeToCheckoutGatewayName(payment.gateway, gatewayName);
      }

      return {
        paymentId: Number(payment.id),
        orderNumber: order.orderNumber,
        amount: Number(order.totalAmount),
        gatewayName: effectiveGatewayName,
      };
    });

    if (prepared.gatewayName === 'bank_transfer') {
      await this.paymentRepository.update(prepared.paymentId, {
        providerOrderReference: prepared.orderNumber,
        expectedProviderAmount: prepared.amount,
        expectedProviderCurrency: 'KRW',
        localOrderReference: prepared.orderNumber,
      });
      return {
        paymentId: prepared.paymentId,
        orderId: normalizedOrderId,
        orderNumber: prepared.orderNumber,
        amount: prepared.amount,
        gateway: prepared.gatewayName,
        clientKey: 'bank_transfer',
        availableGateways,
      };
    }

    const selectedGateway = this.resolveGatewayByName(prepared.gatewayName);
    const existingPreparation = await this.paymentRepository.findOne({
      where: { id: prepared.paymentId },
    });
    const storedArtifact = readPreparedClientArtifact(existingPreparation?.rawResponse);
    if (existingPreparation?.providerOrderReference && storedArtifact) {
      return {
        paymentId: prepared.paymentId,
        orderId: normalizedOrderId,
        orderNumber: prepared.orderNumber,
        amount: prepared.amount,
        gateway: prepared.gatewayName,
        availableGateways,
        ...storedArtifact,
      };
    }
    let result = await selectedGateway.prepare(String(normalizedOrderId), prepared.amount, {
      locale,
      orderNumber: prepared.orderNumber,
      // A payment is one immutable provider attempt. Client idempotency keys
      // protect API replay only and must not produce additional Stripe intents.
      idempotencyKey: prepared.gatewayName === 'stripe'
        ? `stripe-payment-${prepared.paymentId}`
        : options.idempotencyKey
          ? `payment-${prepared.paymentId}-${options.idempotencyKey}`
          : undefined,
      rawResponse: (await this.paymentRepository.findOne({ where: { id: prepared.paymentId } }))?.rawResponse,
    });
    if (result.rawResponse && prepared.gatewayName === 'stripe') {
      const winningRawResponse = await this.dataSource.transaction(async (manager) => {
        const payment = await manager.findOne(Payment, {
          where: { id: prepared.paymentId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!payment) throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
        if (payment.rawResponse) return payment.rawResponse;
        await manager.update(Payment, prepared.paymentId, { rawResponse: result.rawResponse! });
        return result.rawResponse!;
      });
      if (winningRawResponse !== result.rawResponse) {
        result = await selectedGateway.prepare(String(normalizedOrderId), prepared.amount, {
          locale,
          orderNumber: prepared.orderNumber,
          idempotencyKey: `stripe-payment-${prepared.paymentId}`,
          rawResponse: winningRawResponse,
        });
      }
    }
    if (
      !result.providerOrderReference ||
      !Number.isFinite(result.providerAmount) ||
      result.providerAmount === undefined ||
      !result.providerCurrency
    ) {
      throw new BadRequestException('결제 게이트웨이가 거래 바인딩을 증명할 수 없습니다.');
    }
    const gatewayPayload = result.gatewayPayload || prepared.gatewayName === 'toss'
      ? {
          ...result.gatewayPayload,
          ...(prepared.gatewayName === 'toss'
            ? { customerKey: options.customerKey ?? 'ANONYMOUS' }
            : {}),
        }
      : undefined;
    await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { id: prepared.paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
      if (payment.providerOrderReference) {
        if (
          payment.providerOrderReference !== result.providerOrderReference ||
          payment.providerTransactionId !== (result.providerTransactionId ?? null) ||
          Number(payment.expectedProviderAmount) !== Number(result.providerAmount) ||
          payment.expectedProviderCurrency !== result.providerCurrency ||
          payment.localOrderReference !== prepared.orderNumber
        ) {
          throw new ConflictException('준비된 결제 거래 정보가 일치하지 않습니다.');
        }
        return;
      }
      await manager.update(Payment, payment.id, {
        providerTransactionId: result.providerTransactionId ?? null,
        providerOrderReference: result.providerOrderReference,
        expectedProviderAmount: result.providerAmount,
        expectedProviderCurrency: result.providerCurrency!.toUpperCase(),
        localOrderReference: prepared.orderNumber,
        rawResponse: payment.gateway === PaymentGatewayType.STRIPE
          ? payment.rawResponse
          : {
              providerPreparation: result.rawResponse ?? null,
              clientArtifact: {
                clientKey: result.clientKey,
                ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
                ...(gatewayPayload ? { gatewayPayload } : {}),
              },
            },
      });
    });

    return {
      paymentId: prepared.paymentId,
      orderId: normalizedOrderId,
      orderNumber: prepared.orderNumber,
      amount: prepared.amount,
      gateway: prepared.gatewayName,
      clientKey: result.clientKey,
      availableGateways,
      ...(result.redirectUrl ? { redirectUrl: result.redirectUrl } : {}),
      ...(
        gatewayPayload
          ? {
              gatewayPayload,
            }
          : {}
      ),
    };
  }

  async confirm(
    dto: ConfirmPaymentDto,
    userId: number,
    idempotencyKey?: string,
  ): Promise<{
    paymentId: number;
    orderId: number;
    orderNumber: string;
    status: PaymentStatus;
    method: string;
    amount: number;
    paidAt: Date;
  }> {
    const operation = await this.idempotencyService.reserve<{
      paymentId: number;
      orderId: number;
      orderNumber: string;
      status: PaymentStatus;
      method: string;
      amount: number;
      paidAt: Date;
    }>(`member:${userId}`, 'payment.confirm', idempotencyKey, dto);
    if (operation.replayed) return operation.result!;
    if (!operation.owner) throw new ConflictException('동일한 요청이 처리 중입니다.');
    await this.idempotencyService.renewLease(operation.id, operation.leaseOwner!);
    return this.paymentConfirmationService.confirm(
      dto,
      userId,
      idempotencyKey,
      (manager, response) => this.idempotencyService.complete(manager, operation.id, operation.leaseOwner!, response),
    );
  }

  async reconcileConfirmedPayment(orderId: number): Promise<void> {
    await this.paymentConfirmationService.reconcileConfirmedPayment(orderId);
  }

  async cancel(
    dto: CancelPaymentDto,
    userId: number,
  ): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId: dto.orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    this.assertMemberOwnership(payment.order.userId, userId);

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

  async cancelAdmin(
    orderId: number,
    reason: string,
    postGatewaySync?: (
      manager: EntityManager,
      cancelledAt: Date,
      syncPayment: () => Promise<void>,
    ) => Promise<void>,
  ): Promise<{
    paymentId: number;
    status: PaymentStatus;
    cancelledAt: Date;
    cancelReason: string;
  }> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );

    if (payment.status !== PaymentStatus.CONFIRMED) {
      throw new BadRequestException('환불 가능한 상태가 아닙니다.');
    }

    let gatewayResult: { cancelledAt: Date; rawResponse?: unknown } | null = null;
    let lockedPaymentSnapshot = payment;
    const cancelGateway = this.resolveGatewayByType(payment.gateway);
    try {
      gatewayResult = await cancelGateway.cancel(payment.paymentKey!, reason, {
        originalAmount: Number(payment.amount),
        orderNumber: payment.order?.orderNumber,
        rawResponse: payment.rawResponse,
      });
    } catch (err) {
      if (!isDuplicateLikeGatewayOutcomeError(err)) {
        throw err;
      }
      await this.persistAmbiguousRefundOutcome(
        payment,
        orderId,
        reason,
        extractGatewayErrorPayload(err) ?? payment.rawResponse,
        err,
      );
      throw new InternalServerErrorException('환불 상태 확인이 필요합니다.');
    }

    const applyRefund = async (txManager: EntityManager): Promise<void> => {
      const syncPayment = async (): Promise<void> => {
        const lockedPayment = await txManager.findOne(Payment, {
          where: { orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedPayment) {
          throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
        }
        if (
          lockedPayment.status !== PaymentStatus.CONFIRMED ||
          lockedPayment.paymentKey !== payment.paymentKey ||
          lockedPayment.gateway !== payment.gateway
        ) {
          throw new BadRequestException('환불 가능한 상태가 아닙니다.');
        }

        lockedPaymentSnapshot = lockedPayment;
        await txManager.update(Payment, lockedPayment.id, {
          status: PaymentStatus.REFUNDED,
          cancelledAt: gatewayResult!.cancelledAt,
          cancelReason: reason,
          rawResponse: normalizeGatewayRawResponse(gatewayResult!.rawResponse),
        });
      };

      if (postGatewaySync) {
        await postGatewaySync(txManager, gatewayResult!.cancelledAt, syncPayment);
        return;
      }

      await runFirstTerminalTransitionRecovery(txManager, {
        orderId,
        nextOrderStatus: OrderStatus.REFUNDED,
        pointsService: this.pointsService,
        pointRestoreDescription: `주문 ${orderId} 환불로 인한 적립금 복구`,
        lockBeforeRecovery: async () => {
          await syncPayment();
          return true;
        },
        applyMutations: async () => false,
      });
    };

    try {
      await this.dataSource.transaction(applyRefund);
    } catch (err) {
      if (gatewayResult) {
        await this.persistAdminRefundReconciliation(
          lockedPaymentSnapshot,
          orderId,
          reason,
          gatewayResult,
          err,
        );
      }
      throw err;
    }

    return {
      paymentId: Number(lockedPaymentSnapshot.id),
      status: PaymentStatus.REFUNDED,
      cancelledAt: gatewayResult!.cancelledAt,
      cancelReason: reason,
    };
  }

  async partialRefund(orderId: number, dto: CreateRefundDto): Promise<Refund> {
    return this.paymentRefundService.partialRefund(orderId, dto);
  }

  async reconcileRefund(refundId: number, dto: ReconcileRefundDto): Promise<Refund> {
    return this.paymentRefundService.reconcileRefund(refundId, dto);
  }

  async handleWebhook(
    provider: string,
    payload: unknown,
    signature: string,
    rawBody?: Buffer,
  ): Promise<void> {
    const gatewayType = this.gatewayNameToType(provider);
    if (gatewayType === PaymentGatewayType.MOCK && provider !== 'mock') {
      throw new UnauthorizedException('지원하지 않는 웹훅 제공자');
    }
    const gateway = this.resolveGatewayByType(gatewayType);
    const webhookService = new PaymentWebhookService({
      gateway,
      gatewayType,
      paymentRepository: this.paymentRepository,
      orderRepository: this.orderRepository,
      webhookEventRepository: this.webhookEventRepository,
      dataSource: this.dataSource,
      pointsService: this.pointsService,
      logger: this.logger,
      defaultCarrier: this.paymentConfig.defaultCarrier,
    });
    return webhookService.handleWebhook(payload, signature, rawBody);
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
    let gatewayResult: { cancelledAt: Date; rawResponse?: unknown } | null = null;
    let lockedPaymentSnapshot = payment;

    const applyCancellation = async (txManager: EntityManager): Promise<void> => {
      let lockedPayment: Payment | null = null;
      const recovery = await runFirstTerminalTransitionRecovery(txManager, {
        orderId,
        nextOrderStatus: OrderStatus.CANCELLED,
        pointsService: this.pointsService,
        pointRestoreDescription: `주문 ${orderId} 취소로 인한 적립금 복구`,
        lockBeforeRecovery: async (lockedOrder) => {
          lockedPayment = await txManager.findOne(Payment, {
            where: { orderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!lockedPayment) {
            throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
          }
          if (lockedPayment.status !== PaymentStatus.CONFIRMED) {
            throw new BadRequestException('취소 가능한 상태가 아닙니다.');
          }
          lockedPayment.order = lockedOrder;
          lockedPaymentSnapshot = lockedPayment;
          assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);
          const cancelGateway = this.resolveGatewayByType(lockedPayment.gateway);
          try {
            gatewayResult = await cancelGateway.cancel(lockedPayment.paymentKey!, reason, {
              originalAmount: Number(lockedPayment.amount),
              orderNumber: lockedOrder.orderNumber,
              rawResponse: lockedPayment.rawResponse,
            });
          } catch (err) {
            if (!isDuplicateLikeGatewayOutcomeError(err)) {
              throw err;
            }
            throw new AmbiguousGatewayOutcomeError(
              'cancel',
              extractGatewayErrorPayload(err) ?? lockedPayment.rawResponse,
              err,
            );
          }
          return true;
        },
        applyMutations: async (lockedOrder) => {
          assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);
          await txManager.update(Payment, lockedPayment!.id, {
            status: PaymentStatus.CANCELLED,
            cancelledAt: gatewayResult!.cancelledAt,
            cancelReason: reason,
            rawResponse: normalizeGatewayRawResponse(gatewayResult!.rawResponse),
          });
          await txManager.update(Order, orderId, {
            status: OrderStatus.CANCELLED,
            cancelReason: reason,
            cancelledAt: gatewayResult!.cancelledAt,
          });
          return true;
        },
      });

      if (!recovery.lockedOrder) {
        throw new NotFoundException('주문을 찾을 수 없습니다.');
      }
    };

    try {
      if (manager) {
        await applyCancellation(manager);
      } else {
        await this.dataSource.transaction(applyCancellation);
      }
    } catch (err) {
      if (err instanceof AmbiguousGatewayOutcomeError) {
        await this.persistAmbiguousCancellationOutcome(
          lockedPaymentSnapshot,
          orderId,
          reason,
          err.rawResponse,
          err.source,
        );
        throw new InternalServerErrorException('결제 취소 상태 확인이 필요합니다.');
      }
      if (gatewayResult) {
        await this.persistCancellationReconciliation(
          lockedPaymentSnapshot,
          orderId,
          reason,
          gatewayResult,
          err,
        );
      }
      throw err;
    }

    return {
      paymentId: Number(lockedPaymentSnapshot.id),
      status: PaymentStatus.CANCELLED,
      cancelledAt: gatewayResult!.cancelledAt,
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

    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.CANCELLED,
      cancelledAt: result.cancelledAt,
      cancelReason: reason,
      rawResponse: reconciliationPayload,
    });
  }

  private async persistAdminRefundReconciliation(
    payment: Payment,
    orderId: number,
    reason: string,
    result: { cancelledAt: Date; rawResponse?: unknown },
    err: unknown,
  ): Promise<void> {
    const reconciliationPayload = {
      gatewayRefundSucceeded: true,
      reconciliationRequired: true,
      orderId,
      rawResponse: result.rawResponse,
      error: err instanceof Error ? err.message : String(err),
    };

    await this.dataSource.transaction(async (manager) => {
      await runFirstTerminalTransitionRecovery(manager, {
        orderId,
        nextOrderStatus: OrderStatus.PENDING,
        pointsService: this.pointsService,
        pointRestoreDescription: '',
        lockBeforeRecovery: async () => {
          const lockedPayment = await manager.findOne(Payment, {
            where: { id: payment.id, orderId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!lockedPayment) {
            throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
          }
          await manager.update(Payment, lockedPayment.id, {
            status: PaymentStatus.REFUNDED,
            cancelledAt: result.cancelledAt,
            cancelReason: reason,
            rawResponse: reconciliationPayload,
          });
          return true;
        },
        applyMutations: async () => false,
      });
    });
  }

  private async persistAmbiguousCancellationOutcome(
    payment: Payment,
    orderId: number,
    reason: string,
    rawResponse: unknown,
    err: unknown,
  ): Promise<void> {
    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.CONFIRMED,
      cancelReason: reason,
      rawResponse: {
        gatewayCancellationAmbiguous: true,
        reconciliationRequired: true,
        orderId,
        rawResponse,
        error: err instanceof Error ? err.message : String(err),
      } as object,
    });
  }

  private async persistAmbiguousRefundOutcome(
    payment: Payment,
    orderId: number,
    reason: string,
    rawResponse: unknown,
    err: unknown,
  ): Promise<void> {
    await this.paymentRepository.update(payment.id, {
      status: PaymentStatus.CONFIRMED,
      cancelReason: reason,
      rawResponse: {
        gatewayRefundAmbiguous: true,
        reconciliationRequired: true,
        orderId,
        rawResponse,
        error: err instanceof Error ? err.message : String(err),
      } as object,
    });
  }

  private assertMemberOwnership(orderUserId: number | null, userId: number): void {
    if (orderUserId === null) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    assertOwnership(orderUserId, userId);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeGatewayRawResponse(rawResponse: unknown): object {
  return isRecord(rawResponse) ? rawResponse : { duplicateLike: true };
}

function readPreparedClientArtifact(
  rawResponse: unknown,
): { clientKey: string; redirectUrl?: string; gatewayPayload?: Record<string, string | number | boolean> } | null {
  if (!isRecord(rawResponse) || !isRecord(rawResponse.clientArtifact)) return null;
  const artifact = rawResponse.clientArtifact;
  if (typeof artifact.clientKey !== 'string') return null;
  return {
    clientKey: artifact.clientKey,
    ...(typeof artifact.redirectUrl === 'string' ? { redirectUrl: artifact.redirectUrl } : {}),
    ...(isRecord(artifact.gatewayPayload) ? {
      gatewayPayload: artifact.gatewayPayload as Record<string, string | number | boolean>,
    } : {}),
  };
}


function isDuplicateLikeGatewayOutcomeError(err: unknown): boolean {
  const details = [
    err instanceof Error ? err.message : '',
    readGatewayErrorText(err, 'code'),
    readGatewayErrorText(err, 'type'),
    readGatewayErrorText(err, 'status'),
    readGatewayErrorText(err, 'statusCode'),
    readGatewayErrorText(err, 'response.status'),
    readGatewayErrorText(err, 'response.statusCode'),
    readGatewayErrorText(err, 'response.code'),
    readGatewayErrorText(err, 'response.errorCode'),
    readGatewayErrorText(err, 'response.message'),
    readGatewayErrorText(err, 'response.error'),
    readGatewayErrorText(err, 'body.code'),
    readGatewayErrorText(err, 'body.message'),
    readGatewayErrorText(err, 'rawResponse.code'),
    readGatewayErrorText(err, 'rawResponse.message'),
  ]
    .filter((value) => value.length > 0)
    .join(' ')
    .toLowerCase();

  return (
    details.includes('already cancelled') ||
    details.includes('already canceled') ||
    details.includes('already refunded') ||
    ((details.includes('duplicate') || details.includes('idempot')) &&
      (details.includes('cancel') || details.includes('refund')))
  );
}


function extractGatewayErrorPayload(err: unknown): Record<string, unknown> | null {
  if (!isRecord(err)) {
    return null;
  }

  const candidates: unknown[] = [err.rawResponse, err.response, err.body, err];
  for (const candidate of candidates) {
    if (isRecord(candidate)) {
      return candidate;
    }
  }

  return null;
}
function readGatewayErrorText(err: unknown, path: string): string {
  if (typeof err !== 'object' || err === null) {
    return '';
  }

  const value = path.split('.').reduce<unknown>((current, key) => {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, err);

  return value === undefined || value === null ? '' : String(value);
}
