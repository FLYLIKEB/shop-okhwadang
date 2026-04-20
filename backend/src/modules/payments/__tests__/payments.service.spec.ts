import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { Payment, PaymentStatus, PaymentMethod, PaymentGatewayType } from '../entities/payment.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Shipping } from '../entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { MockPaymentAdapter, MOCK_TEST_SIGNATURE } from '../adapters/mock.adapter';
import { TossPaymentAdapter } from '../adapters/toss.adapter';
import { StripePaymentAdapter } from '../adapters/stripe.adapter';
import { NotificationService } from '../../notification/notification.service';

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
    order: makeOrder(),
    ...overrides,
  } as unknown as Payment);

const makeTransactionManager = (overrides: Record<string, jest.Mock> = {}) => ({
  update: jest.fn().mockResolvedValue({}),
  findOne: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => data),
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
  });

  it('confirm → returns confirmed result', async () => {
    const result = await adapter.confirm('pay_abc', 30000, 'ORD-TEST');
    expect(result.status).toBe('confirmed');
    expect(result.method).toBe('mock');
    expect(result.amount).toBe(30000);
  });

  it('confirm with fail_ prefix → throws', async () => {
    await expect(adapter.confirm('fail_xyz', 30000, 'ORD-TEST')).rejects.toThrow('Mock payment failed');
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

  let mockDataSource: ReturnType<typeof makeDataSourceMock>;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockDataSource = makeDataSourceMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Refund), useValue: mockRefundRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Shipping), useValue: mockShippingRepo },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: 'PaymentGateway', useValue: mockDefaultGateway },
        { provide: TossPaymentAdapter, useValue: mockTossAdapter },
        { provide: StripePaymentAdapter, useValue: mockStripeAdapter },
        { provide: NotificationService, useValue: { sendPaymentConfirmed: jest.fn() } },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('prepare()', () => {
    it('valid order → returns clientKey', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      const savedPayment = makePayment();
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockDefaultGateway.prepare.mockResolvedValue({ clientKey: 'mock_client_key', orderId: '1' });

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
  });

  describe('confirm()', () => {
    it('amount match → confirmed', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
        paymentKey: 'pay_abc',
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

    it('shipping save 실패 → 트랜잭션 롤백 → payment FAILED 마킹 → InternalServerErrorException', async () => {
      const payment = makePayment();
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockDefaultGateway.confirm.mockResolvedValue({
        paymentKey: 'pay_abc',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });
      mockPaymentRepo.update.mockResolvedValue({});

      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('DB 오류 — shipping insert 실패')),
      });
      mockDataSource.transaction.mockImplementation(
        async (fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>) => fn(failingManager),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, { status: PaymentStatus.FAILED });
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
      mockPaymentRepo.update.mockResolvedValue({});

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'fail_abc', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인에 실패했습니다.');
      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, { status: PaymentStatus.FAILED });
    });

    it('locale=ko prepare → confirm 시 Toss adapter의 confirm()이 호출되어야 함', async () => {
      const order = makeOrder();
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockPaymentRepo.findOne.mockResolvedValue(null);
      const savedPayment = makePayment({ gateway: PaymentGatewayType.TOSS });
      mockPaymentRepo.create.mockReturnValue(savedPayment);
      mockPaymentRepo.save.mockResolvedValue(savedPayment);
      mockTossAdapter.prepare.mockResolvedValue({ clientKey: 'toss_client_key', orderId: '1' });

      const prepareResult = await service.prepare({ orderId: 1, locale: 'ko' }, 10);
      expect(prepareResult.gateway).toBe('toss');

      const paymentForConfirm = makePayment({ gateway: PaymentGatewayType.TOSS });
      mockPaymentRepo.findOne.mockResolvedValue(paymentForConfirm);
      mockTossAdapter.confirm.mockResolvedValue({
        paymentKey: 'pay_toss_abc',
        method: 'card',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { toss: true },
      });

      const confirmResult = await service.confirm({ orderId: 1, paymentKey: 'pay_toss_abc', amount: 30000 }, 10);
      expect(confirmResult.status).toBe(PaymentStatus.CONFIRMED);
      expect(mockTossAdapter.confirm).toHaveBeenCalledWith('pay_toss_abc', 30000, 'ORD-20240101-ABCD1');
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
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return makeTransactionManager({
        findOne: jest.fn().mockResolvedValue(confirmedPayment),
        create: jest.fn().mockImplementation((_entity: unknown, data: unknown) => ({ ...pendingRefund, ...(data as object) })),
        save: jest.fn().mockImplementation((_entity: unknown, data: unknown) => Promise.resolve({ ...pendingRefund, ...(data as object) })),
        getRawOne: jest.fn().mockResolvedValue({ total: '0' }),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
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

      const result = await service.partialRefund(1, { amount: 10000, reason: '부분 환불' });
      expect(result.status).toBe(RefundStatus.COMPLETED);
    });

    it('결제 CONFIRMED 아님 → BadRequestException', async () => {
      const pendingManager = makeRefundManager({
        findOne: jest.fn().mockResolvedValue(makePayment({ status: PaymentStatus.PENDING, paymentKey: 'pay_abc' })),
      });
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof pendingManager) => Promise<unknown>) => fn(pendingManager),
      );

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' })).rejects.toThrow(BadRequestException);
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

      await expect(service.partialRefund(1, { amount: 99999, reason: '초과' })).rejects.toThrow(BadRequestException);
    });

    it('어댑터 실패 → Refund status=failed + InternalServerErrorException', async () => {
      const refundManager = makeRefundManager();
      mockDataSource.transaction.mockImplementationOnce(
        async (fn: (m: typeof refundManager) => Promise<unknown>) => fn(refundManager),
      );

      mockPaymentRepo.findOne.mockResolvedValue(confirmedPayment);
      mockDefaultGateway.partialCancel.mockRejectedValue(new Error('gateway error'));
      mockRefundRepo.update.mockResolvedValue({});

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' })).rejects.toThrow(InternalServerErrorException);
      expect(mockRefundRepo.update).toHaveBeenCalledWith(expect.anything(), { status: RefundStatus.FAILED });
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
        findOne: jest.fn().mockResolvedValue(totalPayment),
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ total: '5000' }),
        }),
      });

      // Phase 3 manager: after updating refund to COMPLETED, SUM returns 10000
      const phase3Manager = makeTransactionManager({
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

      await service.partialRefund(1, { amount: 5000, reason: '2차 환불' });

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

      await expect(service.partialRefund(1, { amount: 10000, reason: '환불' })).rejects.toThrow(InternalServerErrorException);

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
      expect(mockTossAdapter.cancel).toHaveBeenCalledWith('pay_toss_abc', '고객 요청');
      expect(mockDefaultGateway.cancel).not.toHaveBeenCalled();
    });
  });
});
