import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PaymentRefundService } from './payment-refund.service';
import {
  Payment,
  PaymentGatewayType,
  PaymentStatus,
} from '../entities/payment.entity';
import { Refund, RefundStatus } from '../entities/refund.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';

const makeConfirmedPayment = (overrides: Partial<Payment> = {}): Payment =>
  ({
    id: 100,
    orderId: 1,
    amount: 30000,
    status: PaymentStatus.CONFIRMED,
    paymentKey: 'pay_abc',
    gateway: PaymentGatewayType.MOCK,
    ...overrides,
  } as unknown as Payment);

const makePendingRefund = (overrides: Partial<Refund> = {}): Refund =>
  ({
    id: 1,
    paymentId: 100,
    orderItemId: null,
    amount: 10000,
    reason: '부분 환불',
    status: RefundStatus.PENDING,
    gatewayRefundId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Refund);

const makeQueryBuilderRefundSum = (total: string) => ({
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getRawOne: jest.fn().mockResolvedValue({ total }),
});

const makePhase1Manager = (
  payment: Payment,
  refundedTotal = '0',
  pendingRefund: Refund = makePendingRefund(),
) => ({
  findOne: jest.fn().mockResolvedValue(payment),
  create: jest
    .fn()
    .mockImplementation((_entity: unknown, data: unknown) => ({
      ...pendingRefund,
      ...(data as object),
    })),
  save: jest
    .fn()
    .mockImplementation((_entity: unknown, data: unknown) =>
      Promise.resolve({ ...pendingRefund, ...(data as object) }),
    ),
  createQueryBuilder: jest
    .fn()
    .mockReturnValue(makeQueryBuilderRefundSum(refundedTotal)),
  update: jest.fn().mockResolvedValue({}),
});

const makePhase3Manager = (refundedAfter: string) => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest
    .fn()
    .mockReturnValue(makeQueryBuilderRefundSum(refundedAfter)),
});

interface BuildArgs {
  paymentRepo?: { findOne?: jest.Mock };
  refundRepo?: { findOne?: jest.Mock; update?: jest.Mock };
  phase1Manager?: ReturnType<typeof makePhase1Manager>;
  phase3Manager?: ReturnType<typeof makePhase3Manager>;
  phase3Throws?: Error;
  gateway?: Partial<PaymentGateway>;
  resolveGateway?: jest.Mock;
}

const buildService = (args: BuildArgs = {}) => {
  const paymentRepo = {
    findOne: jest.fn(),
    ...args.paymentRepo,
  };
  const refundRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    ...args.refundRepo,
  };
  const gateway: PaymentGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
    ...args.gateway,
  } as PaymentGateway;
  const resolveGateway = args.resolveGateway ?? jest.fn(() => gateway);

  const transaction = jest
    .fn()
    .mockImplementationOnce(
      async (
        fn: (m: ReturnType<typeof makePhase1Manager>) => Promise<unknown>,
      ) => fn(args.phase1Manager ?? makePhase1Manager(makeConfirmedPayment())),
    )
    .mockImplementationOnce(
      async (
        fn: (m: ReturnType<typeof makePhase3Manager>) => Promise<unknown>,
      ) => {
        if (args.phase3Throws) throw args.phase3Throws;
        return fn(args.phase3Manager ?? makePhase3Manager('10000'));
      },
    );

  const dataSource = { transaction } as never;

  const service = new PaymentRefundService({
    paymentRepository: paymentRepo as never,
    refundRepository: refundRepo as never,
    dataSource,
    resolveGatewayByType: resolveGateway,
    logger: new Logger('PaymentRefundService.spec'),
  });

  return {
    service,
    paymentRepo,
    refundRepo,
    gateway,
    resolveGateway,
    transaction,
  };
};

describe('PaymentRefundService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('partialRefund() — 환불 가능 상태 가드', () => {
    it.each([
      ['PENDING', PaymentStatus.PENDING],
      ['CANCELLED', PaymentStatus.CANCELLED],
      ['REFUNDED', PaymentStatus.REFUNDED],
      ['FAILED', PaymentStatus.FAILED],
    ])(
      '%s 상태에서는 환불을 거부한다 → BadRequestException',
      async (_label, status) => {
        const payment = makeConfirmedPayment({ status });
        const phase1Manager = makePhase1Manager(payment);
        const { service } = buildService({ phase1Manager });

        await expect(
          service.partialRefund(1, { amount: 1000, reason: '테스트' }),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('CONFIRMED 상태는 환불을 허용한다', async () => {
      const payment = makeConfirmedPayment({ amount: 30000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const phase3Manager = makePhase3Manager('10000');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue({
        ...makePendingRefund({ status: RefundStatus.COMPLETED }),
      });
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-1',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await expect(
        service.partialRefund(1, { amount: 10000, reason: '부분 환불' }),
      ).resolves.toBeDefined();
    });

    it('PARTIAL_CANCELLED 상태도 추가 환불을 허용한다', async () => {
      const payment = makeConfirmedPayment({
        status: PaymentStatus.PARTIAL_CANCELLED,
        amount: 30000,
      });
      const phase1Manager = makePhase1Manager(payment, '5000');
      const phase3Manager = makePhase3Manager('10000');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue(makePendingRefund());
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-2',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await expect(
        service.partialRefund(1, { amount: 5000, reason: '부분 환불 2차' }),
      ).resolves.toBeDefined();
    });

    it('paymentKey 가 없으면 BadRequestException', async () => {
      const payment = makeConfirmedPayment({ paymentKey: null });
      const phase1Manager = makePhase1Manager(payment);
      const { service } = buildService({ phase1Manager });

      await expect(
        service.partialRefund(1, { amount: 1000, reason: '테스트' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('결제가 존재하지 않으면 BadRequestException', async () => {
      const phase1Manager = {
        ...makePhase1Manager(makeConfirmedPayment()),
        findOne: jest.fn().mockResolvedValue(null),
      };
      const { service } = buildService({ phase1Manager });

      await expect(
        service.partialRefund(99, { amount: 1000, reason: '테스트' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('partialRefund() — 환불 금액 계산', () => {
    it('환불 잔여 금액 초과 시 BadRequestException', async () => {
      const payment = makeConfirmedPayment({ amount: 10000 });
      // 이미 7000 환불됨 → 잔여 3000원 → 5000 요청은 거부
      const phase1Manager = makePhase1Manager(payment, '7000');
      const { service } = buildService({ phase1Manager });

      await expect(
        service.partialRefund(1, { amount: 5000, reason: '초과 시도' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('전액 환불 시 Payment=REFUNDED + Order=REFUNDED 로 갱신', async () => {
      const payment = makeConfirmedPayment({ amount: 10000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const phase3Manager = makePhase3Manager('10000');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue({
        ...makePendingRefund({ amount: 10000, status: RefundStatus.COMPLETED }),
      });
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-full',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await service.partialRefund(1, { amount: 10000, reason: '전액 환불' });

      expect(phase3Manager.update).toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.REFUNDED,
      });
      expect(phase3Manager.update).toHaveBeenCalledWith(Order, payment.orderId, {
        status: OrderStatus.REFUNDED,
      });
    });

    it('부분 환불 시 Payment=PARTIAL_CANCELLED 로 갱신 (Order 는 유지)', async () => {
      const payment = makeConfirmedPayment({ amount: 30000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const phase3Manager = makePhase3Manager('10000');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue(
        makePendingRefund({ amount: 10000, status: RefundStatus.COMPLETED }),
      );
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-partial',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await service.partialRefund(1, { amount: 10000, reason: '부분 환불' });

      expect(phase3Manager.update).toHaveBeenCalledWith(Payment, payment.id, {
        status: PaymentStatus.PARTIAL_CANCELLED,
      });
      expect(phase3Manager.update).not.toHaveBeenCalledWith(
        Order,
        expect.anything(),
        expect.anything(),
      );
    });

    it('Refund 엔티티에 paymentKey 와 cancelAmount 가 게이트웨이로 전달된다', async () => {
      const payment = makeConfirmedPayment({
        amount: 30000,
        paymentKey: 'pk_abc',
      });
      const phase1Manager = makePhase1Manager(payment, '0');
      const phase3Manager = makePhase3Manager('10000');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue(
        makePendingRefund({ status: RefundStatus.COMPLETED }),
      );
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-z',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await service.partialRefund(1, { amount: 10000, reason: '환불 사유' });

      expect(gateway.partialCancel).toHaveBeenCalledWith({
        paymentKey: 'pk_abc',
        cancelAmount: 10000,
        cancelReason: '환불 사유',
      });
    });
  });

  describe('partialRefund() — 게이트웨이 분기', () => {
    it('payment.gateway 값으로 어댑터를 라우팅한다 (TOSS)', async () => {
      const payment = makeConfirmedPayment({
        gateway: PaymentGatewayType.TOSS,
        paymentKey: 'pay_toss',
      });
      const phase1Manager = makePhase1Manager(payment, '0');
      const phase3Manager = makePhase3Manager('10000');
      const tossGateway: PaymentGateway = {
        prepare: jest.fn(),
        confirm: jest.fn(),
        cancel: jest.fn(),
        partialCancel: jest.fn().mockResolvedValue({
          refundId: 'tosrid-1',
          cancelledAt: new Date(),
          rawResponse: { toss: true },
        }),
        verifyWebhook: jest.fn(),
      };
      const resolveGateway = jest.fn(() => tossGateway);
      const { service, paymentRepo, refundRepo } = buildService({
        phase1Manager,
        phase3Manager,
        resolveGateway,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      refundRepo.findOne.mockResolvedValue(
        makePendingRefund({ status: RefundStatus.COMPLETED }),
      );

      await service.partialRefund(1, { amount: 10000, reason: '환불' });

      expect(resolveGateway).toHaveBeenCalledWith(PaymentGatewayType.TOSS);
      expect(tossGateway.partialCancel).toHaveBeenCalled();
    });
  });

  describe('partialRefund() — 게이트웨이 실패 → Refund FAILED + 롤백', () => {
    it('게이트웨이가 던지면 Refund 를 FAILED 로 마킹하고 InternalServerErrorException', async () => {
      const payment = makeConfirmedPayment({ amount: 10000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      (gateway.partialCancel as jest.Mock).mockRejectedValue(
        new Error('gateway down'),
      );

      await expect(
        service.partialRefund(1, { amount: 5000, reason: '실패' }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(refundRepo.update).toHaveBeenCalledWith(expect.anything(), {
        status: RefundStatus.FAILED,
      });
    });

    it('게이트웨이가 BadRequestException 을 던지면 그대로 전파', async () => {
      const payment = makeConfirmedPayment({ amount: 10000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const { service, paymentRepo, gateway } = buildService({ phase1Manager });
      paymentRepo.findOne.mockResolvedValue(payment);
      (gateway.partialCancel as jest.Mock).mockRejectedValue(
        new BadRequestException('이미 환불됨'),
      );

      await expect(
        service.partialRefund(1, { amount: 5000, reason: '실패' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Phase 3 DB 동기화 실패 → Refund 를 FAILED 로 마킹하지 않음 (게이트웨이는 이미 환불 완료)', async () => {
      const payment = makeConfirmedPayment({ amount: 10000 });
      const phase1Manager = makePhase1Manager(payment, '0');
      const { service, paymentRepo, refundRepo, gateway } = buildService({
        phase1Manager,
        phase3Throws: new Error('DB sync failed'),
      });
      paymentRepo.findOne.mockResolvedValue(payment);
      (gateway.partialCancel as jest.Mock).mockResolvedValue({
        refundId: 'rid-x',
        cancelledAt: new Date(),
        rawResponse: {},
      });

      await expect(
        service.partialRefund(1, { amount: 5000, reason: '환불' }),
      ).rejects.toThrow(InternalServerErrorException);

      // Phase 3 실패 시 Refund 를 FAILED 로 마킹하면 안 됨 (게이트웨이는 성공)
      expect(refundRepo.update).not.toHaveBeenCalledWith(expect.anything(), {
        status: RefundStatus.FAILED,
      });
    });
  });
});
