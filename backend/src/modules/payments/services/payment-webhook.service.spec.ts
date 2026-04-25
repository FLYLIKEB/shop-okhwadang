import { Logger, UnauthorizedException } from '@nestjs/common';
import { PaymentWebhookService } from './payment-webhook.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { PaymentGateway } from '../interfaces/payment-gateway.interface';

const makeWebhookManager = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  ...overrides,
});

interface BuildArgs {
  gateway?: Partial<PaymentGateway>;
  paymentRepo?: { findOne?: jest.Mock };
  manager?: ReturnType<typeof makeWebhookManager>;
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
  const manager = args.manager ?? makeWebhookManager();
  const transaction = jest.fn(
    async (fn: (m: typeof manager) => Promise<unknown>) => fn(manager),
  );
  const dataSource = { transaction } as never;
  const logger = new Logger('PaymentWebhookService.spec');

  const service = new PaymentWebhookService({
    gateway,
    paymentRepository: paymentRepo as never,
    dataSource,
    logger,
  });

  return { service, gateway, paymentRepo, manager, transaction, logger };
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
    it('DONE 이벤트 → Payment CONFIRMED + Order PAID + paidAt 기록', async () => {
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

      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({
          status: PaymentStatus.CONFIRMED,
          paidAt: expect.any(Date),
        }),
      );
      expect(manager.update).toHaveBeenCalledWith(Order, 7, {
        status: OrderStatus.PAID,
      });
    });

    it('CANCEL 이벤트 → Payment CANCELLED + Order CANCELLED + cancelledAt 기록', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'paid' }),
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
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'paid' }),
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

    it('eventType 이 우선 매칭된다 (eventType > status > type)', async () => {
      const manager = makeWebhookManager({
        findOne: jest.fn().mockResolvedValue({ id: 7, status: 'pending' }),
      });
      const { service, gateway, paymentRepo } = buildService({ manager });
      (gateway.verifyWebhook as jest.Mock).mockReturnValue(true);
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 7 });

      // eventType=DONE → status=CANCELLED 보다 우선되어 PAID 로 전이
      await service.handleWebhook(
        { orderId: 7, eventType: 'DONE', status: 'CANCELLED' },
        'valid_sig',
      );

      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        10,
        expect.objectContaining({ status: PaymentStatus.CONFIRMED }),
      );
    });
  });

  describe('Idempotent / 차단 전이', () => {
    it('이미 PAID 인 주문에 DONE 웹훅 재수신 → allowSameStatus=true 로 멱등 처리', async () => {
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

      // 동일 상태(paid → paid) 전이는 허용되어 update 가 호출됨
      expect(manager.update).toHaveBeenCalled();
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
