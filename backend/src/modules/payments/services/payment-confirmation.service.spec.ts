import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
  create: jest
    .fn()
    .mockImplementation((_entity: unknown, data: unknown) => data),
  ...overrides,
});

const makeDataSource = (manager = makeTransactionManager()) => ({
  transaction: jest.fn(
    async (
      fn: (m: ReturnType<typeof makeTransactionManager>) => Promise<unknown>,
    ) => fn(manager),
  ),
  _manager: manager,
});

interface BuildArgs {
  paymentRepo?: Partial<{
    findOne: jest.Mock;
    update: jest.Mock;
  }>;
  orderRepo?: Partial<{ findOne: jest.Mock; update: jest.Mock }>;
  shippingRepo?: Partial<{ findOne: jest.Mock }>;
  dataSource?: ReturnType<typeof makeDataSource>;
  gateway?: Partial<PaymentGateway>;
  resolveGateway?: jest.Mock;
  notifyDispatch?: jest.Mock;
  notificationSend?: jest.Mock;
}

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
  const shippingRepo = {
    findOne: jest.fn(),
    ...args.shippingRepo,
  };
  const dataSource = args.dataSource ?? makeDataSource();
  const gateway: PaymentGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
    ...args.gateway,
  } as PaymentGateway;
  const resolveGatewayByType = args.resolveGateway ?? jest.fn(() => gateway);
  const notificationDispatch =
    args.notifyDispatch ?? jest.fn().mockResolvedValue(undefined);
  const notificationSend =
    args.notificationSend ?? jest.fn().mockResolvedValue(undefined);

  const service = new PaymentConfirmationService({
    paymentRepository: paymentRepo as never,
    orderRepository: orderRepo as never,
    shippingRepository: shippingRepo as never,
    dataSource: dataSource as never,
    notificationService: {
      sendPaymentConfirmed: notificationSend,
    } as never,
    notificationDispatchHelper: {
      dispatch: notificationDispatch,
    } as never,
    resolveGatewayByType,
    logger: new Logger('PaymentConfirmationService.spec'),
    defaultCarrier: 'mock',
  });

  return {
    service,
    paymentRepo,
    orderRepo,
    shippingRepo,
    dataSource,
    gateway,
    resolveGatewayByType,
    notificationDispatch,
    notificationSend,
  };
};

describe('PaymentConfirmationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('confirm() — 정상 흐름', () => {
    it('PENDING 결제를 CONFIRMED 로 전환하고 paidAt 을 기록한다', async () => {
      const payment = makePayment();
      const { service, paymentRepo, dataSource, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (gateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
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
      const { service, dataSource, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (gateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });

      await service.confirm(
        { orderId: 1, paymentKey: 'pay_abc', amount: 30000 },
        10,
      );

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
        findOne: jest.fn().mockResolvedValue(existingShipping),
      });
      const dataSource = makeDataSource(manager);
      const { service, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        dataSource,
      });
      (gateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pay_abc',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: { mock: true },
      });

      await service.confirm(
        { orderId: 1, paymentKey: 'pay_abc', amount: 30000 },
        10,
      );

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
      const { service, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(ConflictException);
      expect(gateway.confirm).not.toHaveBeenCalled();
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
      const { service, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(gateway.confirm).not.toHaveBeenCalled();
    });

    it('amount 가 주문 totalAmount 와 불일치 → BadRequestException', async () => {
      const payment = makePayment();
      const { service, gateway } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 99999 }, 10),
      ).rejects.toThrow(BadRequestException);
      expect(gateway.confirm).not.toHaveBeenCalled();
    });
  });

  describe('confirm() — 게이트웨이 분기/실패', () => {
    it('payment.gateway 값으로 어댑터를 라우팅한다 (TOSS)', async () => {
      const payment = makePayment({ gateway: PaymentGatewayType.TOSS });
      const tossGateway: PaymentGateway = {
        prepare: jest.fn(),
        confirm: jest.fn().mockResolvedValue({
          paymentKey: 'pay_toss',
          method: 'card',
          amount: 30000,
          status: 'confirmed',
          rawResponse: { toss: true },
        }),
        cancel: jest.fn(),
        partialCancel: jest.fn(),
        verifyWebhook: jest.fn(),
      };
      const resolveGateway = jest.fn(() => tossGateway);

      const { service } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
        resolveGateway,
      });

      await service.confirm(
        { orderId: 1, paymentKey: 'pay_toss', amount: 30000 },
        10,
      );

      expect(resolveGateway).toHaveBeenCalledWith(PaymentGatewayType.TOSS);
      expect(tossGateway.confirm).toHaveBeenCalledWith(
        'pay_toss',
        30000,
        'ORD-20240101-ABCD1',
      );
    });

    it('게이트웨이가 던지면 payment 를 FAILED 로 마킹하고 InternalServerErrorException', async () => {
      const payment = makePayment();
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, gateway } = buildService({ paymentRepo });
      (gateway.confirm as jest.Mock).mockRejectedValue(
        new Error('gateway down'),
      );

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(InternalServerErrorException);
      expect(paymentRepo.update).toHaveBeenCalledWith(payment.id, {
        status: PaymentStatus.FAILED,
      });
    });

    it('트랜잭션 내부 실패 → payment FAILED 마킹', async () => {
      const payment = makePayment();
      const failingManager = makeTransactionManager({
        save: jest.fn().mockRejectedValue(new Error('shipping insert 실패')),
      });
      const dataSource = makeDataSource(failingManager);
      const paymentRepo = {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, gateway } = buildService({
        paymentRepo,
        dataSource,
      });
      (gateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await expect(
        service.confirm({ orderId: 1, paymentKey: 'pk', amount: 30000 }, 10),
      ).rejects.toThrow(InternalServerErrorException);
      expect(paymentRepo.update).toHaveBeenCalledWith(payment.id, {
        status: PaymentStatus.FAILED,
      });
    });
  });

  describe('confirm() — 알림 디스패치', () => {
    it('성공 시 fire-and-forget 으로 결제완료 알림을 디스패치한다', async () => {
      const payment = makePayment();
      const { service, gateway, notificationDispatch } = buildService({
        paymentRepo: { findOne: jest.fn().mockResolvedValue(payment) },
      });
      (gateway.confirm as jest.Mock).mockResolvedValue({
        paymentKey: 'pk',
        method: 'mock',
        amount: 30000,
        status: 'confirmed',
        rawResponse: {},
      });

      await service.confirm(
        { orderId: 1, paymentKey: 'pk', amount: 30000 },
        10,
      );

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
});
