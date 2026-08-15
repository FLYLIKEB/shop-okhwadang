import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { IdempotencyService } from '../../../common/services/idempotency.service';
import { Payment, PaymentStatus, PaymentMethod, PaymentGatewayType } from '../entities/payment.entity';
import { PaymentWebhookEvent } from '../entities/payment-webhook-event.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Shipping } from '../entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { MockPaymentAdapter, MOCK_TEST_SIGNATURE } from '../adapters/mock.adapter';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { KGInicisPaymentAdapter } from '../adapters/inicis.adapter';
import { PayPalPaymentAdapter } from '../adapters/paypal.adapter';
import { EximbayPaymentAdapter } from '../adapters/eximbay.adapter';
import { NotificationService } from '../../notification/notification.service';
import { NotificationDispatchHelper } from '../../notification/notification-dispatch.helper';
import { PAYMENT_CONFIG, createPaymentConfig } from '../../../config/payment.config';
import { PointsService } from '../../points/points.service';
import { PaymentConfirmationService } from '../services/payment-confirmation.service';
import { GuestOrderAccessService } from '../../orders/guest-order-access.service';
import { User } from '../../users/entities/user.entity';

const makeOrder = (overrides: Partial<Order> = {}): Order =>
  ({
    id: 1,
    userId: 10,
    orderNumber: 'ORD-20240101-ABCD1',
    status: OrderStatus.PENDING,
    totalAmount: 30000,
    ...overrides,
  } as unknown as Order);

const makePayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 100,
    orderId: 1,
    amount: 30000,
    status: PaymentStatus.PENDING,
    method: PaymentMethod.MOCK,
    gateway: PaymentGatewayType.MOCK,
    paymentKey: null,
    providerTransactionId: null,
    providerOrderReference: 'ORD-20240101-ABCD1',
    expectedProviderAmount: 30000,
    expectedProviderCurrency: 'KRW',
    localOrderReference: 'ORD-20240101-ABCD1',
    order: makeOrder(),
    ...overrides,
  } as unknown as Payment);

const makeTransactionManager = (overrides: Record<string, jest.Mock> = {}) => ({
  update: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockImplementation((entity: unknown) => {
    if (entity === Payment) {
      return Promise.resolve(makePayment());
    }
    if (entity === Order) {
      return Promise.resolve(makeOrder({ pointsUsed: 0 }));
    }
    return Promise.resolve(null);
  }),
  save: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
  find: jest.fn().mockResolvedValue([]),
  increment: jest.fn().mockResolvedValue({}),
  ...overrides,
});

const makeDataSourceMock = (manager = makeTransactionManager()) => ({
  transaction: jest.fn(async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(manager)),
  _manager: manager,
});

describe('MockPaymentAdapter', () => {
  let adapter: MockPaymentAdapter;

  beforeEach(() => {
    adapter = new MockPaymentAdapter();
  });

  it('prepare → returns clientKey and orderId', async () => {
    const result = await adapter.prepare('42', 30000);
    expect(result.clientKey).toBe('mock_client_key');
    expect(result.orderId).toBe('42');
    expect(result).toMatchObject({
      providerOrderReference: '42',
      providerAmount: 30000,
      providerCurrency: 'KRW',
    });
  });

  it('confirm → returns confirmed result', async () => {
    const result = await adapter.confirm('mock-ORD-TEST', 30000, 'ORD-TEST');
    expect(result.status).toBe('confirmed');
    expect(result.method).toBe('mock');
    expect(result.amount).toBe(30000);
  });

  it('confirm with fail_ prefix → throws', async () => {
    await expect(adapter.confirm('fail_xyz', 30000, 'ORD-TEST')).rejects.toThrow('Mock payment failed');
  });

  it('confirm rejects a client-supplied transaction key outside the prepared order', async () => {
    await expect(adapter.confirm('pay_abc', 30000, 'ORD-TEST')).rejects.toThrow('transaction mismatch');
  });

  it('cancel → returns cancelledAt', async () => {
    const result = await adapter.cancel('pay_abc', '고객 요청');
    expect(result.cancelledAt).toBeInstanceOf(Date);
    expect(result.rawResponse).toMatchObject({ mock: true });
  });

  it('verifyWebhook → 올바른 테스트 시그니처로 true', () => {
    expect(adapter.verifyWebhook({}, MOCK_TEST_SIGNATURE)).toBe(true);
  });
});

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPaymentRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockRefundRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockShippingRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockDefaultGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  const mockTossAdapter = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  const mockStripeAdapter = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  const mockInicisAdapter = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  const mockPaypalAdapter = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  const mockEximbayAdapter = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  let mockDataSource: ReturnType<typeof makeDataSourceMock>;
  const mockPointsService = {
    getRunningBalanceInTx: jest.fn().mockResolvedValue(2000),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockTossAdapter.prepare.mockResolvedValue({
      clientKey: 'toss-widget-client', orderId: '1', providerOrderReference: 'ORD-20240101-ABCD1', providerAmount: 30000, providerCurrency: 'KRW',
    });
    const defaultManager = makeTransactionManager({
      findOne: jest.fn().mockImplementation((entity: unknown, options: unknown) => {
        if (entity === Payment) {
          return mockPaymentRepo.findOne(options as never);
        }
        if (entity === Order) {
          return mockOrderRepo.findOne(options as never);
        }
        if (entity === Shipping) {
          return mockShippingRepo.findOne(options as never);
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockImplementation((entity: unknown, data: unknown) => {
        if (entity === Payment) {
          return mockPaymentRepo.create(data as never);
        }
        return data;
      }),
      save: jest.fn().mockImplementation((entity: unknown, data?: unknown) => {
        if (entity === Payment) {
          return mockPaymentRepo.save((data ?? entity) as never);
        }
        if (entity === Shipping) {
          return mockShippingRepo.save((data ?? entity) as never);
        }
        return Promise.resolve(data ?? entity);
      }),
      update: jest.fn().mockImplementation((entity: unknown, criteria: unknown, partial: unknown) => {
        if (entity === Payment) {
          return mockPaymentRepo.update(criteria as never, partial as never);
        }
        if (entity === Order) {
          return mockOrderRepo.update(criteria as never, partial as never);
        }
        return Promise.resolve({});
      }),
    });
    mockDataSource = makeDataSourceMock(defaultManager);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: IdempotencyService,
          useValue: {
            execute: async (_scope: string, _operation: string, _key: string, _payload: unknown, work: () => Promise<unknown>) => ({
              result: await work(),
              replayed: false,
            }),
            reserve: jest.fn().mockResolvedValue({ id: 1, owner: true, leaseOwner: 'lease-owner', replayed: false }),
            complete: jest.fn().mockResolvedValue(undefined),
            renewLease: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Refund), useValue: mockRefundRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Shipping), useValue: mockShippingRepo },
        {
          provide: getRepositoryToken(PaymentWebhookEvent),
          useValue: {
            create: jest.fn((e: object) => e),
            save: jest.fn(async (e: object) => ({ id: 1, ...e })),
            update: jest.fn().mockResolvedValue({}),
          },
        },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        {
          provide: PAYMENT_CONFIG,
          useValue: createPaymentConfig({
            NODE_ENV: 'development',
            PAYMENT_GATEWAY: 'mock',
            DEFAULT_CARRIER: 'mock',
          }),
        },
        { provide: 'PaymentGateway', useValue: mockDefaultGateway },
        { provide: TossPaymentAdapter, useValue: mockTossAdapter },
        { provide: StripePaymentAdapter, useValue: mockStripeAdapter },
        { provide: KGInicisPaymentAdapter, useValue: mockInicisAdapter },
        { provide: PayPalPaymentAdapter, useValue: mockPaypalAdapter },
        { provide: EximbayPaymentAdapter, useValue: mockEximbayAdapter },
        { provide: NotificationService, useValue: { sendPaymentConfirmed: jest.fn() } },
        { provide: PointsService, useValue: mockPointsService },
        { provide: NotificationDispatchHelper, useValue: { dispatch: jest.fn().mockResolvedValue(undefined) } },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: GuestOrderAccessService,
          useValue: {
            getValidAccessOrThrow: jest.fn(),
            withOrderAccessLock: jest.fn(),
            rotateAccessTokenForOrder: jest.fn(),
          },
        },
        PaymentConfirmationService,
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('prepare()', () => {
    it('valid order → returns clientKey', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment();
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      mockDefaultGateway.prepare.mockResolvedValue({
        clientKey: 'mock_client_key', orderId: '1', providerOrderReference: 'ORD-20240101-ABCD1', providerAmount: 30000, providerCurrency: 'KRW',
      });

      const result = await service.prepare({ orderId: 1 }, 10);
      expect(result.clientKey).toBe('mock_client_key');
      expect(result.orderId).toBe(1);
    });

    it('order not found → NotFoundException', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);
      await expect(service.prepare({ orderId: 999 }, 10)).rejects.toThrow(NotFoundException);
    });

    it('wrong user → ForbiddenException', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder({ userId: 99 }));
      await expect(service.prepare({ orderId: 1 }, 10)).rejects.toThrow(ForbiddenException);
    });

    it('order status=paid → ConflictException', async () => {
      mockOrderRepo.findOne.mockResolvedValue(makeOrder({ status: OrderStatus.PAID }));
      await expect(service.prepare({ orderId: 1 }, 10)).rejects.toThrow(ConflictException);
    });

    it('locale=ko 기본 prepare → Toss 결제위젯만 반환하고 회원 customerKey를 생성한다', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.TOSS });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);

      const result = await service.prepare({ orderId: 1, locale: 'ko' }, 10);

      expect(result.gateway).toBe('toss');
      expect(result.availableGateways).toEqual(['toss']);
      expect(result.gatewayPayload?.customerKey).toMatch(/^[a-f0-9]{50}$/);
      expect(mockTossAdapter.prepare).toHaveBeenCalledWith('1', 30000, expect.objectContaining({ locale: 'ko' }));
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.TOSS }),
      );
    });

    it('replays the persisted Toss client artifact including customerKey', async () => {
      const order = makeOrder();
      const payment = makePayment({
        gateway: PaymentGatewayType.TOSS,
        providerOrderReference: order.orderNumber,
        expectedProviderAmount: 30000,
        expectedProviderCurrency: 'KRW',
        localOrderReference: order.orderNumber,
        rawResponse: {
          clientArtifact: {
            clientKey: 'toss-widget-client',
            gatewayPayload: { customerKey: 'persisted-customer-key' },
          },
        },
      });
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValue(payment);

      await expect(service.prepare({ orderId: 1, locale: 'ko' }, 10)).resolves.toMatchObject({
        clientKey: 'toss-widget-client',
        gatewayPayload: { customerKey: 'persisted-customer-key' },
      });
      expect(mockTossAdapter.prepare).not.toHaveBeenCalled();
    });

    it('locale=en 기본 prepare → PAYPAL 저장 + 카드 선택지 반환 (#1057/#1066)', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({
        gateway: PaymentGatewayType.PAYPAL,
        providerTransactionId: 'paypal-order-id',
        providerOrderReference: 'ORD-20240101-ABCD1',
        expectedProviderAmount: 20,
        expectedProviderCurrency: 'USD',
        localOrderReference: 'ORD-20240101-ABCD1',
      });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      mockPaypalAdapter.prepare.mockResolvedValue({
        clientKey: 'paypal-client', orderId: 'paypal-order-id', providerTransactionId: 'paypal-order-id', providerOrderReference: 'ORD-20240101-ABCD1', providerAmount: 20, providerCurrency: 'USD',
      });

      const result = await service.prepare({ orderId: 1, locale: 'en' }, 10);

      expect(result.gateway).toBe('paypal');
      expect(result.availableGateways).toEqual(['paypal', 'eximbay']);
      expect(mockPaypalAdapter.prepare).toHaveBeenCalledWith('1', 30000, expect.objectContaining({ locale: 'en' }));
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.PAYPAL }),
      );
    });

    it('ko에서 비활성 gateway를 요청하면 Toss로 제한한다', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.TOSS });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      const result = await service.prepare({ orderId: 1, locale: 'ko', gateway: 'bank_transfer' }, 10);

      expect(result.gateway).toBe('toss');
      expect(result.availableGateways).toEqual(['toss']);
      expect(result.clientKey).toBe('toss-widget-client');
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.TOSS }),
      );
    });

    it('명시적 gateway=paypal → locale=ko 에서도 PAYPAL 로 저장한다 (#769)', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.PAYPAL });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      mockPaypalAdapter.prepare.mockResolvedValue({
        clientKey: 'paypal-client', orderId: 'paypal-order-id', providerTransactionId: 'paypal-order-id', providerOrderReference: 'ORD-20240101-ABCD1', providerAmount: 20, providerCurrency: 'USD',
      });

      const result = await service.prepare({ orderId: 1, locale: 'ko', gateway: 'paypal' }, 10);

      expect(result.gateway).toBe('toss');
      expect(mockTossAdapter.prepare).toHaveBeenCalled();
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.TOSS }),
      );
    });

    it('reconciliation-confirmed pending order → ConflictException without reopening checkout', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.CONFIRMED }));

      await expect(service.prepare({ orderId: 1, locale: 'ko' }, 10)).rejects.toThrow(ConflictException);
      expect(mockPaymentRepo.update).not.toHaveBeenCalled();
      expect(mockDefaultGateway.prepare).not.toHaveBeenCalled();
    });

    it('명시적 gateway=eximbay → EXIMBAY 로 저장하고 카드 결제 payload를 반환한다 (#1057)', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.EXIMBAY });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      mockEximbayAdapter.prepare.mockResolvedValue({
        clientKey: 'eximbay-mid',
        orderId: 'ORD-20240101-ABCD1',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        gatewayPayload: { fgkey: 'fgkey' },
      });

      const result = await service.prepare({ orderId: 1, locale: 'ko', gateway: 'eximbay' }, 10);

      expect(result.gateway).toBe('toss');
      expect(result.availableGateways).toEqual(['toss']);
      expect(mockTossAdapter.prepare).toHaveBeenCalledWith('1', 30000, expect.objectContaining({ locale: 'ko' }));
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.TOSS }),
      );
    });
  });

  describe('confirm()', () => {
    it('amount match → confirmed', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
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

      const result = await service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10);
      expect(result.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('confirm() — dataSource.transaction() 이 1회 호출되어야 함', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
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

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('confirm() — 트랜잭션 내에서 payment·order·shipping 모두 업데이트', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
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

      const manager = mockDataSource._manager;
      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        payment.id,
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );
      expect(manager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PAID });
      expect(manager.save).toHaveBeenCalled();
    });

    it('shipping save 실패 → confirmation reconciliation marker persisted', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
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

      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('DB 오류 — shipping insert 실패')),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(failingManager),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인 후 동기화에 실패했습니다.');

      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, expect.objectContaining({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_abc',
        method: 'mock',
        rawResponse: expect.objectContaining({
          gatewayConfirmationSucceeded: true,
          reconciliationRequired: true,
          orderId: 1,
          error: 'DB 오류 — shipping insert 실패',
        }),
      }));
    });

    it('amount mismatch → BadRequestException', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(makePayment());
      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 99999 }, 10),
      ).rejects.toThrow(BadRequestException);
    });

    it('already confirmed → ConflictException', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.CONFIRMED }));
      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
    });

    it('gateway throws → InternalServerErrorException, payment marked failed', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockRejectedValue(new Error('gateway error'));

      const recoveryManager = makeTransactionManager();
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(recoveryManager),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'fail_abc', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인에 실패했습니다.');
      expect(recoveryManager.update).toHaveBeenCalledWith(Payment, payment.id, { status: PaymentStatus.FAILED });
    });

    it('gateway throws → order CANCELLED 마킹 + 재고 복구 (#723)', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockRejectedValue(new Error('gateway error'));

      const recoveryManager = makeTransactionManager({
        find: jest.fn().mockResolvedValue([
          { id: 11, orderId: 1, productId: 100, productOptionId: 200, quantity: 2 },
        ]),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(recoveryManager),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'fail_abc', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인에 실패했습니다.');

      expect(recoveryManager.update).toHaveBeenCalledWith(Order, 1, expect.objectContaining({ status: OrderStatus.CANCELLED }));
      expect(recoveryManager.increment).toHaveBeenCalled();
    });

    it('locale=en prepare → payment.gateway 가 PAYPAL 로 저장되고 네이버페이를 숨김 (#1057/#1066)', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({
        gateway: PaymentGatewayType.PAYPAL,
        providerTransactionId: 'paypal-order-id',
        providerOrderReference: 'ORD-20240101-ABCD1',
        expectedProviderAmount: 20,
        expectedProviderCurrency: 'USD',
        localOrderReference: 'ORD-20240101-ABCD1',
      });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      mockPaypalAdapter.prepare.mockResolvedValue({
        clientKey: 'paypal-client', orderId: 'paypal-order-id', providerTransactionId: 'paypal-order-id', providerOrderReference: 'ORD-20240101-ABCD1', providerAmount: 20, providerCurrency: 'USD',
      });

      const result = await service.prepare({ orderId: 1, locale: 'en' }, 10);

      expect(result.gateway).toBe('paypal');
      expect(result.availableGateways).toEqual(['paypal', 'eximbay']);
      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.PAYPAL }),
      );
      expect(mockPaymentRepo.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ gateway: PaymentGatewayType.INICIS }),
      );
    });

    it('payment.gateway=STRIPE 로 저장된 결제는 cancel 시 Stripe adapter 가 사용되어야 함 (#722)', async () => {
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pi_test',
        gateway: PaymentGatewayType.STRIPE,
      });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockStripeAdapter.cancel.mockResolvedValue({ cancelledAt: new Date(), rawResponse: { stripe: true } });
      mockPaymentRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});

      const result = await service.cancel({ orderId: 1 }, 10);

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockStripeAdapter.cancel).toHaveBeenCalledWith(
        'pi_test',
        '고객 요청',
        expect.objectContaining({ originalAmount: 30000, orderNumber: 'ORD-20240101-ABCD1' }),
      );
      expect(mockDefaultGateway.cancel).not.toHaveBeenCalled();
    });

    it('locale=ko prepare → confirm 시 Toss adapter의 confirm()이 호출되어야 함', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValueOnce(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.TOSS });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockPaymentRepo.findOne.mockResolvedValue(savedPayment);
      const prepareResult = await service.prepare({ orderId: 1, locale: 'ko' }, 10);
      expect(prepareResult.gateway).toBe('toss');

      const paymentForConfirm = makePayment({
        gateway: PaymentGatewayType.TOSS,
        providerTransactionId: 'pay_toss_abc',
        providerOrderReference: 'ORD-20240101-ABCD1',
        expectedProviderAmount: 30000,
        expectedProviderCurrency: 'KRW',
        localOrderReference: 'ORD-20240101-ABCD1',
      });
      mockPaymentRepo.findOne.mockResolvedValue(paymentForConfirm);
      mockTossAdapter.confirm.mockResolvedValue({
        paymentKey: 'pay_toss_abc',
        providerTransactionId: 'pay_toss_abc',
        providerOrderReference: 'ORD-20240101-ABCD1',
        providerAmount: 30000,
        providerCurrency: 'KRW',
        method: 'card',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { toss: true },
      });

      const confirmResult = await service.confirm({ orderId: 1, paymentKey: 'pay_toss_abc', amount: 30000 }, 10);
      expect(confirmResult.status).toBe(PaymentStatus.CONFIRMED);
      expect(mockTossAdapter.confirm).toHaveBeenCalledWith(
        'pay_toss_abc',
        30000,
        'ORD-20240101-ABCD1',
        { rawResponse: undefined },
      );
      expect(mockDefaultGateway.confirm).not.toHaveBeenCalled();
    });
  });

  describe('partialRefund()', () => {
    const confirmedPayment = makePayment({
      status: PaymentStatus.CONFIRMED,
      paymentKey: 'pay_abc',
      amount: 30000,
      gateway: PaymentGatewayType.MOCK,
    });

    const makeRefundManager = (overrides: Record<string, jest.Mock> = {}) => {
      const pendingRefund = {
        id: 1,
        paymentId: 100,
        orderItemId: null,
        amount: 10000,
        reason: '부분 환불',
        status: RefundStatus.PENDING,
        gatewayRefundId: null,
        idempotencyKey: 'refund-key-1',
        gatewayAttemptedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) =>
          entity === Payment
            ? Promise.resolve(confirmedPayment)
            : Promise.resolve(null),
        ),
        create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => ({ ...pendingRefund, ...(data as object) })),
        save: jest.fn().mockImplementation((_entity: unknown, data: unknown) => Promise.resolve({ ...pendingRefund, ...(data as object) })),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          addSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        }),
        ...overrides,
      });
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('결제 CONFIRMED 상태 → 부분 환불 성공 → Refund 반환', async () => {
      const refundManager = makeRefundManager();
      mockDataSource.transaction
        .mockImplementationOnce(async (fn: (m: typeof refundManager) => Promise<unknown>) => fn(refundManager))
        .mockImplementationOnce(async (fn: (m: typeof refundManager) => Promise<unknown>) => fn(refundManager));

      mockPaymentRepo.findOne.mockResolvedValue(confirmedPayment);
      mockRefundRepo.findOne.mockResolvedValue({
        id: 1, paymentId: 100, amount: 10000, status: RefundStatus.COMPLETED, reason: '부분 환불',
      });

      mockDefaultGateway.partialCancel.mockResolvedValue({
        refundId: 'mock-refund-123',
        cancelledAt: new Date(),
        rawResponse: { mock: true },
      });

      const result = await service.partialRefund(1, { amount: 10000, reason: '부분 환불' , idempotencyKey: 'refund-test' });
      expect(result.status).toBe(RefundStatus.COMPLETED);
    });

    it('payment.gateway=STRIPE → 부분 환불 시 Stripe adapter의 partialCancel()이 호출되어야 함 (#722)', async () => {
      const stripePayment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pi_stripe_abc',
        amount: 30000,
        gateway: PaymentGatewayType.STRIPE,
        rawResponse: {
          stripeQuote: {
            localAmount: 30000,
            localCurrency: 'krw',
            providerAmount: 2222,
            providerCurrency: 'usd',
            krwPerUsd: '1350',
            krwPerUsdUpdatedAt: '2026-08-15T00:00:00.000Z',
            orderNumber: 'ORD-20240101-ABCD1',
            paymentIntentId: 'pi_stripe_abc',
            quotedAt: '2026-08-15T00:00:00.000Z',
          },
        },
      });
      const stripeManager = makeRefundManager({
        findOne: jest.fn().mockImplementation((entity: unknown) =>
          entity === Payment ? Promise.resolve(stripePayment) : Promise.resolve(null),
        ),
      });
      mockDataSource.transaction
        .mockImplementationOnce(async (fn: (m: typeof stripeManager) => Promise<unknown>) => fn(stripeManager))
        .mockImplementationOnce(async (fn: (m: typeof stripeManager) => Promise<unknown>) => fn(stripeManager));

      mockPaymentRepo.findOne.mockResolvedValue(stripePayment);
      mockRefundRepo.findOne.mockResolvedValue({
        id: 1, paymentId: 100, amount: 10000, status: RefundStatus.COMPLETED, reason: '부분 환불',
      });

      mockStripeAdapter.partialCancel.mockResolvedValue({
        refundId: 're_stripe_123',
        cancelledAt: new Date(),
        rawResponse: { stripe: true },
      });

      const result = await service.partialRefund(1, { amount: 10000, reason: '부분 환불' , idempotencyKey: 'refund-test' });

      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(mockStripeAdapter.partialCancel).toHaveBeenCalled();
      expect(mockDefaultGateway.partialCancel).not.toHaveBeenCalled();
    });

    it('결제 CONFIRMED 아님 → BadRequestException', async () => {
      const pendingManager = makeRefundManager({
        findOne: jest.fn().mockResolvedValue(makePayment({ status: PaymentStatus.PENDING, paymentKey: 'pay_abc' })),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof pendingManager) => Promise<unknown>) => fn(pendingManager),
      );

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' , idempotencyKey: 'refund-test' })).rejects.toThrow(BadRequestException);
    });

    it('금액 초과 → BadRequestException', async () => {
      const overManager = makeRefundManager({
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '25000' }),
        }),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof overManager) => Promise<unknown>) => fn(overManager),
      );

      await expect(service.partialRefund(1, { amount: 99999, reason: '초과' , idempotencyKey: 'refund-test' })).rejects.toThrow(BadRequestException);
    });

    it('결과가 불명확한 어댑터 실패 → Refund pending 유지 + InternalServerErrorException', async () => {
      const refundManager = makeRefundManager();
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof refundManager) => Promise<unknown>) => fn(refundManager),
      );

      mockPaymentRepo.findOne.mockResolvedValue(confirmedPayment);
      mockDefaultGateway.partialCancel.mockRejectedValue(new Error('gateway error'));
      mockRefundRepo.update.mockResolvedValue({});

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' , idempotencyKey: 'refund-test' })).rejects.toThrow(InternalServerErrorException);
      expect(mockRefundRepo.update).not.toHaveBeenCalledWith(expect.anything(), { status: RefundStatus.FAILED });
    });

    it('[CRITICAL] 부분 환불 2회 누적 — totalRefunded 이중 계산 없이 정확히 누적', async () => {
      // 총 10000원 결제, 5000 1차 환불 후 SUM=5000 → PARTIAL_CANCELLED
      // 5000 2차 환불 후 SUM=10000 → REFUNDED + Order REFUNDED
      const totalPayment = makePayment({
        id: 100,
        orderId: 1,
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_abc',
        amount: 10000,
        gateway: PaymentGatewayType.MOCK,
      });

      // Phase 1 manager (create pending refund)
      const phase1Manager = makeRefundManager({
        findOne: jest.fn().mockImplementation((entity: unknown) =>
          entity === Payment ? Promise.resolve(totalPayment) : Promise.resolve(null),
        ),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
        }),
      });

      // Phase 3 manager: after updating refund to COMPLETED, SUM returns 10000
      const phase3Manager = makeTransactionManager({
        findOne: jest.fn().mockResolvedValue(totalPayment),
        update: jest.fn().mockResolvedValue({}),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '10000' }),
        }),
      });

      mockDataSource.transaction
        .mockImplementationOnce(async (fn: (m: typeof phase1Manager) => Promise<unknown>) => fn(phase1Manager))
        .mockImplementationOnce(async (fn: (m: typeof phase3Manager) => Promise<unknown>) => fn(phase3Manager));

      mockPaymentRepo.findOne.mockResolvedValue(totalPayment);
      mockRefundRepo.findOne.mockResolvedValue({
        id: 2, paymentId: 100, amount: 5000, status: RefundStatus.COMPLETED, reason: '2차 환불',
      });
      mockDefaultGateway.partialCancel.mockResolvedValue({
        refundId: 'mock-refund-456',
        cancelledAt: new Date(),
        rawResponse: { mock: true },
      });

      await service.partialRefund(1, { amount: 5000, reason: '2차 환불' , idempotencyKey: 'refund-test' });

      // Phase 3 must update Payment to REFUNDED and Order to REFUNDED
      expect(phase3Manager.update).toHaveBeenCalledWith(Payment, totalPayment.id, { status: PaymentStatus.REFUNDED });
      expect(phase3Manager.update).toHaveBeenCalledWith(Order, totalPayment.orderId, { status: OrderStatus.REFUNDED });
    });

    it('[HIGH] Phase 3 DB 실패 — gateway 성공 후 DB 동기화 실패 시 Refund를 FAILED로 마킹하지 않음', async () => {
      const refundManager = makeRefundManager();
      mockDataSource.transaction
        .mockImplementationOnce(async (fn: (m: typeof refundManager) => Promise<unknown>) => fn(refundManager))
        .mockImplementationOnce(async () => { throw new Error('DB 오류'); });

      mockPaymentRepo.findOne.mockResolvedValue(confirmedPayment);
      mockDefaultGateway.partialCancel.mockResolvedValue({
        refundId: 'mock-refund-789',
        cancelledAt: new Date(),
        rawResponse: { mock: true },
      });
      mockRefundRepo.update.mockResolvedValue({});

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' , idempotencyKey: 'refund-test' })).rejects.toThrow(InternalServerErrorException);

      // Refund must NOT be marked FAILED — gateway already processed the refund
      expect(mockRefundRepo.update).not.toHaveBeenCalledWith(expect.anything(), { status: RefundStatus.FAILED });
    });
  });

  describe('cancel()', () => {
    it('confirmed payment → cancelled', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED, paymentKey: 'pay_abc' });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt: new Date(), rawResponse: { mock: true } });
      mockPaymentRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});

      const result = await service.cancel({ orderId: 1 }, 10);
      expect(result.status).toBe(PaymentStatus.CANCELLED);
    });

    it('pending payment → BadRequestException', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.PENDING }));
      await expect(service.cancel({ orderId: 1 }, 10)).rejects.toThrow(BadRequestException);
    });

    it('payment.gateway=TOSS → cancel 시 Toss adapter의 cancel()이 호출되어야 함', async () => {
      // confirm()과 동일한 class of bug: 저장된 gateway를 무시하고 default를 쓰면
      // Toss로 결제된 건을 Mock으로 환불 요청하게 되어 실제 환불이 일어나지 않음.
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_toss_abc',
        gateway: PaymentGatewayType.TOSS,
      });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockTossAdapter.cancel.mockResolvedValue({ cancelledAt: new Date(), rawResponse: { toss: true } });
      mockPaymentRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});

      const result = await service.cancel({ orderId: 1 }, 10);

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockTossAdapter.cancel).toHaveBeenCalledWith(
        'pay_toss_abc',
        '고객 요청',
        expect.objectContaining({ originalAmount: 30000, orderNumber: 'ORD-20240101-ABCD1' }),
      );
      expect(mockDefaultGateway.cancel).not.toHaveBeenCalled();
    });

    it('사용자 cancel 시 재고 복구를 같은 트랜잭션에서 수행 (issue #723)', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED, paymentKey: 'pay_abc' });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt: new Date(), rawResponse: { mock: true } });

      // 트랜잭션 매니저: 옵션이 있는 항목 1개 + 옵션 없는 항목 1개.
      const items = [
        { orderId: 1, productId: 11, productOptionId: 22, quantity: 3 },
        { orderId: 1, productId: 12, productOptionId: null, quantity: 5 },
      ];
      const txManager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Payment) return Promise.resolve(payment);
          if (entity === Order) return Promise.resolve(payment.order);
          return Promise.resolve(null);
        }),
        find: jest.fn().mockResolvedValue(items),
        increment: jest.fn().mockResolvedValue({}),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof txManager) => Promise<unknown>) => fn(txManager),
      );

      await service.cancel({ orderId: 1 }, 10);

      // 옵션 있는 항목: 옵션 재고만.
      expect(txManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 22 }, 'stock', 3);
      // 옵션 없는 항목: 상품 재고만.
      expect(txManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 12 }, 'stock', 5);
      // 옵션 있는 상품의 product.stock 은 건드리지 않음.
      expect(txManager.increment).toHaveBeenCalledTimes(2);
    });



    it('cancelPaidOrder() persists reconciliation marker when DB sync fails after gateway cancellation (#898)', async () => {
      const order = makeOrder({ status: OrderStatus.PAID, pointsUsed: 0 });
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_abc',
        order,
      });
      const cancelledAt = new Date();
      const syncError = new Error('db sync failed');
      const txManager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Payment) return Promise.resolve(payment);
          if (entity === Order) return Promise.resolve(payment.order);
          return Promise.resolve(null);
        }),
      });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt, rawResponse: { mock: true } });
      mockDataSource.transaction.mockImplementationOnce(async (fn: (m: typeof txManager) => Promise<unknown>) => {
        await fn(txManager);
        throw syncError;
      });

      await expect(service.cancelPaidOrder(1, '관리자 승인')).rejects.toThrow(syncError);

      expect(mockDefaultGateway.cancel).toHaveBeenCalledWith(
        'pay_abc',
        '관리자 승인',
        expect.objectContaining({ originalAmount: 30000, orderNumber: 'ORD-20240101-ABCD1' }),
      );
      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, {
        status: PaymentStatus.CANCELLED,
        cancelledAt,
        cancelReason: '관리자 승인',
        rawResponse: expect.objectContaining({
          gatewayCancellationSucceeded: true,
          reconciliationRequired: true,
          orderId: 1,
          rawResponse: { mock: true },
          error: 'db sync failed',
        }),
      });
    });

it('cancelAdmin() persists reconciliation marker when order sync fails after gateway refund', async () => {
  const order = makeOrder({ status: OrderStatus.REFUND_REQUESTED, pointsUsed: 0 });
  const payment = makePayment({
    status: PaymentStatus.CONFIRMED,
    paymentKey: 'pay_refund',
    order,
  });
  const refundedAt = new Date();
  const syncError = new Error('refund sync failed');
  const txManager = makeTransactionManager({
    findOne: jest.fn().mockResolvedValue(payment),
  });
  mockPaymentRepo.findOne.mockResolvedValue(payment);
  mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt: refundedAt, rawResponse: { refund: true } });
  mockDataSource.transaction.mockImplementationOnce(async (fn: (m: typeof txManager) => Promise<unknown>) => {
    await fn(txManager);
    throw syncError;
  });

  await expect(
    service.cancelAdmin(1, '관리자 환불 처리', async () => {
      throw syncError;
    }),
  ).rejects.toThrow(syncError);

  expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, {
    status: PaymentStatus.REFUNDED,
    cancelledAt: refundedAt,
    cancelReason: '관리자 환불 처리',
    rawResponse: expect.objectContaining({
      gatewayRefundSucceeded: true,
      reconciliationRequired: true,
      orderId: 1,
      rawResponse: { refund: true },
      error: 'refund sync failed',
    }),
  });
});

it('cancelAdmin() updates payment before running admin refund sync in one transaction', async () => {
  const order = makeOrder({ status: OrderStatus.REFUND_REQUESTED, pointsUsed: 0 });
  const payment = makePayment({
    status: PaymentStatus.CONFIRMED,
    paymentKey: 'pay_refund',
    order,
  });
  const refundedAt = new Date();
  const txManager = makeTransactionManager({
    findOne: jest.fn().mockResolvedValue(payment),
  });
  mockPaymentRepo.findOne.mockResolvedValue(payment);
  mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt: refundedAt, rawResponse: { refund: true } });
  mockDataSource.transaction.mockImplementationOnce(
    async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(txManager),
  );
  const postGatewaySync = jest.fn().mockResolvedValue(undefined);

  const result = await service.cancelAdmin(1, '관리자 환불 처리', postGatewaySync);

  expect(result.status).toBe(PaymentStatus.REFUNDED);
  expect(txManager.update).toHaveBeenCalledWith(Payment, payment.id, {
    status: PaymentStatus.REFUNDED,
    cancelledAt: refundedAt,
    cancelReason: '관리자 환불 처리',
    rawResponse: { refund: true },
  });
  expect(postGatewaySync).toHaveBeenCalledWith(txManager, refundedAt);
});

    it('cancelPaidOrder()는 전달받은 트랜잭션에서 PG 취소 후 Payment/Order/stock/points를 함께 갱신한다 (#898)', async () => {
      const order = makeOrder({
        status: OrderStatus.PAID,
        pointsUsed: 1000,
      });
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_abc',
        order,
      });
      const items = [
        { orderId: 1, productId: 11, productOptionId: 22, quantity: 3 },
        { orderId: 1, productId: 12, productOptionId: null, quantity: 5 },
      ];
      const cancelledAt = new Date();
      const txManager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Payment) return Promise.resolve(payment);
          if (entity === Order) return Promise.resolve(order);
          return Promise.resolve(null);
        }),
        find: jest.fn().mockResolvedValue(items),
        increment: jest.fn().mockResolvedValue({}),
      });
      mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt, rawResponse: { mock: true } });

      const result = await service.cancelPaidOrder(
        1,
        '관리자 승인',
        txManager as unknown as EntityManager,
      );

      expect(result.status).toBe(PaymentStatus.CANCELLED);
      expect(mockDefaultGateway.cancel).toHaveBeenCalledWith(
        'pay_abc',
        '관리자 승인',
        expect.objectContaining({ originalAmount: 30000, orderNumber: 'ORD-20240101-ABCD1' }),
      );
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(txManager.update).toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.CANCELLED,
        cancelledAt,
        cancelReason: '관리자 승인',
        rawResponse: { mock: true },
      });
      expect(txManager.update).toHaveBeenCalledWith(Order, 1, expect.objectContaining({
        status: OrderStatus.CANCELLED,
        cancelReason: '관리자 승인',
        cancelledAt,
      }));
      expect(txManager.increment).toHaveBeenCalledTimes(2);
      expect(txManager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: order.userId,
          type: 'admin_adjust',
          amount: 1000,
          balance: 3000,
          orderId: order.id,
        }),
      );
    });

    it('cancelPaidOrder() rejects stale locked transitions before terminal cancellation side effects run', async () => {
      const order = makeOrder({
        status: OrderStatus.PAID,
        pointsUsed: 1000,
      });
      const payment = makePayment({
        status: PaymentStatus.CONFIRMED,
        paymentKey: 'pay_abc',
        order,
      });
      const cancelledAt = new Date();
      const txManager = makeTransactionManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Payment) return Promise.resolve(payment);
          if (entity === Order) return Promise.resolve(makeOrder({
            id: order.id,
            userId: order.userId,
            orderNumber: order.orderNumber,
            status: OrderStatus.SHIPPED,
            pointsUsed: order.pointsUsed,
            totalAmount: order.totalAmount,
          }));
          return Promise.resolve(null);
        }),
      });
      mockDefaultGateway.cancel.mockResolvedValue({ cancelledAt, rawResponse: { mock: true } });

      await expect(
        service.cancelPaidOrder(1, '관리자 승인', txManager as unknown as EntityManager),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(txManager.update).not.toHaveBeenCalled();
      expect(txManager.increment).not.toHaveBeenCalled();
      expect(txManager.save).not.toHaveBeenCalled();
      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, {
        status: PaymentStatus.CANCELLED,
        cancelledAt,
        cancelReason: '관리자 승인',
        rawResponse: expect.objectContaining({
          gatewayCancellationSucceeded: true,
          reconciliationRequired: true,
          orderId: 1,
          rawResponse: { mock: true },
          error: expect.any(String),
        }),
      });
    });
  });
});
