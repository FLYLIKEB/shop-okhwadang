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
import {
  PaymentCompletionEffectPayload,
  PaymentEffectType,
} from '../entities/payment-effect-outbox.entity';
import { PaymentEffectOutboxService } from './payment-effect-outbox.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { IdempotencyOperation } from '../../../common/entities/idempotency-operation.entity';

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
type PostCommitPayload = PaymentCompletionEffectPayload;
type PreparedBinding = Pick<Payment,
  'providerTransactionId' | 'providerOrderReference' | 'expectedProviderAmount' |
  'expectedProviderCurrency' | 'localOrderReference'>;

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
    private readonly effectOutbox: PaymentEffectOutboxService,
    private readonly idempotencyService: IdempotencyService,
  ) {}

  async confirm(
    dto: ConfirmPaymentDto,
    userId: number,
    idempotencyKey?: string,
    persistResult?: (manager: EntityManager, response: ConfirmResponse) => Promise<void>,
    idempotencyOperation?: Pick<IdempotencyOperation, 'id' | 'scope'>,
  ): Promise<ConfirmResponse> {
    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId: dto.orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    this.assertMemberOwnership(payment.order.userId, userId);
    this.assertNotBankTransfer(payment);
    const operationKey = idempotencyKey || dto.paymentKey;
    const reservedPayment = await this.reserveConfirmation(dto.orderId, dto.amount, operationKey);

    let result: Awaited<ReturnType<PaymentGateway['confirm']>>;
    try {
      const gateway = this.resolveGatewayByType(reservedPayment.gateway);
      result = idempotencyKey
        ? await gateway.confirm(dto.paymentKey, Number(reservedPayment.amount), reservedPayment.order.orderNumber, { idempotencyKey, rawResponse: reservedPayment.rawResponse, ...(reservedPayment.order.totalUsd != null ? { totalUsd: Number(reservedPayment.order.totalUsd) } : {}) })
        : await gateway.confirm(dto.paymentKey, Number(reservedPayment.amount), reservedPayment.order.orderNumber, { rawResponse: reservedPayment.rawResponse, ...(reservedPayment.order.totalUsd != null ? { totalUsd: Number(reservedPayment.order.totalUsd) } : {}) });
    } catch (err) {
      await this.dataSource.transaction(async (manager) => {
        if (this.isDuplicateLikeConfirmError(err)) {
          throw new ConflictException('이미 승인된 결제입니다.');
        }

        if (err instanceof BadRequestException) {
          await this.applyFailedPaymentRecovery(manager, dto.orderId, operationKey);
        }
      });

      if (err instanceof ConflictException || err instanceof BadRequestException) {
        throw err;
      }
      throw new InternalServerErrorException('결제 승인에 실패했습니다.');
    }
    const paidAt = new Date();

    try {
      this.assertProviderBinding(reservedPayment, result);
      const outcome = await this.dataSource.transaction(async (manager) => {
        const lockedPayment = await this.loadLockedPayment(dto.orderId, manager);
        const lockedOrder = lockedPayment.order;
        const existingShipping = await manager.findOne(Shipping, {
          where: { orderId: dto.orderId },
          lock: { mode: 'pessimistic_write' },
        });

        if (
          lockedOrder.status !== OrderStatus.PENDING
          || lockedPayment.status !== PaymentStatus.CONFIRMING
          || lockedPayment.confirmationOperationKey !== operationKey
        ) {
          throw new ConflictException('결제 승인 작업의 소유권이 없습니다.');
        }

        await manager.update(Payment, lockedPayment.id, {
          status: PaymentStatus.CONFIRMED,
          confirmationOperationKey: null,
          paymentKey: result.paymentKey,
          providerTransactionId: result.providerTransactionId,
          providerOrderReference: result.providerOrderReference,
          expectedProviderAmount: result.providerAmount,
          expectedProviderCurrency: result.providerCurrency?.toUpperCase(),
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
        await this.enqueuePaymentEffects(manager, dto.orderId, payload);
        if (persistResult) await persistResult(manager, response);
        return { payload, response };
      });

      this.logger.log(`Payment confirmed: orderId=${dto.orderId} customerType=member`);
      return outcome.response;
    } catch (err) {
      await this.persistConfirmationReconciliation(reservedPayment, operationKey, result, paidAt, err, idempotencyOperation);
      if (err instanceof BadRequestException) throw err;
      if (err instanceof ConflictException || err instanceof UnauthorizedException) {
        throw err;
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
    idempotencyOperation?: Pick<IdempotencyOperation, 'id' | 'scope'>,
  ): Promise<GuestConfirmResponse> {
    await this.assertGuestAccessTokenActive(orderId, guestAccessToken);

    const payment = await findOrThrow(
      this.paymentRepository,
      { orderId },
      '결제 정보를 찾을 수 없습니다.',
      ['order'],
    );
    this.assertNotBankTransfer(payment);
    const operationKey = idempotencyKey || dto.paymentKey;
    const reservedPayment = await this.reserveConfirmation(orderId, dto.amount, operationKey);

    let result: Awaited<ReturnType<PaymentGateway['confirm']>>;
    try {
      const gateway = this.resolveGatewayByType(reservedPayment.gateway);
      result = idempotencyKey
        ? await gateway.confirm(dto.paymentKey, Number(reservedPayment.amount), reservedPayment.order.orderNumber, { idempotencyKey, rawResponse: reservedPayment.rawResponse, ...(reservedPayment.order.totalUsd != null ? { totalUsd: Number(reservedPayment.order.totalUsd) } : {}) })
        : await gateway.confirm(dto.paymentKey, Number(reservedPayment.amount), reservedPayment.order.orderNumber, { rawResponse: reservedPayment.rawResponse, ...(reservedPayment.order.totalUsd != null ? { totalUsd: Number(reservedPayment.order.totalUsd) } : {}) });
    } catch (err) {
      return this.guestOrderAccessService.withOrderAccessLock(orderId, async (manager) => {
        await this.guestOrderAccessService.getValidAccessOrThrow(
          orderId,
          guestAccessToken,
          manager,
        );
        if (this.isDuplicateLikeConfirmError(err)) {
          throw new ConflictException('이미 승인된 결제입니다.');
        }

        if (err instanceof BadRequestException) {
          await this.applyFailedPaymentRecovery(manager, orderId, operationKey);
        }

        if (err instanceof ConflictException || err instanceof BadRequestException) {
          throw err;
        }
        throw new InternalServerErrorException('결제 승인에 실패했습니다.');
      });
    }
    const paidAt = new Date();
    try {
      this.assertProviderBinding(reservedPayment, result);
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

          if (
            lockedOrder.status !== OrderStatus.PENDING
            || lockedPayment.status !== PaymentStatus.CONFIRMING
            || lockedPayment.confirmationOperationKey !== operationKey
          ) {
            throw new ConflictException('결제 승인 작업의 소유권이 없습니다.');
          }

          await manager.update(Payment, lockedPayment.id, {
            status: PaymentStatus.CONFIRMED,
            confirmationOperationKey: null,
            paymentKey: result.paymentKey,
            providerTransactionId: result.providerTransactionId,
            providerOrderReference: result.providerOrderReference,
            expectedProviderAmount: result.providerAmount,
            expectedProviderCurrency: result.providerCurrency?.toUpperCase(),
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
          await this.enqueuePaymentEffects(manager, orderId, payload);
          if (persistResult) await persistResult(manager, response);
          return { payload, response };
        },
      );

      this.logger.log(`Payment confirmed: orderId=${orderId} customerType=guest`);
      return outcome.response;
    } catch (err) {
      await this.persistConfirmationReconciliation(reservedPayment, operationKey, result, paidAt, err, idempotencyOperation);
      if (err instanceof BadRequestException) throw err;
      if (err instanceof ConflictException) {
        throw err;
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
      ![PaymentStatus.CONFIRMED, PaymentStatus.CONFIRMING].includes(payment.status) ||
      payment.order.status !== OrderStatus.PENDING ||
      !this.readConfirmationReconciliation(payment.rawResponse)
    ) {
      throw new BadRequestException('재동기화 가능한 결제 상태가 아닙니다.');
    }

    const reconcile = async (manager: EntityManager) => {
      const lockedPayment = await this.loadLockedPayment(orderId, manager);
      const lockedOrder = lockedPayment.order;
      const reconciliation = this.readConfirmationReconciliation(lockedPayment.rawResponse);
      const existingShipping = await manager.findOne(Shipping, {
        where: { orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (
        ![PaymentStatus.CONFIRMED, PaymentStatus.CONFIRMING].includes(lockedPayment.status) ||
        lockedOrder.status !== OrderStatus.PENDING ||
        !reconciliation
      ) {
        throw new BadRequestException('재동기화 가능한 결제 상태가 아닙니다.');
      }

      const result = reconciliation.confirmationResult as Awaited<ReturnType<PaymentGateway['confirm']>> | undefined;
      if (result) {
        if (!reconciliation.preparedBinding) {
          throw new BadRequestException('결제 준비 거래 증거를 확인해주세요.');
        }
        this.assertProviderBinding(reconciliation.preparedBinding as PreparedBinding, result);
        this.assertProviderBinding(lockedPayment, result);
      }
      if (lockedPayment.status === PaymentStatus.CONFIRMING) {
        if (
          !result ||
          !lockedPayment.confirmationOperationKey ||
          reconciliation.confirmationOperationKey !== lockedPayment.confirmationOperationKey ||
          !reconciliation.preparedBinding
        ) {
          throw new BadRequestException('결제 승인 증거와 작업 소유권을 확인해주세요.');
        }
        await manager.update(Payment, lockedPayment.id, {
          status: PaymentStatus.CONFIRMED,
          confirmationOperationKey: null,
          paymentKey: result.paymentKey,
          providerTransactionId: result.providerTransactionId,
          method: result.method as PaymentMethod,
          paidAt: new Date(reconciliation.paidAt as string),
          rawResponse: lockedPayment.gateway === PaymentGatewayType.STRIPE
            ? { ...((reconciliation.preparedRawResponse as object) ?? {}), stripePaymentIntent: result.rawResponse }
            : result.rawResponse,
        });
      } else {
        const providerRawResponse = this.unwrapConfirmationRawResponse(lockedPayment.rawResponse);
        if (providerRawResponse) {
          await manager.update(Payment, lockedPayment.id, { rawResponse: providerRawResponse });
        }
      }

      let isFirstPurchase = false;
      const customerType: CustomerType = lockedOrder.userId === null ? 'guest' : 'member';
      const operationReference = reconciliation.idempotencyOperation as Pick<IdempotencyOperation, 'id' | 'scope'> | undefined;
      if (operationReference) {
        const operation = await manager.getRepository(IdempotencyOperation).findOne({
          where: {
            id: operationReference.id,
            scope: operationReference.scope,
            operation: customerType === 'member' ? 'payment.confirm' : 'guest-payment.confirm',
            key: String(reconciliation.confirmationOperationKey).trim(),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !operation || operation.status !== 'pending' || !operation.leaseOwner ||
          (customerType === 'member'
            ? operation.scope !== `member:${lockedOrder.userId}`
            : !/^guest-token:[a-f0-9]{64}$/.test(operation.scope))
        ) {
          throw new ConflictException('결제 승인 요청의 작업 소유권을 확인해주세요.');
        }
        const response: ConfirmResponse = {
          paymentId: Number(lockedPayment.id),
          orderId,
          orderNumber: lockedOrder.orderNumber,
          status: PaymentStatus.CONFIRMED,
          method: result?.method ?? lockedPayment.method,
          amount: Number(lockedPayment.amount),
          paidAt: result ? new Date(reconciliation.paidAt as string) : lockedPayment.paidAt!,
        };
        let replayResponse: ConfirmResponse | GuestConfirmResponse = response;
        if (customerType === 'guest') {
          const rotatedAccess = await this.guestOrderAccessService.rotateAccessTokenForDigest(
            orderId, operation.scope.slice('guest-token:'.length), manager,
          );
          replayResponse = {
            ...response,
            guestAccessToken: rotatedAccess.guestAccessToken,
            guestAccessTokenExpiresAt: rotatedAccess.guestAccessTokenExpiresAt.toISOString(),
          };
        }
        await this.idempotencyService.complete(manager, operation.id, operation.leaseOwner, replayResponse);
      }
      await manager.update(Order, orderId, { status: OrderStatus.PAID });
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

      const payload = this.buildPostCommitPayload(lockedOrder, {
        amount: Number(lockedPayment.amount),
        customerType,
        isFirstPurchase,
        method: result?.method ?? lockedPayment.method,
      });
      await this.enqueuePaymentEffects(manager, orderId, payload);
      return payload;
    };
    const outcome = payment.order.userId === null
      ? await this.guestOrderAccessService.withOrderAccessLock(orderId, reconcile)
      : await this.dataSource.transaction(reconcile);

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
    payment: PreparedBinding,
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

  private async enqueuePaymentEffects(
    manager: EntityManager,
    orderId: number,
    payload: PaymentCompletionEffectPayload,
  ): Promise<void> {
    await this.effectOutbox.enqueueWithManager(
      manager, orderId, PaymentEffectType.ORDER_COMPLETED_EVENT, payload,
    );
    await this.effectOutbox.enqueueWithManager(
      manager, orderId, PaymentEffectType.PAYMENT_CONFIRMED_NOTIFICATION, payload,
    );
    await this.effectOutbox.enqueueWithManager(
      manager,
      orderId,
      payload.customerType === 'member'
        ? PaymentEffectType.MEMBER_MESSAGE_NOTIFICATION
        : PaymentEffectType.GUEST_MESSAGE_NOTIFICATION,
      payload,
    );
  }

  async deliverOrderCompleted(
    payload: PaymentCompletionEffectPayload,
    idempotencyKey: string,
  ): Promise<void> {
    await this.orderEventEmitter?.emitOrderCompleted(
      new OrderCompletedEvent(
        payload.userId,
        payload.orderId,
        payload.orderNumber,
        payload.isFirstPurchase,
        payload.customerType,
        idempotencyKey,
      ),
    );
  }

  async deliverPaymentConfirmedNotification(
    payload: PaymentCompletionEffectPayload,
    idempotencyKey: string,
  ): Promise<void> {
    await this.notifyPaymentConfirmed(payload, idempotencyKey);
  }

  async deliverMessageNotification(
    payload: PaymentCompletionEffectPayload,
    idempotencyKey: string,
  ): Promise<void> {
    await this.messageNotificationService?.sendPaymentConfirmedOrThrow(payload.orderId, payload.method, idempotencyKey);
  }

  private async notifyPaymentConfirmed(payload: PostCommitPayload, idempotencyKey: string): Promise<void> {
    const order = await this.loadOrderForNotification(payload.orderId);
    const send = (recipient: { email: string }) =>
      this.notificationService.sendPaymentConfirmedOrThrow(recipient.email, {
        recipientName: payload.recipientName,
        orderNumber: payload.orderNumber,
        amount: payload.amount,
        ...(order?.totalUsd != null ? { amountUsd: Number(order.totalUsd) } : {}),
        method: payload.method,
        locale: payload.locale,
        orderItems: buildOrderEmailItems(order, payload.locale),
        orderUrl:
          payload.customerType === 'member'
            ? buildOrderUrl(payload.orderId, payload.locale)
            : buildGuestOrderLookupUrl(payload.locale),
      }, idempotencyKey);

    if (payload.customerType === 'member' && payload.userId !== null) {
      await this.notificationDispatchHelper.dispatch({
        event: 'payment.confirmed',
        userId: payload.userId,
        resourceId: `payment-completion:${payload.orderId}:${idempotencyKey}`,
        mode: 'await',
        propagateFailure: true,
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
      resourceId: `payment-completion:${payload.orderId}:${idempotencyKey}`,
      mode: 'await',
      propagateFailure: true,
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
    payment: Payment,
    operationKey: string,
    result: Awaited<ReturnType<PaymentGateway['confirm']>>,
    paidAt: Date,
    err: unknown,
    idempotencyOperation?: Pick<IdempotencyOperation, 'id' | 'scope'>,
  ): Promise<void> {
    await this.paymentRepository.update({
      id: payment.id,
      status: PaymentStatus.CONFIRMING,
      confirmationOperationKey: operationKey,
    }, {
      rawResponse: {
        reconciliationRequired: true,
        gatewayConfirmationSucceeded: true,
        orderId: payment.orderId,
        confirmationOperationKey: operationKey,
        idempotencyOperation,
        confirmationResult: result,
        preparedBinding: {
          providerTransactionId: payment.providerTransactionId,
          providerOrderReference: payment.providerOrderReference,
          expectedProviderAmount: payment.expectedProviderAmount,
          expectedProviderCurrency: payment.expectedProviderCurrency,
          localOrderReference: payment.localOrderReference,
        },
        preparedRawResponse: payment.rawResponse,
        paidAt: paidAt.toISOString(),
        rawResponse: result.rawResponse,
        error: err instanceof Error ? err.message : String(err),
      } as object,
    });
  }

  private async loadLockedPayment(orderId: number, manager: EntityManager): Promise<Payment> {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    const payment = await manager.findOne(Payment, {
      where: { orderId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!payment) {
      throw new NotFoundException('결제 정보를 찾을 수 없습니다.');
    }

    payment.order = order;
    return payment;
  }

  private async reserveConfirmation(
    orderId: number,
    amount: number,
    operationKey: string,
  ): Promise<Payment> {
    return this.dataSource.transaction(async (manager) => {
      const payment = await this.loadLockedPayment(orderId, manager);
      if ((payment.rawResponse as Record<string, unknown> | null)?.reconciliationRequired === true) {
        throw new ConflictException('결제 승인 결과의 관리자 재동기화가 필요합니다.');
      }
      if (
        payment.status === PaymentStatus.CONFIRMING
        && payment.confirmationOperationKey === operationKey
      ) {
        return { ...payment };
      }
      if (payment.status === PaymentStatus.CONFIRMING) {
        throw new ConflictException('결제 승인 작업이 이미 진행 중입니다.');
      }
      this.assertConfirmablePayment(payment.order, payment, amount);
      await manager.update(Payment, payment.id, {
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: operationKey,
      });
      payment.status = PaymentStatus.CONFIRMING;
      payment.confirmationOperationKey = operationKey;
      return { ...payment };
    });
  }

  private async applyFailedPaymentRecovery(
    manager: EntityManager,
    orderId: number,
    operationKey: string,
  ): Promise<void> {
    let lockedPayment: Payment | null = null;
    const recovery = await runFirstTerminalTransitionRecovery(manager, {
      orderId,
      nextOrderStatus: OrderStatus.CANCELLED,
      pointsService: this.pointsService,
      pointRestoreDescription: `주문 ${orderId} 결제 승인 실패로 인한 적립금 복구`,
      lockBeforeRecovery: async () => {
        lockedPayment = await manager.findOne(Payment, {
          where: { orderId },
          lock: { mode: 'pessimistic_write' },
        });
        if (
          !lockedPayment ||
          lockedPayment.status !== PaymentStatus.CONFIRMING ||
          lockedPayment.confirmationOperationKey !== operationKey
        ) {
          throw new ConflictException('결제 승인 작업의 소유권이 없습니다.');
        }
        return true;
      },
      applyMutations: async (lockedOrder) => {
        if (lockedOrder.status !== OrderStatus.PENDING) {
          return false;
        }

        assertOrderStatusTransition(lockedOrder.status, OrderStatus.CANCELLED);
        await manager.update(Payment, lockedPayment!.id, { status: PaymentStatus.FAILED });
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
