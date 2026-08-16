import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createPaymentConfig } from '../../../config/payment.config';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from '../adapters/inicis.adapter';
import { PayPalPaymentAdapter } from '../adapters/paypal.adapter';
import { EximbayPaymentAdapter } from '../adapters/eximbay.adapter';
import { GuestOrderAccessService } from '../../orders/guest-order-access.service';
import { PointsService } from '../../points/points.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import {
  Payment,
  PaymentGatewayType,
  PaymentMethod,
  PaymentStatus,
} from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 1,
    userId: 10,
    orderNumber: 'ORD-20240101-ABCD1',
    status: OrderStatus.PENDING,
    totalAmount: 30000,
    recipientName: '홍길동',
    ...overrides,
  }) as unknown as Order;

const makePayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 100,
    orderId: 1,
    amount: 30000,
    status: PaymentStatus.PENDING,
    method: PaymentMethod.MOCK,
    gateway: PaymentGatewayType.MOCK,
    paymentKey: null,
    confirmationOperationKey: null,
    providerTransactionId: null,
    providerOrderReference: 'ORD-20240101-ABCD1',
    expectedProviderAmount: 30000,
    expectedProviderCurrency: 'KRW',
    localOrderReference: 'ORD-20240101-ABCD1',
    order: makeOrder(),
    ...overrides,
  }) as unknown as Payment;

const makeTransactionManager = (overrides: Record<string, jest.Mock> = {}) => {
  const order = makeOrder({ pointsUsed: 0 });
  const payment = makePayment({ order });
  return {
  update: jest.fn().mockImplementation((entity: unknown, _id: unknown, changes: Record<string, unknown>) => {
    if (entity === Payment) Object.assign(payment, changes);
    if (entity === Order) Object.assign(order, changes);
    return Promise.resolve({});
  }),
  findOne: jest.fn().mockImplementation((entity: unknown) => {
    if (entity === Payment) {
      return Promise.resolve(payment);
    }
    if (entity === Order) {
      return Promise.resolve(order);
    }
    return Promise.resolve(null);
  }),
  save: jest.fn().mockResolvedValue({}),
  count: jest.fn().mockResolvedValue(1),
  create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
  find: jest.fn().mockResolvedValue([]),
  increment: jest.fn().mockResolvedValue({}),
  ...overrides,
};
};

const makeDataSource = (manager = makeTransactionManager()) => ({
  transaction: jest.fn(
    async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(manager),
  ),
  _manager: manager,
});

interface BuildArgs {
  paymentRepo?: Partial<{
    findOne: jest.Mock;
    update: jest.Mock;
  }>;
  orderRepo?: Partial<{ findOne: jest.Mock; update: jest.Mock }>;
  dataSource?: ReturnType<typeof makeDataSource>;
  defaultGateway?: Partial<PaymentGateway>;
  tossGateway?: Partial<PaymentGateway>;
  stripeGateway?: Partial<PaymentGateway>;
  inicisGateway?: Partial<PaymentGateway>;
  paypalGateway?: Partial<PaymentGateway>;
  eximbayGateway?: Partial<PaymentGateway>;
  notifyDispatch?: jest.Mock;
  notificationSend?: jest.Mock;
  orderEventEmit?: jest.Mock;
}

const makeGateway = (overrides: Partial<PaymentGateway> = {}): PaymentGateway =>
  ({
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
    ...overrides,
  }) as PaymentGateway;

const buildService = (args: BuildArgs = {}) => {
  const paymentRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    ...args.paymentRepo,
  };
  const orderRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    ...args.orderRepo,
  };
  const dataSource = args.dataSource ?? (() => {
    let managedPayment: Payment | null = null;
    let managedOrder: Order | null = null;
    const manager = makeTransactionManager({
      findOne: jest.fn().mockImplementation(async (entity: unknown) => {
        if (entity === Payment) {
          managedPayment = await paymentRepo.findOne({ where: { orderId: 1 } });
          return managedPayment;
        }
        if (entity === Order) {
          managedPayment ??= await paymentRepo.findOne({ where: { orderId: 1 } });
          managedOrder = managedPayment?.order ?? null;
          return managedOrder;
        }
        return null;
      }),
      update: jest.fn().mockImplementation((entity: unknown, _id: unknown, changes: Record<string, unknown>) => {
        if (entity === Payment && managedPayment) Object.assign(managedPayment, changes);
        if (entity === Order && managedOrder) Object.assign(managedOrder, changes);
        return Promise.resolve({});
      }),
    });
    return makeDataSource(manager);
  })();
  const defaultGateway = makeGateway(args.defaultGateway);
  const tossGateway = makeGateway(args.tossGateway);
  const stripeGateway = makeGateway(args.stripeGateway);
  const inicisGateway = makeGateway(args.inicisGateway);
  const paypalGateway = makeGateway(args.paypalGateway);
  const eximbayGateway = makeGateway(args.eximbayGateway);
  const notificationDispatch = args.notifyDispatch ?? jest.fn().mockResolvedValue(undefined);
  const notificationSend = args.notificationSend ?? jest.fn().mockResolvedValue(undefined);
  const orderEventEmit = args.orderEventEmit ?? jest.fn();
  const guestOrderAccessService = {
    getValidAccessOrThrow: jest.fn(),
    withOrderAccessLock: jest.fn(),
    rotateAccessTokenForOrder: jest.fn(),
  };
  const pointsService = {
    getRunningBalanceInTx: jest.fn().mockResolvedValue(2000),
  };

  const service = new PaymentConfirmationService(
    paymentRepo as never,
    orderRepo as never,
    defaultGateway as never,
    createPaymentConfig({
      NODE_ENV: 'development',
      PAYMENT_GATEWAY: 'mock',
      DEFAULT_CARRIER: 'mock',
    }),
    tossGateway as unknown as TossPaymentAdapter,
    stripeGateway as unknown as StripePaymentAdapter,
    inicisGateway as unknown as KGInicisPaymentAdapter,
    paypalGateway as unknown as PayPalPaymentAdapter,
    eximbayGateway as unknown as EximbayPaymentAdapter,
    pointsService as unknown as PointsService,
    dataSource as never,
    { sendPaymentConfirmed: notificationSend } as unknown as NotificationService,
    undefined,
    { dispatch: notificationDispatch } as unknown as NotificationDispatchHelper,
    { emitOrderCompleted: orderEventEmit } as never,
    guestOrderAccessService as unknown as GuestOrderAccessService,
  );

  return {
    service,
    paymentRepo,
    orderRepo,
    dataSource,
    defaultGateway,
    tossGateway,
    stripeGateway,
    inicisGateway,
    paypalGateway,
    eximbayGateway,
    notificationDispatch,
    notificationSend,
    orderEventEmit,
    guestOrderAccessService,
    pointsService,
  };
};

describe('PaymentConfirmationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirm() — 정상 흐름', () => {
    const successfulGatewayResult = {
      paymentKey: 'pay_abc',
      providerTransactionId: 'pay_abc',
      providerOrderReference: 'ORD-20240101-ABCD1',
      providerAmount: 30000,
      providerCurrency: 'KRW',
      method: 'mock',
      amount: 30000,
      status: 'confirmed',
      rawResponse: { mock: true },
    };

    const lockedManager = (payment: Payment) => makeTransactionManager({
      findOne: jest.fn().mockImplementation((entity: unknown) => {
        if (entity === Order) return Promise.resolve(payment.order);
        if (entity === Payment) return Promise.resolve(payment);
        return Promise.resolve(null);
      }),
    });

    it('rejects a different confirmation operation while the payment is CONFIRMING', async () => {
      const payment = makePayment({
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: 'owner-a',
      });
      const manager = lockedManager(payment);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(makePayment()) },
        dataSource: makeDataSource(manager),
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'owner-b', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('resumes a CONFIRMING payment only for its matching operation key', async () => {
      const payment = makePayment({
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: 'owner-a',
      });
      const manager = lockedManager(payment);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(makePayment()) },
        dataSource: makeDataSource(manager),
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue(successfulGatewayResult);

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'owner-a', amount: 30000 }, 10),
      ).resolves.toMatchObject({ status: PaymentStatus.CONFIRMED });
      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        payment.id,
        expect.objectContaining({
          status: PaymentStatus.CONFIRMED,
          confirmationOperationKey: null,
        }),
      );
    });

    it('keeps a CONFIRMING payment unchanged after an ambiguous provider outcome', async () => {
      const payment = makePayment();
      const manager = lockedManager(payment);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(makePayment()) },
        dataSource: makeDataSource(manager),
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(new Error('already captured by provider'));

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'owner-a', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(payment).toMatchObject({
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: 'owner-a',
      });
      expect(manager.update).not.toHaveBeenCalledWith(
        Payment,
        payment.id,
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });

    it('rejects bank transfer confirmation from a client payment key', async () => {
      const payment = makePayment({ method: PaymentMethod.BANK_TRANSFER });
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'arbitrary-client-key', amount: 30000 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
    });

    it('PENDING 결제를 CONFIRMED 로 전환하고 paidAt 을 기록한다', async () => {
      const payment = makePayment();
      const { service, paymentRepo, dataSource, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
        providerTransactionId: 'pay_abc',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });

      const before = Date.now();
      const result = await service.confirm(
        { orderId: 1, paymentKey: 'pay_abc', amount: 30000 },
        10,
      );
      const after = Date.now();

      expect(result.status).toBe(PaymentStatus.CONFIRMED);
      expect(result.method).toBe('mock');
      expect(result.amount).toBe(30000);
      expect(result.paidAt).toBeInstanceOf(Date);
      const paidAt = result.paidAt.getTime();
      expect(paidAt).toBeGreaterThanOrEqual(before);
      expect(paidAt).toBeLessThanOrEqual(after);

      // 트랜잭션 내에서 payment 업데이트 시 paidAt 이 함께 기록되었는지 확인
      const manager = dataSource._manager;
      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        payment.id,
        expect.objectContaining({
          status: PaymentStatus.CONFIRMED,
          paymentKey: 'pay_abc',
          providerTransactionId: 'pay_abc',
          providerOrderReference: 'ORD-20240101-ABCD1',
          expectedProviderAmount: 30000,
          expectedProviderCurrency: 'KRW',
          paidAt: expect.any(Date),
        }),
      );
      expect(paymentRepo.findOne).toHaveBeenCalledWith({
        where: { orderId: 1 },
        relations: ['order'],
      });
    });

    it('order 를 PAID 로 갱신하고 신규 shipping 을 생성한다', async () => {
      const payment = makePayment();
      const { service, dataSource, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
        providerTransactionId: 'pay_abc',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });

      await service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10);

      const manager = dataSource._manager;
      expect(manager.update).toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.PAID,
      });
      expect(manager.save).toHaveBeenCalledWith(
        Shipping,
        expect.objectContaining({
          orderId: 1,
          carrier: 'mock',
          status: ShippingStatus.PAYMENT_CONFIRMED,
        }),
      );
    });

    it('shipping 이 이미 존재하면 새로 생성하지 않는다', async () => {
      const payment = makePayment();
      const existingShipping = { id: 5, orderId: 1 } as Shipping;
      const manager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) {
            return Promise.resolve(payment.order);
          }
          if (entity === Payment) {
            return Promise.resolve(payment);
          }
          if (entity === Shipping) {
            return Promise.resolve(existingShipping);
          }
          return Promise.resolve(null);
        }),
      });
      const dataSource = makeDataSource(manager);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        dataSource,
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
        providerTransactionId: 'pay_abc',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });

      await service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10);

      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('confirm() — 권한/상태 검증', () => {
    it('결제 정보가 없으면 NotFoundException', async () => {
      const { service } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.confirm({ orderId: 999, paymentKey: 'pk', amount: 1000 }, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('타인 주문 → ForbiddenException', async () => {
      const payment = makePayment({
        order: makeOrder({ userId: 99 }),
      });
      const { service } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(ForbiddenException);
    });

    it('이미 CONFIRMED → ConflictException (이중 결제 방지)', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED });
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
    });

    it('PENDING 외 상태 (FAILED) → BadRequestException', async () => {
      const payment = makePayment({ status: PaymentStatus.FAILED });
      const { service } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('REFUNDED 상태 → BadRequestException (환불 후 재결제 거부)', async () => {
      const payment = makePayment({ status: PaymentStatus.REFUNDED });
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
    });

    it('amount 가 주문 totalAmount 와 불일치 → BadRequestException', async () => {
      const payment = makePayment();
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 99999 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
    });
  });

  describe('confirm() — 게이트웨이 분기/실패', () => {
    it('payment.gateway 값으로 어댑터를 라우팅한다 (TOSS)', async () => {
      const payment = makePayment({ gateway: PaymentGatewayType.TOSS });
      const tossAdapter: PaymentGateway = {
        prepare: jest.fn(),
        confirm: jest.fn().mockResolvedValue({
          paymentKey: 'pay_toss',
          providerTransactionId: 'pay_toss',
          providerOrderReference: 'ORD-20240101-ABCD1',
          providerAmount: 30000,
          providerCurrency: 'KRW',
          method: 'card',
          amount: 30000,
          status: 'confirmed',
          rawResponse: { toss: true },
        }),
        cancel: jest.fn(),
        partialCancel: jest.fn(),
        verifyWebhook: jest.fn(),
      };
      const { service, tossGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        tossGateway: tossAdapter,
      });

      await service.confirm({ orderId: 1, paymentKey: 'pay_toss', amount: 30000 }, 10);

      expect(tossGateway.confirm).toHaveBeenCalledWith(
        'pay_toss',
        30000,
        'ORD-20240101-ABCD1',
        { rawResponse: undefined },
      );
    });

    it('ambiguous gateway failures keep payment CONFIRMING for reconciliation', async () => {
      const payment = makePayment();
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, defaultGateway, dataSource } = buildService({ paymentRepo });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(new Error('gateway down'));

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(InternalServerErrorException);
      expect(dataSource._manager.update).toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: 'pk',
      });
      expect(dataSource._manager.update).not.toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.FAILED,
      });
    });

    it('트랜잭션 내부 실패 → confirmation reconciliation marker persisted', async () => {
      const payment = makePayment();
      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('shipping insert 실패')),
      });
      const dataSource = {
        transaction: jest.fn(
          async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) =>
            fn(failingManager),
        ),
        _manager: failingManager,
      };
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, defaultGateway } = buildService({
        paymentRepo,
        dataSource: dataSource as ReturnType<typeof makeDataSource>,
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        providerTransactionId: 'pk',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인 후 동기화에 실패했습니다.');
      expect(paymentRepo.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          rawResponse: expect.objectContaining({
            reconciliationRequired: true,
            orderId: 1,
            error: 'shipping insert 실패',
          }),
        }),
      );
      expect(failingManager.update).not.toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.FAILED,
      });
      expect(failingManager.update).not.toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.CANCELLED,
      });
    });

    it('트랜잭션 내부 실패 후에는 차감 포인트 복구를 수행하지 않는다', async () => {
      const payment = makePayment({
        order: makeOrder({ pointsUsed: 700, status: OrderStatus.PENDING }),
      });
      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('shipping insert 실패')),
      });
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const dataSource = {
        transaction: jest.fn(
          async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) =>
            fn(failingManager),
        ),
        _manager: failingManager,
      };
      const { service, defaultGateway } = buildService({
        paymentRepo,
        dataSource: dataSource as ReturnType<typeof makeDataSource>,
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        providerTransactionId: 'pk',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인 후 동기화에 실패했습니다.');

      expect(failingManager.save).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 10,
          type: 'admin_adjust',
          amount: 700,
          orderId: 1,
        }),
      );
    });

    it('트랜잭션 내부 실패 복구 시 차감 포인트를 같은 트랜잭션에서 자동 복구한다', async () => {
      const payment = makePayment({
        order: makeOrder({ pointsUsed: 700, status: OrderStatus.PENDING }),
      });
      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('shipping insert 실패')),
      });
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const dataSource = {
        transaction: jest.fn(
          async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) =>
            fn(failingManager),
        ),
        _manager: failingManager,
      };
      const { service, defaultGateway } = buildService({
        paymentRepo,
        dataSource: dataSource as ReturnType<typeof makeDataSource>,
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        providerTransactionId: 'pk',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인 후 동기화에 실패했습니다.');

      expect(failingManager.save).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 10,
          type: 'admin_adjust',
          amount: 700,
          orderId: 1,
        }),
      );
      expect(paymentRepo.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          rawResponse: expect.objectContaining({
            reconciliationRequired: true,
            orderId: 1,
            error: 'shipping insert 실패',
          }),
        }),
      );
    });

    it('stale cancelled local state is rejected before the provider call', async () => {
      const payment = makePayment({
        status: PaymentStatus.CANCELLED,
        order: makeOrder({ status: OrderStatus.CANCELLED }),
      });
      const lockedPayment = makePayment({
        status: PaymentStatus.CANCELLED,
        order: makeOrder({ status: OrderStatus.CANCELLED }),
      });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) {
            return Promise.resolve(lockedPayment.order);
          }
          if (entity === Payment) {
            return Promise.resolve(lockedPayment);
          }
          if (entity === Shipping) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
      });
      const dataSource = {
        transaction: jest.fn(
          async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) =>
            fn(manager),
        ),
        _manager: manager,
      };
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, defaultGateway } = buildService({
        paymentRepo,
        dataSource: dataSource as ReturnType<typeof makeDataSource>,
      });
      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
      expect(paymentRepo.update).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('reconcileConfirmedPayment() replays local sync and restores provider raw response', async () => {
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        method: PaymentMethod.MOCK,
        paidAt: new Date('2026-07-27T11:30:00.000Z'),
        rawResponse: {
          gatewayConfirmationSucceeded: true,
          reconciliationRequired: true,
          rawResponse: { provider: true },
        },
        order: makeOrder({ status: OrderStatus.PENDING }),
      });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) {
            return Promise.resolve(payment.order);
          }
          if (entity === Payment) {
            return Promise.resolve(payment);
          }
          if (entity === Shipping) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn().mockResolvedValue(1),
      });
      const dataSource = makeDataSource(manager);
      const { service, orderEventEmit, notificationDispatch } = buildService({
        paymentRepo: {
          findOne: jest.fn().mockResolvedValue(payment),
          update: jest.fn().mockResolvedValue({}),
        },
        dataSource,
      });

      await service.reconcileConfirmedPayment(1);

      expect(manager.update).toHaveBeenCalledWith(Payment, payment.id, {
        rawResponse: { provider: true },
      });
      expect(manager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PAID });
      expect(orderEventEmit).toHaveBeenCalledTimes(1);
      expect(notificationDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment.confirmed',
          userId: 10,
          resourceId: 1,
        }),
      );
    });
  });
  describe('confirm() — duplicate loser local-truth handling', () => {
    it('duplicate-like provider error + authoritative confirmed state → 409 without FAILED/CANCELLED recovery', async () => {
      const payment = makePayment();
      const lockedPayment = makePayment({
        status: PaymentStatus.CONFIRMED,
        order: makeOrder({ status: OrderStatus.PAID }),
      });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockResolvedValue(lockedPayment),
      });
      const dataSource = makeDataSource(manager);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        dataSource,
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(
        new Error('already captured by provider'),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_dup', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(manager.update).not.toHaveBeenCalledWith(Payment, lockedPayment.id, {
        status: PaymentStatus.FAILED,
      });
      expect(manager.update).not.toHaveBeenCalledWith(Order, 1, { status: OrderStatus.CANCELLED });
    });
  });

  describe('confirm() — duplicate-like provider error', () => {
    it('duplicate-like provider error + pending local state → 409 without a local paid transition', async () => {
      const payment = makePayment();
      const lockedPayment = makePayment();
      const manager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) return Promise.resolve(lockedPayment.order);
          if (entity === Payment) return Promise.resolve(lockedPayment);
          return Promise.resolve(null);
        }),
      });
      const dataSource = makeDataSource(manager);
      const { service, defaultGateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        dataSource,
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(new Error('already captured by provider'));

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_dup_pending', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(manager.update).toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.CONFIRMING,
        confirmationOperationKey: 'pay_dup_pending',
      });
      expect(manager.update).not.toHaveBeenCalledWith(
        Payment,
        payment.id,
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );

    });
  });

  describe('confirm() — 알림 디스패치', () => {
    it('성공 시 fire-and-forget 으로 결제완료 알림을 디스패치한다', async () => {
      const payment = makePayment();
      const { service, defaultGateway, notificationDispatch } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        providerTransactionId: 'pk',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10);

      expect(notificationDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'payment.confirmed',
          userId: 10,
          resourceId: 1,
          mode: 'fire-and-forget',
        }),
      );
    });
  });

  describe('confirmGuest() — duplicate loser local-truth handling', () => {
    it('duplicate-like provider error + authoritative confirmed state → 409 without FAILED/CANCELLED recovery', async () => {
      const guestOrder = makeOrder({
        userId: null,
        status: OrderStatus.PENDING,
        orderLocale: 'ko',
        guestEmailNormalized: 'guest@example.com',
      } as Partial<Order>);
      const quote = { stripeQuote: { paymentIntentId: 'pi_guest' } };
      const payment = makePayment({ order: guestOrder, rawResponse: quote });
      const lockedPayment = makePayment({
        status: PaymentStatus.CONFIRMED,
        order: makeOrder({
          userId: null,
          status: OrderStatus.PAID,
          orderLocale: 'ko',
          guestEmailNormalized: 'guest@example.com',
        } as Partial<Order>),
      });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockResolvedValue(lockedPayment),
      });
      const { service, defaultGateway, guestOrderAccessService } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(
        new Error('already captured by provider'),
      );
      (guestOrderAccessService.getValidAccessOrThrow as jest.Mock).mockResolvedValue({ id: 1 });
      (guestOrderAccessService.withOrderAccessLock as jest.Mock).mockImplementation(
        async (_orderId: number, operation: (txManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      );

      await expect(
        service.confirmGuest(1, { paymentKey: 'pay_guest_dup', amount: 30000 }, 'guest-token'),
      ).rejects.toThrow(ConflictException);
      expect(defaultGateway.confirm).toHaveBeenCalledWith(
        'pay_guest_dup',
        30000,
        guestOrder.orderNumber,
        { rawResponse: quote },
      );
      expect(manager.update).not.toHaveBeenCalledWith(Payment, lockedPayment.id, {
        status: PaymentStatus.FAILED,
      });
      expect(manager.update).not.toHaveBeenCalledWith(Order, 1, { status: OrderStatus.CANCELLED });
    });

    it('duplicate-like provider error + stale token after re-read → 401 without FAILED/CANCELLED recovery', async () => {
      const guestOrder = makeOrder({
        userId: null,
        status: OrderStatus.PENDING,
        orderLocale: 'ko',
        guestEmailNormalized: 'guest@example.com',
      } as Partial<Order>);
      const payment = makePayment({ order: guestOrder });
      const manager = makeTransactionManager();
      const { service, defaultGateway, guestOrderAccessService } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(
        new Error('already captured by provider'),
      );
      (guestOrderAccessService.getValidAccessOrThrow as jest.Mock)
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new UnauthorizedException('stale token'));
      (guestOrderAccessService.withOrderAccessLock as jest.Mock).mockImplementation(
        async (_orderId: number, operation: (txManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      );

      await expect(
        service.confirmGuest(1, { paymentKey: 'pay_guest_dup', amount: 30000 }, 'guest-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(manager.update).not.toHaveBeenCalled();
    });
    it('gateway success + stale token during locked recheck → 401 with confirmation reconciliation marker', async () => {
      const guestOrder = makeOrder({
        userId: null,
        status: OrderStatus.PENDING,
        orderLocale: 'ko',
        guestEmailNormalized: 'guest@example.com',
      } as Partial<Order>);
      const payment = makePayment({ order: guestOrder });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) return Promise.resolve(guestOrder);
          if (entity === Payment) return Promise.resolve(payment);
          return Promise.resolve(null);
        }),
      });
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const dataSource = makeDataSource(manager);
      const { service, defaultGateway, guestOrderAccessService } = buildService({
        paymentRepo,
        dataSource,
      });
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_guest_success',
        providerTransactionId: 'pay_guest_success',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { provider: true },
      });
      (guestOrderAccessService.getValidAccessOrThrow as jest.Mock)
        .mockResolvedValueOnce({ id: 1 })
        .mockRejectedValueOnce(new UnauthorizedException('stale token'));
      (guestOrderAccessService.withOrderAccessLock as jest.Mock).mockImplementation(
        async (_orderId: number, operation: (txManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      );

      await expect(
        service.confirmGuest(1, { paymentKey: 'pay_guest_success', amount: 30000 }, 'guest-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(paymentRepo.update).toHaveBeenCalledWith(
        payment.id,
        expect.objectContaining({
          rawResponse: expect.objectContaining({
            reconciliationRequired: true,
            orderId: 1,
            rawResponse: { provider: true },
            error: 'stale token',
          }),
        }),
      );
    });
  });

  describe('confirmGuest() — duplicate-like provider error', () => {
    it('duplicate-like provider error + pending local state → 409 without a local paid transition', async () => {
      const guestOrder = makeOrder({
        userId: null,
        status: OrderStatus.PENDING,
        orderLocale: 'ko',
        guestEmailNormalized: 'guest@example.com',
      } as Partial<Order>);
      const payment = makePayment({ order: guestOrder });
      const lockedPayment = makePayment({ order: guestOrder });
      const manager = makeTransactionManager({
        findOne: jest.fn().mockResolvedValue(lockedPayment),
      });
      const { service, defaultGateway, guestOrderAccessService } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (defaultGateway.confirm as jest.Mock).mockRejectedValue(new Error('already captured by provider'));
      (guestOrderAccessService.getValidAccessOrThrow as jest.Mock).mockResolvedValue({ id: 1 });
      (guestOrderAccessService.withOrderAccessLock as jest.Mock).mockImplementation(
        async (_orderId: number, operation: (txManager: typeof manager) => Promise<unknown>) =>
          operation(manager),
      );

      await expect(
        service.confirmGuest(1, { paymentKey: 'pay_guest_dup_pending', amount: 30000 }, 'guest-token'),
      ).rejects.toThrow(ConflictException);
      expect(manager.update).not.toHaveBeenCalled();
    });
  });
});
