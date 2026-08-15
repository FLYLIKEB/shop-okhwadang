import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ConfirmPaymentDto } from '../dto/confirm-payment.dto';
import { GuestConfirmPaymentDto } from '../dto/guest-confirm-payment.dto';
import {
  Payment,
  PaymentGatewayType,
  PaymentMethod,
  PaymentStatus,
} from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';
import { NotificationService } from '../../notification/notification.service';
import { MessageNotificationService } from '../../notification/message-notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { assertOwnership } from '../../../common/utils/ownership.util';
import { findOrThrow } from '../../../common/utils/repository.util';
import { runFirstTerminalTransitionRecovery } from './order-terminal-recovery.util';
import { OrderEventEmitter } from '../../orders/order-event.emitter';
import { OrderCompletedEvent } from '../../orders/events/order-completed.event';
import {
  buildGuestOrderLookupUrl,
  buildOrderEmailItems,
  buildOrderUrl,
} from '../../notification/order-email-context';
import { PAYMENT_CONFIG, type PaymentConfig } from '../../../config/payment.config';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from '../adapters/inicis.adapter';
import { PayPalPaymentAdapter } from '../adapters/paypal.adapter';
import { EximbayPaymentAdapter } from '../adapters/eximbay.adapter';
import { PointsService } from '../../points/points.service';
import { assertOrderStatusTransition } from '../../orders/policies/order-status-transition.policy';
import { GuestOrderAccessService } from '../../orders/guest-order-access.service';

type CustomerType = 'member' | 'guest';
type ConfirmResponse = {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  status: PaymentStatus;
  method: string;
  amount: number;
  paidAt: Date;
};
type GuestConfirmResponse = ConfirmResponse & {
  guestAccessToken: string;
  guestAccessTokenExpiresAt: string;
};
type PostCommitPayload = {
  userId: number | null;
  orderId: number;
  orderNumber: string;
  recipientName: string;
  amount: number;
  method: string;
  locale: 'ko' | 'en';
  customerType: CustomerType;
  isFirstPurchase: boolean;
  guestEmail: string | null;
};

@Injectable()
export class PaymentConfirmationService {
  private readonly logger = new Logger(PaymentConfirmationService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
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
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    @Optional()
    private readonly messageNotificationService: MessageNotificationService | undefined,
    private readonly notificationDispatchHelper: NotificationDispatchHelper,
    @Optional()
    private readonly orderEventEmitter: OrderEventEmitter | undefined,
    private readonly guestOrderAccessService: GuestOrderAccessService,
  ) {}

  async confirm(
    dto: ConfirmPaymentDto,
    userId: number,
    idempotencyKey?: string,
    persistResult?: (manager: EntityManager, response: ConfirmResponse) => Promise<void>,
  ): Promise<ConfirmResponse> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId: dto.orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    this.assertMemberOwnership(payment.order.userId, userId);
    this.assertConfirmablePayment(payment.order, payment, dto.amount);
    this.assertNotBankTransfer(payment);

    let result: Awaited<ReturnType<PaymentGateway['confirm']>>;
    try {
      const gateway = this.resolveGatewayByType(payment.gateway);
      result = idempotencyKey
        ? await gateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber, { idempotencyKey, rawResponse: payment.rawResponse })
        : await gateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber, { rawResponse: payment.rawResponse });
    } catch (err) {
      await this.dataSource.transaction(async (manager) => {
        const lockedPayment = await this.loadLockedPayment(dto.orderId, manager);

        if (this.isDuplicateLikeConfirmError(err)) {
          throw new ConflictException('이미 승인된 결제입니다.');
        }

        if (!idempotencyKey) {
          this.assertPendingBeforeFailureRecovery(lockedPayment.order, lockedPayment);
          await this.applyFailedPaymentRecovery(manager, lockedPayment.id, dto.orderId);
        }
      });

      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('결제 승인에 실패했습니다.');
    }
    this.assertProviderBinding(payment, result);

    const paidAt = new Date();

    try {
      const outcome = await this.dataSource.transaction(async (manager) => {
        const lockedPayment = await this.loadLockedPayment(dto.orderId, manager);
        const lockedOrder = lockedPayment.order;
        const existingShipping = await manager.findOne(Shipping, {
          where: { orderId: dto.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        this.assertConfirmablePayment(lockedOrder, lockedPayment, dto.amount);

        await manager.update(Payment, lockedPayment.id, {
          status: PaymentStatus.CONFIRMED,
          paymentKey: result.paymentKey,
          method: result.method as PaymentMethod,
          paidAt,
          rawResponse: lockedPayment.gateway === PaymentGatewayType.STRIPE
            ? { ...(lockedPayment.rawResponse ?? {}), stripePaymentIntent: result.rawResponse }
            : result.rawResponse,
        });
        await manager.update(Order, dto.orderId, { status: OrderStatus.PAID });

        let isFirstPurchase = false;
        if (this.orderEventEmitter && lockedOrder.userId !== null) {
          const paidOrderCount = await manager.count(Order, {
            where: {
              userId: lockedOrder.userId,
              status: In([
                OrderStatus.PAID,
                OrderStatus.PREPARING,
                OrderStatus.SHIPPED,
                OrderStatus.DELIVERED,
                OrderStatus.COMPLETED,
              ]),
            },
          });
          isFirstPurchase = paidOrderCount <= 1;
        }

        if (!existingShipping) {
          await manager.save(Shipping, {
            orderId: dto.orderId,
            carrier: this.paymentConfig.defaultCarrier,
            status: ShippingStatus.PAYMENT_CONFIRMED,
          });
        }

        const payload = this.buildPostCommitPayload(lockedOrder, {
          amount: Number(lockedPayment.amount),
          customerType: 'member',
          isFirstPurchase,
          method: result.method,
        });

        const response: ConfirmResponse = {
          paymentId: Number(lockedPayment.id),
          orderId: dto.orderId,
          orderNumber: lockedOrder.orderNumber,
          status: PaymentStatus.CONFIRMED,
          method: result.method,
          amount: Number(lockedPayment.amount),
          paidAt,
        };
        if (persistResult) await persistResult(manager, response);
        return { payload, response };
      });

      this.dispatchPostCommit(outcome.payload);
      this.logger.log(`Payment confirmed: orderId=${dto.orderId} customerType=member`);
      return outcome.response;
    } catch (err) {
      if (err instanceof ConflictException || err instanceof UnauthorizedException) {
        throw err;
      }
      if (!idempotencyKey) {
        await this.persistConfirmationReconciliation(payment.id, dto.orderId, result, paidAt, err);
      }
      throw new InternalServerErrorException('결제 승인 후 동기화에 실패했습니다.');
    }
  }

  async assertGuestAccessTokenActive(orderId: number, guestAccessToken: string): Promise<void> {
    await this.guestOrderAccessService.getValidAccessOrThrow(orderId, guestAccessToken);
  }

  async confirmGuest(
    orderId: number,
    dto: GuestConfirmPaymentDto,
    guestAccessToken: string,
    idempotencyKey?: string,
    persistResult?: (manager: EntityManager, response: GuestConfirmResponse) => Promise<void>,
  ): Promise<GuestConfirmResponse> {
    await this.assertGuestAccessTokenActive(orderId, guestAccessToken);

    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    this.assertConfirmablePayment(payment.order, payment, dto.amount);
    this.assertNotBankTransfer(payment);

    let result: Awaited<ReturnType<PaymentGateway['confirm']>>;
    try {
      const gateway = this.resolveGatewayByType(payment.gateway);
      result = idempotencyKey
        ? await gateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber, { idempotencyKey, rawResponse: payment.rawResponse })
        : await gateway.confirm(dto.paymentKey, Number(payment.amount), payment.order.orderNumber, { rawResponse: payment.rawResponse });
    } catch (err) {
      return this.guestOrderAccessService.withOrderAccessLock(orderId, async (manager) => {
        await this.guestOrderAccessService.getValidAccessOrThrow(
          orderId,
          guestAccessToken,
          manager,
        );
        const lockedPayment = await this.loadLockedPayment(orderId, manager);

        if (this.isDuplicateLikeConfirmError(err)) {
          throw new ConflictException('이미 승인된 결제입니다.');
        }

        if (!idempotencyKey) {
          this.assertPendingBeforeFailureRecovery(lockedPayment.order, lockedPayment);
          await this.applyFailedPaymentRecovery(manager, lockedPayment.id, orderId);
        }

        if (err instanceof ConflictException || err instanceof BadRequestException) {
          throw err;
        }
        throw new InternalServerErrorException('결제 승인에 실패했습니다.');
      });
    }
    this.assertProviderBinding(payment, result);

    const paidAt = new Date();
    try {
      const outcome = await this.guestOrderAccessService.withOrderAccessLock(
        orderId,
        async (manager) => {
          await this.guestOrderAccessService.getValidAccessOrThrow(
            orderId,
            guestAccessToken,
            manager,
          );
          const lockedPayment = await this.loadLockedPayment(orderId, manager);
          const lockedOrder = lockedPayment.order;
          const shipping = await manager.findOne(Shipping, {
            where: { orderId },
            lock: { mode: 'pessimistic_write' },
          });

          this.assertConfirmablePayment(lockedOrder, lockedPayment, dto.amount);

          await manager.update(Payment, lockedPayment.id, {
            status: PaymentStatus.CONFIRMED,
            paymentKey: result.paymentKey,
            method: result.method as PaymentMethod,
            paidAt,
            rawResponse: lockedPayment.gateway === PaymentGatewayType.STRIPE
              ? { ...(lockedPayment.rawResponse ?? {}), stripePaymentIntent: result.rawResponse }
              : result.rawResponse,
          });
          await manager.update(Order, orderId, { status: OrderStatus.PAID });

          if (!shipping) {
            await manager.save(Shipping, {
              orderId,
              carrier: this.paymentConfig.defaultCarrier,
              status: ShippingStatus.PAYMENT_CONFIRMED,
            });
          }

          const rotatedAccess = await this.guestOrderAccessService.rotateAccessTokenForOrder(
            orderId,
            guestAccessToken,
            manager,
          );
          const payload = this.buildPostCommitPayload(lockedOrder, {
            amount: Number(lockedPayment.amount),
            customerType: 'guest',
            isFirstPurchase: false,
            method: result.method,
          });

          const response: GuestConfirmResponse = {
            paymentId: Number(lockedPayment.id),
            orderId,
            orderNumber: lockedOrder.orderNumber,
            status: PaymentStatus.CONFIRMED,
            method: result.method,
            amount: Number(lockedPayment.amount),
            paidAt,
            guestAccessToken: rotatedAccess.guestAccessToken,
            guestAccessTokenExpiresAt: rotatedAccess.guestAccessTokenExpiresAt.toISOString(),
          };
          if (persistResult) await persistResult(manager, response);
          return { payload, response };
        },
      );

      this.dispatchPostCommit(outcome.payload);
      this.logger.log(`Payment confirmed: orderId=${orderId} customerType=guest`);
      return outcome.response;
    } catch (err) {
      if (err instanceof ConflictException) {
        throw err;
      }
      if (!idempotencyKey) {
        await this.persistConfirmationReconciliation(payment.id, orderId, result, paidAt, err);
      }
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new InternalServerErrorException('결제 승인 후 동기화에 실패했습니다.');
    }
  }

  async reconcileConfirmedPayment(orderId: number): Promise<void> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );

    if (
      payment.status !== PaymentStatus.CONFIRMED ||
      payment.order.status !== OrderStatus.PENDING ||
      !this.readConfirmationReconciliation(payment.rawResponse)
    ) {
      throw new BadRequestException('재동기화 가능한 결제 상태가 아닙니다.');
    }

    const outcome = await this.dataSource.transaction(async (manager) => {
      const lockedPayment = await this.loadLockedPayment(orderId, manager);
      const lockedOrder = lockedPayment.order;
      const reconciliation = this.readConfirmationReconciliation(lockedPayment.rawResponse);
      const existingShipping = await manager.findOne(Shipping, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        lockedPayment.status !== PaymentStatus.CONFIRMED ||
        lockedOrder.status !== OrderStatus.PENDING ||
        !reconciliation
      ) {
        throw new BadRequestException('재동기화 가능한 결제 상태가 아닙니다.');
      }

      const providerRawResponse = this.unwrapConfirmationRawResponse(lockedPayment.rawResponse);
      if (providerRawResponse) {
        await manager.update(Payment, lockedPayment.id, {
          rawResponse: providerRawResponse,
        });
      }

      await manager.update(Order, orderId, { status: OrderStatus.PAID });

      let isFirstPurchase = false;
      const customerType: CustomerType = lockedOrder.userId === null ? 'guest' : 'member';
      if (this.orderEventEmitter && customerType === 'member') {
        const paidOrderCount = await manager.count(Order, {
          where: {
            userId: Number(lockedOrder.userId),
            status: In([
              OrderStatus.PAID,
              OrderStatus.PREPARING,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
              OrderStatus.COMPLETED,
            ]),
          },
        });
        isFirstPurchase = paidOrderCount <= 1;
      }

      if (!existingShipping) {
        await manager.save(Shipping, {
          orderId,
          carrier: this.paymentConfig.defaultCarrier,
          status: ShippingStatus.PAYMENT_CONFIRMED,
        });
      }

      return this.buildPostCommitPayload(lockedOrder, {
        amount: Number(lockedPayment.amount),
        customerType,
        isFirstPurchase,
        method: lockedPayment.method,
      });
    });

    this.dispatchPostCommit(outcome);
    this.logger.log(
      `Payment reconciliation replayed: orderId=${orderId} customerType=${outcome.customerType}`,
    );
  }

  private assertConfirmablePayment(order: Order, payment: Payment, amount: number): void {
    if (payment.status === PaymentStatus.CONFIRMED || order.status === OrderStatus.PAID) {
      throw new ConflictException('이미 승인된 결제입니다.');
    }
    if (payment.status !== PaymentStatus.PENDING || order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('결제 승인이 불가능한 상태입니다.');
    }
    if (Number(order.totalAmount) !== Number(amount)) {
      throw new BadRequestException('결제 금액이 일치하지 않습니다.');
    }
  }

  private assertNotBankTransfer(payment: Payment): void {
    if (payment.method === PaymentMethod.BANK_TRANSFER) {
      throw new BadRequestException('무통장 입금은 관리자 입금 확인 후 처리됩니다.');
    }
  }

  private assertProviderBinding(
    payment: Payment,
    result: Awaited<ReturnType<PaymentGateway['confirm']>>,
  ): void {
    if (
      !payment.providerOrderReference ||
      payment.expectedProviderAmount === null ||
      !payment.expectedProviderCurrency ||
      !payment.localOrderReference ||
      !result.providerTransactionId ||
      !result.providerOrderReference ||
      result.providerAmount === undefined ||
      !result.providerCurrency ||
      result.providerOrderReference !== payment.providerOrderReference ||
      Number(result.providerAmount) !== Number(payment.expectedProviderAmount) ||
      result.providerCurrency.toUpperCase() !== payment.expectedProviderCurrency.toUpperCase()
    ) {
      throw new BadRequestException('결제 거래 바인딩이 일치하지 않습니다.');
    }
    if (
      payment.providerTransactionId &&
      result.providerTransactionId !== payment.providerTransactionId
    ) {
      throw new BadRequestException('결제 거래 식별자가 일치하지 않습니다.');
    }
  }

  private assertMemberOwnership(orderUserId: number | null, userId: number): void {
    if (orderUserId === null) {
      throw new ForbiddenException('접근 권한이 없습니다.');
    }

    assertOwnership(orderUserId, userId);
  }

  private assertPendingBeforeFailureRecovery(order: Order, payment: Payment): void {
    if (payment.status === PaymentStatus.CONFIRMED || order.status === OrderStatus.PAID) {
      throw new ConflictException('이미 승인된 결제입니다.');
    }
    if (payment.status !== PaymentStatus.PENDING || order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('결제 승인이 불가능한 상태입니다.');
    }
  }

  private isDuplicateLikeConfirmError(err: unknown): boolean {

    const details = [
      err instanceof Error ? err.message : '',
      this.readNestedErrorText(err, 'code'),
      this.readNestedErrorText(err, 'type'),
      this.readNestedErrorText(err, 'status'),
      this.readNestedErrorText(err, 'statusCode'),
      this.readNestedErrorText(err, 'response.status'),
      this.readNestedErrorText(err, 'response.statusCode'),
      this.readNestedErrorText(err, 'response.code'),
      this.readNestedErrorText(err, 'response.errorCode'),
      this.readNestedErrorText(err, 'response.message'),
      this.readNestedErrorText(err, 'response.error'),
      this.readNestedErrorText(err, 'body.code'),
      this.readNestedErrorText(err, 'body.message'),
      this.readNestedErrorText(err, 'rawResponse.code'),
      this.readNestedErrorText(err, 'rawResponse.message'),
    ]
      .filter((value) => value.length > 0)
      .join(' ')
      .toLowerCase();

    return (
      details.includes('already captured') ||
      details.includes('already approved') ||
      details.includes('already paid') ||
      ((details.includes('duplicate') || details.includes('idempot')) &&
        details.includes('captured'))
    );
  }


  private readNestedErrorText(err: unknown, path: string): string {
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

  private buildPostCommitPayload(
    order: Order,
    args: { amount: number; customerType: CustomerType; isFirstPurchase: boolean; method: string },
  ): PostCommitPayload {
    return {
      userId: args.customerType === 'member' ? order.userId : null,
      orderId: Number(order.id),
      orderNumber: order.orderNumber,
      recipientName: order.recipientName,
      amount: args.amount,
      method: args.method,
      locale: order.orderLocale,
      customerType: args.customerType,
      isFirstPurchase: args.customerType === 'member' ? args.isFirstPurchase : false,
      guestEmail: args.customerType === 'guest' ? order.guestEmailNormalized : null,
    };
  }

  private dispatchPostCommit(payload: PostCommitPayload): void {
    this.orderEventEmitter?.emitOrderCompleted(
      new OrderCompletedEvent(
        payload.userId,
        payload.orderId,
        payload.orderNumber,
        payload.isFirstPurchase,
        payload.customerType,
      ),
    );

    void this.notifyPaymentConfirmed(payload).catch((err) => {
      this.logger.warn(`Failed to send payment confirmed email: ${String(err)}`);
    });

    if (payload.customerType === 'member') {
      void this.messageNotificationService?.sendPaymentConfirmed(payload.orderId, payload.method);
    }
  }

  private async notifyPaymentConfirmed(payload: PostCommitPayload): Promise<void> {
    const order = await this.loadOrderForNotification(payload.orderId);
    const send = (recipient: { email: string }) =>
      this.notificationService.sendPaymentConfirmed(recipient.email, {
        recipientName: payload.recipientName,
        orderNumber: payload.orderNumber,
        amount: payload.amount,
        method: payload.method,
        locale: payload.locale,
        orderItems: buildOrderEmailItems(order, payload.locale),
        orderUrl:
          payload.customerType === 'member'
            ? buildOrderUrl(payload.orderId, payload.locale)
            : buildGuestOrderLookupUrl(payload.locale),
      });

    if (payload.customerType === 'member' && payload.userId !== null) {
      await this.notificationDispatchHelper.dispatch({
        event: 'payment.confirmed',
        userId: payload.userId,
        resourceId: payload.orderId,
        mode: 'fire-and-forget',
        logger: this.logger,
        send,
      });
      return;
    }

    await this.notificationDispatchHelper.dispatch({
      event: 'payment.confirmed',
      recipient: {
        email: payload.guestEmail ?? '',
        name: payload.recipientName,
      },
      resourceId: payload.orderId,
      mode: 'fire-and-forget',
      logger: this.logger,
      send,
    });
  }

  private async loadOrderForNotification(orderId: number): Promise<Order | null> {
    return typeof this.orderRepository.findOne === 'function'
      ? this.orderRepository.findOne({
          where: { id: orderId },
          relations: ['items'],
        })
      : null;
  }

  private readConfirmationReconciliation(rawResponse: unknown): Record<string, unknown> | null {
    if (typeof rawResponse !== 'object' || rawResponse === null || Array.isArray(rawResponse)) {
      return null;
    }

    const record = rawResponse as Record<string, unknown>;
    if (
      record.reconciliationRequired !== true ||
      (record.gatewayConfirmationSucceeded !== true &&
        record.gatewayConfirmationDuplicateLike !== true)
    ) {
      return null;
    }

    return record;
  }

  private unwrapConfirmationRawResponse(rawResponse: unknown): object | null {
    const reconciliation = this.readConfirmationReconciliation(rawResponse);
    const providerRawResponse = reconciliation?.rawResponse;
    if (
      typeof providerRawResponse !== 'object' ||
      providerRawResponse === null ||
      Array.isArray(providerRawResponse)
    ) {
      return null;
    }

    return providerRawResponse as object;
  }
  private async persistConfirmationReconciliation(
    paymentId: number,
    orderId: number,
    result: Awaited<ReturnType<PaymentGateway['confirm']>>,
    paidAt: Date,
    err: unknown,
  ): Promise<void> {
    await this.paymentRepository.update(paymentId, {
      status: PaymentStatus.CONFIRMED,
      paymentKey: result.paymentKey,
      method: result.method as PaymentMethod,
      paidAt,
      rawResponse: {
        gatewayConfirmationSucceeded: true,
        reconciliationRequired: true,
        orderId,
        rawResponse: result.rawResponse,
        error: err instanceof Error ? err.message : String(err),
      } as object,
    });
  }

  private async loadLockedPayment(orderId: number, manager: EntityManager): Promise<Payment> {
    const payment = await manager.findOne(Payment, {
      where: { orderId },
      relations: ['order'],
      lock: { mode: 'pessimistic_write' },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    return payment;
  }

  private async applyFailedPaymentRecovery(
    manager: EntityManager,
    paymentId: number,
    orderId: number,
  ): Promise<void> {
    const recovery = await runFirstTerminalTransitionRecovery(manager, {
      orderId,
      nextOrderStatus: OrderStatus.CANCELLED,
      pointsService: this.pointsService,
      pointRestoreDescription: `주문 ${orderId} 결제 승인 실패로 인한 적립금 복구`,
      applyMutations: async (lockedOrder) => {
        if (lockedOrder.status !== OrderStatus.PENDING) {
          return false;
        }

        assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);
        await manager.update(Payment, paymentId, { status: PaymentStatus.FAILED });
        await manager.update(Order, orderId, { status: OrderStatus.CANCELLED });
        return true;
      },
    });

    if (!recovery.lockedOrder) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }
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
}
