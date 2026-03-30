import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PaymentsService } from '../payments.service';
import { Payment, PaymentStatus, PaymentMethod, PaymentGatewayType } from '../entities/payment.entity';
import { Shipping, ShippingStatus } from '../entities/shipping.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { MockPaymentAdapter, MOCK_TEST_SIGNATURE } from '../adapters/mock.adapter';

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

  const mockOrderRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockShippingRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    verifyWebhook: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(Shipping), useValue: mockShippingRepo },
        { provide: 'PaymentGateway', useValue: mockGateway },
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
      mockGateway.prepare.mockResolvedValue({ clientKey: 'mock_client_key', orderId: '1' });

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
      mockGateway.confirm.mockResolvedValue({
        paymentKey: 'pay_abc',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });
      mockPaymentRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});
      mockShippingRepo.findOne.mockResolvedValue(null);
      mockShippingRepo.create.mockReturnValue({ orderId: 1, carrier: 'mock', status: ShippingStatus.PAYMENT_CONFIRMED });
      mockShippingRepo.save.mockResolvedValue({});

      const result = await service.confirm({ orderId: 1, paymentKey: 'pay_abc', amount: 30000 }, 10);
      expect(result.status).toBe(PaymentStatus.CONFIRMED);
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
      mockGateway.confirm.mockRejectedValue(new Error('gateway error'));
      mockPaymentRepo.update.mockResolvedValue({});

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'fail_abc', amount: 30000 }, 10),
      ).rejects.toThrow('결제 승인에 실패했습니다.');
      expect(mockPaymentRepo.update).toHaveBeenCalledWith(payment.id, { status: PaymentStatus.FAILED });
    });
  });

  describe('cancel()', () => {
    it('confirmed payment → cancelled', async () => {
      const payment = makePayment({ status: PaymentStatus.CONFIRMED, paymentKey: 'pay_abc' });
      mockPaymentRepo.findOne.mockResolvedValue(payment);
      mockGateway.cancel.mockResolvedValue({ cancelledAt: new Date(), rawResponse: { mock: true } });
      mockPaymentRepo.update.mockResolvedValue({});
      mockOrderRepo.update.mockResolvedValue({});

      const result = await service.cancel({ orderId: 1 }, 10);
      expect(result.status).toBe(PaymentStatus.CANCELLED);
    });

    it('pending payment → BadRequestException', async () => {
      mockPaymentRepo.findOne.mockResolvedValue(makePayment({ status: PaymentStatus.PENDING }));
      await expect(service.cancel({ orderId: 1 }, 10)).rejects.toThrow(BadRequestException);
    });
  });
});
