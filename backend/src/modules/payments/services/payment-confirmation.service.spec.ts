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
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { IdempotencyOperation } from '../../../common/entities/idempotency-operation.entity';
import { GuestOrderAccess } from '../../orders/entities/guest-order-access.entity';
import { PaymentsService } from '../payments.service';
import { GuestPaymentsService } from '../guest-payments.service';
import { AdminOrdersService } from '../../admin/admin-orders.service';
import { createHash } from 'crypto';
import { FindOperator } from 'typeorm';

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
    rotateAccessTokenForDigest: jest.fn(),
  };
  const pointsService = {
    getRunningBalanceInTx: jest.fn().mockResolvedValue(2000),
  };
  const effectOutbox = { enqueueWithManager: jest.fn().mockResolvedValue({ id: 1 }) };

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
    effectOutbox as never,
    new IdempotencyService(dataSource as never),
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
    effectOutbox,
  };
};

describe('PaymentConfirmationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each(['member', 'guest'] as const)('%s facade recovery and replay', (customerType) => {
    const setup = () => {
      const originalToken = 'original-guest-token';
      let state = {
        payment: makePayment(),
        order: makeOrder({ userId: customerType === 'member' ? 10 : null }),
        operations: [] as IdempotencyOperation[],
        accesses: [{
          id: 1, orderId: 1,
          tokenDigest: createHash('sha256').update(originalToken).digest('hex'),
          expiresAt: new Date(Date.now() + 86400000), supersededAt: null, supersededById: null,
        } as GuestOrderAccess],
      };
      const matches = (row: object, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => {
        const actual = (row as Record<string, unknown>)[key];
        if (value instanceof FindOperator) {
          return value.type === 'isNull' ? actual === null : (actual as Date) <= value.value;
        }
        return actual === value;
      });
      const operationRepo = {
        findOne: jest.fn(async ({ where }) => structuredClone(state.operations.find((row) => matches(row, where)) ?? null)),
        create: jest.fn((row) => row),
        save: jest.fn(async (row) => {
          const saved = { id: state.operations.length + 1, ...row };
          state.operations = [...state.operations.filter((record) => record.id !== saved.id), structuredClone(saved)];
          return structuredClone(saved);
        }),
        update: jest.fn(async (where, changes) => {
          const row = state.operations.find((record) => matches(record, where));
          if (!row) return { affected: 0 };
          Object.assign(row, structuredClone(changes));
          return { affected: 1 };
        }),
      };
      const accessRepo = {
        findOne: jest.fn(async ({ where }) => structuredClone(state.accesses.find((row) => matches(row, where)) ?? null)),
        create: jest.fn((row) => ({ id: state.accesses.length + 1, ...row })),
        save: jest.fn(async (row: GuestOrderAccess) => {
          state.accesses = [...state.accesses.filter((record) => record.id !== row.id), structuredClone(row)];
          return structuredClone(row);
        }),
        createQueryBuilder: jest.fn(() => {
          const where: Record<string, unknown> = {};
          const builder: Record<string, jest.Mock> = {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn((_sql, params) => { Object.assign(where, params); return builder; }),
            andWhere: jest.fn((_sql, params) => { Object.assign(where, params); return builder; }),
            getOne: jest.fn(async () => structuredClone(state.accesses.find((row) => matches(row, where)) ?? null)),
          };
          return builder;
        }),
      };
      const paymentRepo = {
        findOne: jest.fn(async () => ({ ...structuredClone(state.payment), order: structuredClone(state.order) })),
        update: jest.fn(async (where, changes) => {
          if (!matches(state.payment, where)) return { affected: 0 };
          Object.assign(state.payment, structuredClone(changes));
          return { affected: 1 };
        }),
      };
      const orderRepo = { findOne: jest.fn(async () => structuredClone(state.order)) };
      const manager = makeTransactionManager({
        findOne: jest.fn(async (entity) => {
          if (entity === Payment) return structuredClone(state.payment);
          if (entity === Order) return structuredClone(state.order);
          return null;
        }),
        update: jest.fn(async (entity, _id, changes) => {
          if (entity === Payment) Object.assign(state.payment, structuredClone(changes));
          if (entity === Order) Object.assign(state.order, structuredClone(changes));
          return { affected: 1 };
        }),
        getRepository: jest.fn((entity) => {
          if (entity === IdempotencyOperation) return operationRepo;
          if (entity === GuestOrderAccess) return accessRepo;
          throw new Error(`Unexpected repository: ${String(entity)}`);
        }),
      });
      Object.assign(manager, { queryRunner: {} });
      const dataSource = makeDataSource(manager);
      dataSource.transaction.mockImplementation(async (operation) => {
        const snapshot = structuredClone(state);
        try { return await operation(manager); }
        catch (error) { state = snapshot; throw error; }
      });
      const context = buildService({ paymentRepo, dataSource });
      const idempotency = new IdempotencyService(dataSource as never);
      const guestAccess = new GuestOrderAccessService(accessRepo as never, orderRepo as never, dataSource as never);
      context.guestOrderAccessService.getValidAccessOrThrow.mockImplementation(guestAccess.getValidAccessOrThrow.bind(guestAccess));
      context.guestOrderAccessService.rotateAccessTokenForOrder.mockImplementation(guestAccess.rotateAccessTokenForOrder.bind(guestAccess));
      context.guestOrderAccessService.rotateAccessTokenForDigest.mockImplementation(guestAccess.rotateAccessTokenForDigest.bind(guestAccess));
      context.guestOrderAccessService.withOrderAccessLock.mockImplementation((_orderId, operation) => dataSource.transaction(operation));
      const facade = new PaymentsService(
        paymentRepo as never, {} as never, orderRepo as never, {} as never, {} as never,
        context.defaultGateway, createPaymentConfig({ NODE_ENV: 'development', PAYMENT_GATEWAY: 'mock' }),
        context.tossGateway as never, context.stripeGateway as never, context.inicisGateway as never,
        context.paypalGateway as never, context.eximbayGateway as never, context.pointsService as never,
        context.service, dataSource as never, idempotency, context.effectOutbox as never,
      );
      const guestFacade = new GuestPaymentsService(facade, context.service, idempotency);
      const admin = new AdminOrdersService(
        orderRepo as never, paymentRepo as never, {} as never, facade, dataSource as never,
        {} as never, {} as never, {} as never, {} as never, {} as never,
      );
      (context.defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'provider-key', providerTransactionId: 'provider-key',
        providerOrderReference: state.payment.providerOrderReference,
        providerAmount: 30000, providerCurrency: 'KRW', amount: 30000,
        status: 'confirmed', method: PaymentMethod.CARD, rawResponse: { receipt: true },
      });
      manager.save.mockRejectedValueOnce(new Error('shipping write failed'));
      const confirm = (amount = 30000) => customerType === 'member'
        ? facade.confirm({ orderId: 1, paymentKey: 'provider-key', amount }, 10, 'same-key')
        : guestFacade.confirm(1, { paymentKey: 'provider-key', amount }, originalToken, 'same-key');
      return { ...context, manager, admin, confirm, guestAccess, originalToken, state: () => state, operationRepo };
    };

    it('replays successful recovery through the original facade with validated methods and rotated guest access', async () => {
      const context = setup();
      await expect(context.confirm()).rejects.toThrow('결제 승인 후 동기화에 실패했습니다.');
      expect(context.state().operations[0].status).toBe('pending');
      expect(JSON.stringify(context.state().payment.rawResponse)).not.toContain(context.originalToken);
      context.state().operations[0].leaseExpiresAt = new Date(0);
      expect(context.state().payment.method).toBe(PaymentMethod.MOCK);

      await context.admin.updateStatus(1, OrderStatus.PAID);
      expect(context.state().operations[0]).toMatchObject({ status: 'completed', leaseOwner: null, leaseExpiresAt: null });
      expect(context.state().payment.method).toBe(PaymentMethod.CARD);
      expect(context.effectOutbox.enqueueWithManager).toHaveBeenCalledTimes(3);
      for (const call of context.effectOutbox.enqueueWithManager.mock.calls) {
        expect(call[3]).toMatchObject({ method: PaymentMethod.CARD });
      }
      const response = await context.confirm() as Record<string, unknown>;
      expect(response).toMatchObject({ status: PaymentStatus.CONFIRMED, method: PaymentMethod.CARD, orderId: 1 });
      expect(context.defaultGateway.confirm).toHaveBeenCalledTimes(1);
      await expect(context.confirm(1)).rejects.toThrow(ConflictException);
      if (customerType === 'guest') {
        expect(response.guestAccessToken).toEqual(expect.any(String));
        await expect(context.guestAccess.getValidAccessOrThrow(1, context.originalToken)).rejects.toThrow(UnauthorizedException);
        await expect(context.guestAccess.getValidAccessOrThrow(1, String(response.guestAccessToken))).resolves.toBeDefined();
      }
    });

    it('rolls back payment, operation completion and token rotation when recovery effects fail', async () => {
      const context = setup();
      await expect(context.confirm()).rejects.toThrow(InternalServerErrorException);
      context.effectOutbox.enqueueWithManager.mockRejectedValueOnce(new Error('outbox failed'));
      await expect(context.admin.updateStatus(1, OrderStatus.PAID)).rejects.toThrow('outbox failed');
      expect(context.state().operations[0].status).toBe('pending');
      expect(context.state().payment.status).toBe(PaymentStatus.CONFIRMING);
      expect(context.state().order.status).toBe(OrderStatus.PENDING);
      expect(context.state().accesses).toHaveLength(1);
      await context.admin.updateStatus(1, OrderStatus.PAID);
      await expect(context.confirm()).resolves.toMatchObject({ method: PaymentMethod.CARD });
      expect(context.defaultGateway.confirm).toHaveBeenCalledTimes(1);
    });

    it('does not recover when completion loses the reserved operation ownership', async () => {
      const context = setup();
      await expect(context.confirm()).rejects.toThrow(InternalServerErrorException);
      context.operationRepo.update.mockResolvedValueOnce({ affected: 0 });
      await expect(context.admin.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(ConflictException);
      expect(context.state().operations[0].status).toBe('pending');
      expect(context.state().payment.status).toBe(PaymentStatus.CONFIRMING);
      expect(context.state().order.status).toBe(OrderStatus.PENDING);
      expect(context.state().accesses).toHaveLength(1);
      expect(context.effectOutbox.enqueueWithManager).not.toHaveBeenCalled();
    });

    it('keeps the reserved operation pending when provider evidence is mismatched', async () => {
      const context = setup();
      (context.defaultGateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'provider-key', providerTransactionId: 'provider-key',
        providerOrderReference: context.state().payment.providerOrderReference,
        providerAmount: 1, providerCurrency: 'KRW', amount: 1,
        status: 'confirmed', method: PaymentMethod.CARD, rawResponse: { receipt: true },
      });
      await expect(context.confirm()).rejects.toThrow(BadRequestException);
      await expect(context.admin.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(BadRequestException);
      expect(context.state().operations[0].status).toBe('pending');
      expect(context.state().payment.status).toBe(PaymentStatus.CONFIRMING);
      expect(context.state().order.status).toBe(OrderStatus.PENDING);
      expect(context.state().accesses).toHaveLength(1);
      expect(context.effectOutbox.enqueueWithManager).not.toHaveBeenCalled();
      expect(context.defaultGateway.confirm).toHaveBeenCalledTimes(1);
    });

    if (customerType === 'guest') {
      it.each(['expired', 'superseded'] as const)('does not restore %s guest access during administrator recovery', async (accessState) => {
        const context = setup();
        await expect(context.confirm()).rejects.toThrow(InternalServerErrorException);
        if (accessState === 'expired') context.state().accesses[0].expiresAt = new Date(0);
        else context.state().accesses[0].supersededAt = new Date();
        await expect(context.admin.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(UnauthorizedException);
        expect(context.state().operations[0].status).toBe('pending');
        expect(context.state().payment.status).toBe(PaymentStatus.CONFIRMING);
        expect(context.state().order.status).toBe(OrderStatus.PENDING);
        expect(context.effectOutbox.enqueueWithManager).not.toHaveBeenCalled();
      });
    }
  });

  describe.each(['member', 'guest'] as const)('%s confirmation reconciliation', (customerType) => {
    const validResult = {
      paymentKey: 'txn_prepared',
      providerTransactionId: 'txn_prepared',
      providerOrderReference: 'ORD-20240101-ABCD1',
      providerAmount: 30000,
      providerCurrency: 'KRW',
      amount: 30000,
      method: 'mock',
      status: 'confirmed',
      rawResponse: { receipt: 'original-evidence' },
    };

    const setup = (idempotencyKey?: string) => {
      const preparedRawResponse = { providerPreparation: { original: true } };
      const payment = makePayment({
        providerTransactionId: 'txn_prepared',
        rawResponse: preparedRawResponse,
        order: makeOrder({ userId: customerType === 'guest' ? null : 10 }),
      });
      const context = buildService({ paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) } });
      context.paymentRepo.update.mockImplementation(async (criteria, changes) => {
        if (payment.status !== criteria.status || payment.confirmationOperationKey !== criteria.confirmationOperationKey) {
          return { affected: 0 };
        }
        Object.assign(payment, changes);
        return { affected: 1 };
      });
      context.guestOrderAccessService.withOrderAccessLock.mockImplementation(
        async (_orderId, operation) => operation(context.dataSource._manager),
      );
      context.guestOrderAccessService.rotateAccessTokenForOrder.mockResolvedValue({
        guestAccessToken: 'rotated', guestAccessTokenExpiresAt: new Date(),
      });
      const confirm = (key = idempotencyKey) => customerType === 'member'
        ? context.service.confirm({ orderId: 1, paymentKey: 'txn_prepared', amount: 30000 }, 10, key)
        : context.service.confirmGuest(1, { paymentKey: 'txn_prepared', amount: 30000 }, 'guest-token', key);
      return { ...context, payment, confirm, preparedRawResponse };
    };

    describe.each([undefined, 'confirmation-idempotency-key'])('idempotency key %s', (idempotencyKey) => {
      it.each([
        { providerAmount: 30001 },
        { providerCurrency: 'USD' },
        { providerOrderReference: 'OTHER-ORDER' },
        { providerTransactionId: 'OTHER-TXN' },
      ])('preserves and quarantines mismatched evidence %j', async (mismatch) => {
        const context = setup(idempotencyKey);
        const { service, payment, confirm, defaultGateway, effectOutbox, dataSource } = context;
        const result = { ...validResult, ...mismatch };
        (defaultGateway.confirm as jest.Mock).mockResolvedValue(result);

        await expect(confirm()).rejects.toThrow(BadRequestException);

        expect(payment).toMatchObject({
          status: PaymentStatus.CONFIRMING,
          confirmationOperationKey: idempotencyKey ?? 'txn_prepared',
          providerTransactionId: 'txn_prepared',
          providerOrderReference: validResult.providerOrderReference,
          expectedProviderAmount: 30000,
          expectedProviderCurrency: 'KRW',
          rawResponse: {
            reconciliationRequired: true,
            gatewayConfirmationSucceeded: true,
            confirmationResult: result,
            preparedRawResponse: context.preparedRawResponse,
            preparedBinding: {
              providerTransactionId: 'txn_prepared',
              providerOrderReference: validResult.providerOrderReference,
              expectedProviderAmount: 30000,
              expectedProviderCurrency: 'KRW',
            },
            rawResponse: result.rawResponse,
          },
        });
        expect(payment.order.status).toBe(OrderStatus.PENDING);
        await expect(confirm()).rejects.toThrow(ConflictException);
        await expect(confirm('different-idempotency-key')).rejects.toThrow(ConflictException);
        await expect(service.reconcileConfirmedPayment(1)).rejects.toThrow(BadRequestException);
        expect(defaultGateway.confirm).toHaveBeenCalledTimes(1);
        expect(dataSource._manager.save).not.toHaveBeenCalled();
        expect(effectOutbox.enqueueWithManager).not.toHaveBeenCalled();
      });

      it('recovers validated confirmation after local synchronization fails without another provider call', async () => {
        const { service, payment, confirm, defaultGateway, effectOutbox, dataSource, guestOrderAccessService } = setup(idempotencyKey);
        (defaultGateway.confirm as jest.Mock).mockResolvedValue(validResult);
        if (customerType === 'member') {
          dataSource.transaction.mockImplementationOnce(async (operation) => operation(dataSource._manager))
            .mockRejectedValueOnce(new Error('local synchronization failed'));
        } else {
          guestOrderAccessService.withOrderAccessLock.mockRejectedValueOnce(new Error('local synchronization failed'));
        }

        await expect(confirm()).rejects.toThrow(InternalServerErrorException);
        expect(payment.status).toBe(PaymentStatus.CONFIRMING);
        await service.reconcileConfirmedPayment(1);
        expect(payment).toMatchObject({ status: PaymentStatus.CONFIRMED, confirmationOperationKey: null, paymentKey: 'txn_prepared' });
        expect(payment.order.status).toBe(OrderStatus.PAID);
        expect(dataSource._manager.save).toHaveBeenCalledWith(Shipping, expect.objectContaining({ status: ShippingStatus.PAYMENT_CONFIRMED }));
        expect(effectOutbox.enqueueWithManager).toHaveBeenCalledTimes(3);
        expect(defaultGateway.confirm).toHaveBeenCalledTimes(1);
        await expect(service.reconcileConfirmedPayment(1)).rejects.toThrow(BadRequestException);
      });
    });

    it('does not overwrite a concurrent operation owner with stale confirmation evidence', async () => {
      const { payment, confirm, defaultGateway, paymentRepo } = setup();
      (defaultGateway.confirm as jest.Mock).mockImplementation(async () => {
        payment.confirmationOperationKey = 'new-owner';
        return { ...validResult, providerAmount: 1 };
      });
      await expect(confirm()).rejects.toThrow(BadRequestException);
      expect(payment.confirmationOperationKey).toBe('new-owner');
      expect(payment.rawResponse).toEqual({ providerPreparation: { original: true } });
      expect(paymentRepo.update).toHaveBeenCalledWith(
        { id: payment.id, status: PaymentStatus.CONFIRMING, confirmationOperationKey: 'txn_prepared' },
        expect.anything(),
      );
    });

    it('blocks provider replay for legacy reconciliation markers without approval evidence', async () => {
      const { payment, confirm, defaultGateway } = setup();
      payment.status = PaymentStatus.CONFIRMING;
      payment.confirmationOperationKey = 'txn_prepared';
      payment.rawResponse = { reconciliationRequired: true, rawResponse: { receipt: 'legacy' } };
      await expect(confirm()).rejects.toThrow(ConflictException);
      expect(defaultGateway.confirm).not.toHaveBeenCalled();
    });

    it.each(['owner', 'binding', 'evidence', 'status'] as const)('blocks reconciliation when locked %s changes', async (change) => {
      const { service, payment, confirm, defaultGateway, effectOutbox } = setup();
      (defaultGateway.confirm as jest.Mock).mockResolvedValue({ ...validResult, providerAmount: 1 });
      await expect(confirm()).rejects.toThrow(BadRequestException);
      if (change === 'owner') payment.confirmationOperationKey = 'new-owner';
      if (change === 'binding') payment.expectedProviderAmount = 1;
      if (change === 'evidence') delete (payment.rawResponse as Record<string, unknown>).confirmationResult;
      if (change === 'status') payment.status = PaymentStatus.CONFIRMED;
      await expect(service.reconcileConfirmedPayment(1)).rejects.toThrow(BadRequestException);
      expect(payment.order.status).toBe(OrderStatus.PENDING);
      expect(effectOutbox.enqueueWithManager).not.toHaveBeenCalled();
    });
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
        expect.objectContaining({ id: payment.id, status: PaymentStatus.CONFIRMING, confirmationOperationKey: 'pk' }),
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
        expect.objectContaining({ id: payment.id, status: PaymentStatus.CONFIRMING, confirmationOperationKey: 'pk' }),
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
      const { service, effectOutbox } = buildService({
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
      expect(effectOutbox.enqueueWithManager).toHaveBeenCalledWith(
        manager, 1, 'ORDER_COMPLETED_EVENT', expect.objectContaining({ userId: 10 }),
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
    it('성공 시 완료 효과를 트랜잭션 안에서 대기열에 넣는다', async () => {
      const payment = makePayment();
      const { service, defaultGateway, notificationDispatch, effectOutbox } = buildService({
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

      expect(notificationDispatch).not.toHaveBeenCalled();
      expect(effectOutbox.enqueueWithManager).toHaveBeenCalledWith(
        expect.anything(), 1, 'ORDER_COMPLETED_EVENT', expect.objectContaining({
          userId: 10,
        }),
      );
      expect(effectOutbox.enqueueWithManager).toHaveBeenCalledWith(
        expect.anything(), 1, 'MEMBER_MESSAGE_NOTIFICATION', expect.anything(),
      );
    });

    it('비회원 결제 완료도 별도 메시지 효과를 대기열에 넣는다', async () => {
      const { service, effectOutbox } = buildService({});
      const enqueue = service as unknown as {
        enqueuePaymentEffects: (manager: unknown, orderId: number, payload: Record<string, unknown>) => Promise<void>;
      };

      await enqueue.enqueuePaymentEffects({} as never, 19, { customerType: 'guest', orderId: 19 });

      expect(effectOutbox.enqueueWithManager).toHaveBeenCalledWith(
        expect.anything(), 19, 'GUEST_MESSAGE_NOTIFICATION', expect.objectContaining({ customerType: 'guest' }),
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
        expect.objectContaining({ id: payment.id, status: PaymentStatus.CONFIRMING, confirmationOperationKey: 'pay_guest_success' }),
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
