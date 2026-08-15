import { Logger, UnauthorizedException } from '@nestjs/common';
import { PointsService } from '../../points/points.service';
import { PaymentWebhookService } from './payment-webhook.service';
import { Payment, PaymentStatus, PaymentGatewayType } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentWebhookResult } from '../entities/payment-webhook-event.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';

const makeWebhookManager = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  find: jest.fn().mockResolvedValue([]),
  increment: jest.fn().mockResolvedValue({}),
  save: jest.fn().mockResolvedValue({}),
  ...overrides,
});

interface BuildArgs {
  gateway?: Partial<PaymentGateway>;
  gatewayType?: PaymentGatewayType;
  paymentRepo?: { findOne?: jest.Mock };
  manager?: ReturnType<typeof makeWebhookManager>;
  webhookEventRepo?: {
    create?: jest.Mock;
    save?: jest.Mock;
    update?: jest.Mock;
  };
}

const buildService = (args: BuildArgs = {}) => {
  const gateway: PaymentGateway = {
    prepare: jest.fn(),
    confirm: jest.fn(),
    cancel: jest.fn(),
    partialCancel: jest.fn(),
    verifyWebhook: jest.fn(),
    ...args.gateway,
  } as PaymentGateway;
  const paymentRepo = {
    findOne: jest.fn(),
    ...args.paymentRepo,
  };
  let savedEventCounter = 0;
  const webhookEventRepo = {
    create: jest.fn((entity: object) => entity),
    save: jest.fn(async (entity: object) => ({ id: ++savedEventCounter, ...entity })),
    update: jest.fn().mockResolvedValue({}),
    ...args.webhookEventRepo,
  };
  const manager = args.manager ?? makeWebhookManager();
  const transaction = jest.fn(
    async (fn: (m: typeof manager) => Promise<unknown>) => fn(manager),
  );
  const dataSource = { transaction } as never;
  const logger = new Logger('PaymentWebhookService.spec');
  const pointsService = {
    lockUserForPointChanges: jest.fn(),
    creditFifo: jest.fn().mockResolvedValue({}),
  } as Pick<PointsService, 'lockUserForPointChanges' | 'creditFifo'>;

  const service = new PaymentWebhookService({
    gateway,
    gatewayType: args.gatewayType ?? PaymentGatewayType.MOCK,
    paymentRepository: paymentRepo as never,
    webhookEventRepository: webhookEventRepo as never,
    dataSource,
    logger,
    pointsService,
  });

  return { service, gateway, paymentRepo, webhookEventRepo, manager, transaction, logger, pointsService };
};

describe('PaymentWebhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('서명 검증', () => {
    it('서명이 유효하면 처리한다', async () => {
      const { service, gateway } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      await expect(
        service.handleWebhook({ eventType: 'PING' }, 'valid_sig'),
      ).resolves.not.toThrow();
      expect(gateway.verifyWebhook).toHaveBeenCalledWith(
        { eventType: 'PING' },
        'valid_sig',
      );
    });

    it('서명이 잘못되면 UnauthorizedException', async () => {
      const { service, gateway } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(false);

      await expect(service.handleWebhook({}, 'bad_sig')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('서명 검증 실패 시 후속 DB 작업이 일어나지 않는다', async () => {
      const { service, gateway, paymentRepo, transaction } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(false);

      await expect(service.handleWebhook({}, 'bad_sig')).rejects.toThrow();
      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe('비동기 결제 상태 갱신', () => {
    it('unbound DONE event never transitions Payment or Order to paid', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'pending' }),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 7,
        paidAt: null,
      });

      await service.handleWebhook(
        { orderId: 7, status: 'DONE' },
        'valid_sig',
      );

      expect(manager.update).not.toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({
          status: PaymentStatus.CONFIRMED,
        }),
      );
      expect(manager.update).not.toHaveBeenCalledWith(Order, 7, {
        status: OrderStatus.PAID,
      });
    });

    it('CANCEL 이벤트 → Payment CANCELLED + Order CANCELLED + cancelledAt 기록', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(
          entity === Order
            ? { id: 7, status: 'paid' }
            : { id: 10, orderId: 7, status: PaymentStatus.CONFIRMED, paidAt: new Date(), cancelledAt: null },
        )),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 7,
        paidAt: new Date(),
        cancelledAt: null,
      });

      await service.handleWebhook(
        { orderId: 7, status: 'CANCELLED' },
        'valid_sig',
      );

      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({
          status: PaymentStatus.CANCELLED,
          cancelledAt: expect.any(Date),
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(Order, 7, {
        status: OrderStatus.CANCELLED,
      });
    });

    it('REFUND 이벤트 → Payment REFUNDED + Order REFUNDED', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(
          entity === Order
            ? { id: 7, status: 'paid' }
            : { id: 10, orderId: 7, status: PaymentStatus.CONFIRMED, paidAt: new Date(), cancelledAt: null },
        )),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 7,
        paidAt: new Date(),
        cancelledAt: null,
      });

      await service.handleWebhook(
        { orderId: 7, status: 'REFUNDED' },
        'valid_sig',
      );

      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({ status: PaymentStatus.REFUNDED }),
      );
      expect(manager.update).toHaveBeenCalledWith(Order, 7, {
        status: OrderStatus.REFUNDED,
      });
    });

    it('CANCEL 웹훅: 옵션 있는 항목 옵션 재고만 / 옵션 없는 항목 상품 재고만 복구 (issue #723)', async () => {
      const items = [
        { orderId: 7, productId: 11, productOptionId: 22, quantity: 3 },
        { orderId: 7, productId: 12, productOptionId: null, quantity: 5 },
      ];
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'paid' }),
        find: jest.fn().mockResolvedValue(items),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7, paidAt: new Date(), cancelledAt: null });

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      expect(manager.increment).toHaveBeenCalledWith(expect.anything(), { id: 22 }, 'stock', 3);
      expect(manager.increment).toHaveBeenCalledWith(expect.anything(), { id: 12 }, 'stock', 5);
      expect(manager.increment).toHaveBeenCalledTimes(2);
    });

    it('이미 CANCELLED 인 주문에 CANCEL 웹훅 재수신 → 재고가 두 번 복구되지 않는다 (멱등성, issue #723)', async () => {
      const items = [
        { orderId: 7, productId: 11, productOptionId: 22, quantity: 3 },
      ];
      const manager = makeWebhookManager({
        // 이미 cancelled 상태에서 CANCEL 웹훅이 재수신된 경우.
        findOne: jest.fn().mockResolvedValue({ id: 7, status: OrderStatus.CANCELLED }),
        find: jest.fn().mockResolvedValue(items),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      // Payment/Order update 는 멱등(allowSameStatus)으로 호출될 수 있으나,
      // restoreOrderStock 은 절대 호출되어선 안 된다.
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('CANCEL 웹훅은 첫 terminal 전이에서만 포인트 복구 행을 기록한다', async () => {
      const order = { id: 7, status: OrderStatus.PAID, userId: 10, orderNumber: 'ORD-7', pointsUsed: 500 };
      const manager = makeWebhookManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => {
          if (entity === Order) return Promise.resolve(order);
          return Promise.resolve({
            id: 10,
            orderId: 7,
            status: PaymentStatus.CONFIRMED,
            paidAt: new Date(),
            cancelledAt: null,
          });
        }),
        find: jest.fn().mockResolvedValue([]),
        save: jest.fn().mockResolvedValue({}),
      });
      const { service, gateway, paymentRepo, pointsService } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7, paidAt: new Date(), cancelledAt: null });

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      expect(pointsService.creditFifo).toHaveBeenCalledWith(
        manager,
        10,
        500,
        expect.any(String),
        null,
        7,
        null,
        null,
        'admin_adjust',
      );
    });

    it('cancellation locks the current Order before Payment and ignores a CONFIRMING payment without recovery', async () => {
      const order = { id: 7, status: OrderStatus.PAID, userId: 10, pointsUsed: 500 };
      const confirmingPayment = {
        id: 10,
        orderId: 7,
        status: PaymentStatus.CONFIRMING,
        paidAt: null,
        cancelledAt: null,
      };
      const manager = makeWebhookManager({
        findOne: jest.fn().mockImplementation((entity: unknown, _options: unknown) => Promise.resolve(
          entity === Order ? order : confirmingPayment,
        )),
        find: jest.fn().mockResolvedValue([{ orderId: 7, productId: 11, quantity: 1 }]),
      });
      const { service, gateway, paymentRepo, pointsService } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7, status: PaymentStatus.CONFIRMED });

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      expect(manager.findOne).toHaveBeenNthCalledWith(
        2,
        Order,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.findOne).toHaveBeenNthCalledWith(
        3,
        Payment,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.increment).not.toHaveBeenCalled();
      expect(pointsService.creditFifo).not.toHaveBeenCalled();
    });

    it('uses the locked payment rather than a stale pre-transaction payment snapshot', async () => {
      const stalePayment = {
        id: 10,
        orderId: 7,
        status: PaymentStatus.CONFIRMED,
        paidAt: new Date('2026-01-01T00:00:00Z'),
        cancelledAt: null,
      };
      const lockedPayment = {
        ...stalePayment,
        paidAt: new Date('2026-02-01T00:00:00Z'),
      };
      const manager = makeWebhookManager({
        findOne: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(
          entity === Order
            ? { id: 7, status: OrderStatus.PAID }
            : lockedPayment,
        )),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue(stalePayment);

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        lockedPayment.id,
        expect.objectContaining({ paidAt: lockedPayment.paidAt }),
      );
    });

    it('eventType 이 우선 매칭된다 (eventType > status > type)', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'pending' }),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      // Unbound paid callbacks are ignored even when eventType takes precedence.
      await service.handleWebhook(
        { orderId: 7, eventType: 'DONE', status: 'CANCELLED' },
        'valid_sig',
      );

      expect(manager.update).not.toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );
    });
  });

  describe('Idempotent / 차단 전이', () => {
    it('already paid order ignores an unbound DONE callback', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'paid' }),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 7,
        paidAt: new Date('2026-01-01T00:00:00Z'),
      });

      await expect(
        service.handleWebhook(
          { orderId: 7, status: 'DONE' },
          'valid_sig',
        ),
      ).resolves.not.toThrow();

      expect(manager.update).not.toHaveBeenCalled();
    });

    it('차단 전이(delivered → paid) 는 update 를 수행하지 않음', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'delivered' }),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook(
        { orderId: 7, status: 'DONE' },
        'valid_sig',
      );

      expect(manager.update).not.toHaveBeenCalled();
    });

    it('알 수 없는 이벤트 → DB 작업 없이 무시', async () => {
      const { service, gateway, paymentRepo, transaction } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook(
        { orderId: 7, eventType: 'UNKNOWN_TYPE' },
        'valid_sig',
      );

      expect(transaction).not.toHaveBeenCalled();
    });

    it('orderId 가 유효하지 않으면 무시', async () => {
      const { service, gateway, paymentRepo } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      await service.handleWebhook(
        { orderId: 'invalid', status: 'DONE' },
        'valid_sig',
      );

      expect(paymentRepo.findOne).not.toHaveBeenCalled();
    });

    it('이벤트 키가 모두 비어있으면 무시', async () => {
      const { service, gateway, paymentRepo } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      await service.handleWebhook({ orderId: 7 }, 'valid_sig');

      expect(paymentRepo.findOne).not.toHaveBeenCalled();
    });

    it('payment 가 존재하지 않으면 DB 갱신 없이 무시', async () => {
      const { service, gateway, paymentRepo, transaction } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue(null);

      await service.handleWebhook(
        { orderId: 999, status: 'DONE' },
        'valid_sig',
      );

      expect(transaction).not.toHaveBeenCalled();
    });

    it('order 가 트랜잭션 내에서 사라졌다면 update 를 수행하지 않음', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook(
        { orderId: 7, status: 'DONE' },
        'valid_sig',
      );

      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe('멱등성 / 결과 추적 (issue #725)', () => {
    it('unbound paid callback records IGNORED rather than success', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'pending' }),
      });
      const { service, gateway, paymentRepo, webhookEventRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7, paidAt: null });

      await service.handleWebhook({ orderId: 7, status: 'DONE' }, 'valid_sig');

      expect(webhookEventRepo.save).toHaveBeenCalledTimes(1);
      expect(webhookEventRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          result: PaymentWebhookResult.IGNORED,
          paymentId: 10,
          orderId: 7,
          processedAt: expect.any(Date),
        }),
      );
    });

    it('동일 eventId 재수신 → ER_DUP_ENTRY 잡고 IGNORED 반환 (DB 작업 없음)', async () => {
      const dupErr = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
      const webhookEventRepo = {
        create: jest.fn((e: object) => e),
        save: jest.fn().mockRejectedValue(dupErr),
        update: jest.fn().mockResolvedValue({}),
      };
      const { service, gateway, paymentRepo, transaction } = buildService({ webhookEventRepo });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      await service.handleWebhook({ orderId: 7, status: 'DONE' }, 'valid_sig');

      // 중복 차단 → 후속 처리 없음
      expect(paymentRepo.findOne).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      // events 테이블의 후속 update 도 호출되지 않음 (insert 자체가 실패했기 때문)
      expect(webhookEventRepo.update).not.toHaveBeenCalled();
    });

    it('unbound paid callback does not enter transaction processing', async () => {
      const dbErr = new Error('DB connection lost');
      const manager = makeWebhookManager({
        findOne: jest.fn().mockRejectedValue(dbErr),
      });
      const { service, gateway, paymentRepo, webhookEventRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook({ orderId: 7, status: 'DONE' }, 'valid_sig');

      expect(webhookEventRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          result: PaymentWebhookResult.IGNORED,
          errorMessage: null,
          processedAt: expect.any(Date),
        }),
      );
    });

    it('이미 CANCELLED 인 주문에 CANCEL 재수신 → IGNORED (추가 terminal mutation 없이 no-op)', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: OrderStatus.CANCELLED }),
      });
      const { service, gateway, webhookEventRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      await service.handleWebhook({ orderId: 7, status: 'CANCELLED' }, 'valid_sig');

      expect(webhookEventRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ result: PaymentWebhookResult.IGNORED }),
      );
      expect(manager.increment).not.toHaveBeenCalled();
    });

    it('차단 전이 → IGNORED 결과 기록', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'delivered' }),
      });
      const { service, gateway, paymentRepo, webhookEventRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      await service.handleWebhook({ orderId: 7, status: 'DONE' }, 'valid_sig');

      expect(webhookEventRepo.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ result: PaymentWebhookResult.IGNORED }),
      );
    });

    it('idempotency key 추출 실패 시 events 테이블에 insert 하지 않음 (return early)', async () => {
      const { service, gateway, webhookEventRepo } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);

      // MOCK gateway 에서 orderId / eventType 모두 비어있으면 키 추출 실패
      await service.handleWebhook({}, 'valid_sig');

      expect(webhookEventRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('로그 민감 정보 마스킹', () => {
    it('orderId/status/type 만 로그에 기록되고 카드/계좌 번호는 제외된다', async () => {
      const { service, gateway, paymentRepo, logger } = buildService();
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue(null); // 빠르게 종료
      const logSpy = jest.spyOn(logger, 'log');

      await service.handleWebhook(
        {
          orderId: 42,
          status: 'DONE',
          type: 'PAYMENT',
          cardNumber: '4111111111111111',
          accountNumber: '987654321',
        },
        'valid_sig',
      );

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('42'));
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('4111111111111111'),
      );
      expect(logSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('987654321'),
      );
    });
  });
});
