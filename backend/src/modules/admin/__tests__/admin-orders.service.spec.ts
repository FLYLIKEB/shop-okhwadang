import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AdminOrdersService } from '../admin-orders.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Shipping, ShippingStatus } from '../../payments/entities/shipping.entity';
import { PaymentsService } from '../../payments/payments.service';
import { MembershipService } from '../../membership/membership.service';
import { PointsService } from '../../points/points.service';
import { NotificationService } from '../../notification/notification.service';
import { MessageNotificationService } from '../../notification/message-notification.service';

function createMockRepository() {
  const transactionManager = {
    increment: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    })),
    manager: {
      transaction: jest.fn(async (cb: (manager: typeof transactionManager) => Promise<void>) =>
        cb(transactionManager),
      ),
    },
  };
}

function createMockManager() {
  return {
    update: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    increment: jest.fn().mockResolvedValue({}),
    save: jest.fn().mockResolvedValue({}),
  };
}

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let orderRepo: ReturnType<typeof createMockRepository>;
  let paymentRepo: ReturnType<typeof createMockRepository>;
  let shippingRepo: ReturnType<typeof createMockRepository>;
  let paymentsService: jest.Mocked<PaymentsService>;
  let dataSource: jest.Mocked<DataSource>;
  let mockManager: ReturnType<typeof createMockManager>;
  let pointsService: jest.Mocked<PointsService>;
  let notificationService: jest.Mocked<NotificationService>;
  let messageNotificationService: jest.Mocked<MessageNotificationService>;

  beforeEach(async () => {
    orderRepo = createMockRepository();
    paymentRepo = createMockRepository();
    shippingRepo = createMockRepository();
    mockManager = createMockManager();
    paymentsService = {
      cancelAdmin: jest.fn(),
      cancelPaidOrder: jest.fn(),
      reconcileConfirmedPayment: jest.fn(),
    } as unknown as jest.Mocked<PaymentsService>;
    pointsService = {
      lockUserForPointChanges: jest.fn().mockResolvedValue(undefined),
      creditFifo: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<PointsService>;
    notificationService = {
      sendOrderCancelled: jest.fn().mockResolvedValue(undefined),
      sendShippingUpdate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;
    messageNotificationService = {
      sendOrderCancelled: jest.fn().mockResolvedValue(undefined),
      sendShippingStarted: jest.fn().mockResolvedValue(undefined),
      sendShippingDelivered: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageNotificationService>;
    const lockQueryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest
        .fn()
        .mockResolvedValueOnce([{ acquired: 1 }])
        .mockResolvedValueOnce([{ released: 1 }]),
      release: jest.fn().mockResolvedValue(undefined),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([{ acquired: 1 }]),
      createQueryRunner: jest.fn().mockReturnValue(lockQueryRunner),
      transaction: jest
        .fn()
        .mockImplementation((cb: (manager: unknown) => Promise<unknown>) => cb(mockManager)),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Shipping), useValue: shippingRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: MembershipService,
          useValue: { incrementAccumulatedAmount: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: PointsService, useValue: pointsService },
        { provide: NotificationService, useValue: notificationService },
        { provide: MessageNotificationService, useValue: messageNotificationService },
      ],
    }).compile();

    service = module.get<AdminOrdersService>(AdminOrdersService);
  });

  describe('findAll', () => {
    it('should return paginated orders', async () => {
      const result = await service.findAll({ page: 1, limit: 20 });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    });
  });

  describe('updateStatus', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.updateStatus(999, OrderStatus.PAID)).rejects.toThrow(NotFoundException);
    });

    it('pending → paid: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID });

      await service.updateStatus(1, OrderStatus.PAID);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PAID });
    });

    it('paid → preparing: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING });
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED });

      await service.updateStatus(1, OrderStatus.PREPARING);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PREPARING });
    });

    it('paid → preparing: rejects before payment confirmation without mutating the order', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID });
      paymentRepo.findOne.mockResolvedValue({ orderId: 1, status: PaymentStatus.PENDING });
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.PENDING });

      await expect(service.updateStatus(1, OrderStatus.PREPARING)).rejects.toThrow(
        '결제가 확정되지 않은 주문은 배송을 진행할 수 없습니다.',
      );
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.PREPARING,
      });
    });

    it('preparing → shipped: requires tracking number', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING });
      shippingRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(1, OrderStatus.SHIPPED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('preparing → shipped: allowed with tracking number and marks shipping as shipped', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.SHIPPED });
      shippingRepo.findOne.mockResolvedValue({
        orderId: 1,
        status: ShippingStatus.PREPARING,
        trackingNumber: '123456',
      });
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED })
        .mockResolvedValueOnce({ orderId: 1, trackingNumber: '123456' });

      await service.updateStatus(1, OrderStatus.SHIPPED);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.SHIPPED });
      expect(mockManager.update).toHaveBeenCalledWith(
        Shipping,
        { orderId: 1 },
        expect.objectContaining({ status: ShippingStatus.SHIPPED, shippedAt: expect.any(Date) }),
      );
    });

    it('shipped → delivered: allowed and marks shipping as delivered', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.SHIPPED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED });
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.SHIPPED })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED })
        .mockResolvedValueOnce({ orderId: 1, trackingNumber: '123456' });

      await service.updateStatus(1, OrderStatus.DELIVERED);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.DELIVERED });
      expect(mockManager.update).toHaveBeenCalledWith(
        Shipping,
        { orderId: 1 },
        expect.objectContaining({
          status: ShippingStatus.DELIVERED,
          deliveredAt: expect.any(Date),
        }),
      );
    });

    it('delivered → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED });
      await expect(service.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(BadRequestException);
    });

    it('cancelled → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED });
      await expect(service.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(BadRequestException);
    });

    it('refunded → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      await expect(service.updateStatus(1, OrderStatus.PAID)).rejects.toThrow(BadRequestException);
    });
    it('pending confirmation reconciliation → paid: replays confirmed payment sync instead of plain status mutation', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING, orderNumber: 'ORD-RECON' })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID });
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 1,
        status: PaymentStatus.CONFIRMED,
        rawResponse: {
          gatewayConfirmationSucceeded: true,
          reconciliationRequired: true,
        },
        order: { id: 1, status: OrderStatus.PENDING },
      });

      await service.updateStatus(1, OrderStatus.PAID);

      expect(paymentsService.reconcileConfirmedPayment).toHaveBeenCalledWith(1);
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PAID });
    });

    it('paid → refunded: should call paymentsService.cancelAdmin (PG cancel)', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 1 });
      paymentsService.cancelAdmin.mockImplementation(async (_orderId, _reason, postGatewaySync) => {
        if (postGatewaySync) {
          await postGatewaySync(mockManager as unknown as EntityManager, new Date(), async () => undefined);
        }
        return {
          paymentId: 10,
          status: PaymentStatus.REFUNDED,
          cancelledAt: new Date(),
          cancelReason: '관리자 환불 처리',
        };
      });
      mockManager.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.PAID,
          pointsUsed: 0,
          userId: null,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.PAID,
          pointsUsed: 0,
          userId: null,
        });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(
        1,
        '관리자 환불 처리',
        expect.any(Function),
      );
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.REFUNDED });
    });

    it('paid → cancelled: generic status update requires dedicated cancel flow with reason', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID });

      await expect(service.updateStatus(1, OrderStatus.CANCELLED)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.CANCELLED,
      });
    });

    it('delivered → completed: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.COMPLETED });

      await service.updateStatus(1, OrderStatus.COMPLETED);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.COMPLETED });
    });

    it('delivered → refund_requested: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUND_REQUESTED });

      await service.updateStatus(1, OrderStatus.REFUND_REQUESTED);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.REFUND_REQUESTED,
      });
    });

    it('refund_requested → refunded: should call paymentsService.cancelAdmin', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUND_REQUESTED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 1 });
      paymentsService.cancelAdmin.mockImplementation(async (_orderId, _reason, postGatewaySync) => {
        if (postGatewaySync) {
          await postGatewaySync(mockManager as unknown as EntityManager, new Date(), async () => undefined);
        }
        return {
          paymentId: 10,
          status: PaymentStatus.REFUNDED,
          cancelledAt: new Date(),
          cancelReason: '관리자 환불 처리',
        };
      });
      mockManager.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(
        1,
        '관리자 환불 처리',
        expect.any(Function),
      );
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.REFUNDED });
    });

    it('REFUNDED 전환 시 결제 환불 경로를 우선 사용한다', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          orderNumber: 'ORD-1',
        })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 99, orderId: 1 });
      paymentsService.cancelAdmin.mockImplementation(async (_orderId, _reason, postGatewaySync) => {
        if (postGatewaySync) {
          await postGatewaySync(mockManager as unknown as EntityManager, new Date(), async () => undefined);
        }
        return {
          paymentId: 99,
          status: PaymentStatus.REFUNDED,
          cancelledAt: new Date(),
          cancelReason: '관리자 환불 처리',
        };
      });
      mockManager.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        });

      await service.updateStatus(1, OrderStatus.REFUNDED);

      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(
        1,
        '관리자 환불 처리',
        expect.any(Function),
      );
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.REFUNDED });
      expect(mockManager.increment).not.toHaveBeenCalled();
    });
    it('refund reconciliation marker → refunded: applies local sync without a second PG refund', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          orderNumber: 'ORD-REFUND',
        })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({
        id: 99,
        orderId: 1,
        status: PaymentStatus.REFUNDED,
        rawResponse: {
          gatewayRefundSucceeded: true,
          reconciliationRequired: true,
        },
      });
      mockManager.findOne
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        })
        .mockResolvedValueOnce({
          id: 1,
          status: OrderStatus.REFUND_REQUESTED,
          pointsUsed: 0,
          userId: null,
        });

      await service.updateStatus(1, OrderStatus.REFUNDED);

      expect(paymentsService.cancelAdmin).not.toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.REFUNDED });
    });

    it('이미 CANCELLED 상태인 주문은 재고 복구가 두 번 실행되지 않는다 (멱등성)', async () => {
      // 상태 머신상 CANCELLED → 다른 상태 전이는 차단되므로 (terminal),
      // 같은 환불 처리가 두 번 호출되어도 재고가 추가로 복구되지 않는 것을 보장.
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED });
      await expect(service.updateStatus(1, OrderStatus.CANCELLED)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockManager.increment).not.toHaveBeenCalled();
    });

    it('completed → any: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.COMPLETED });
      await expect(service.updateStatus(1, OrderStatus.DELIVERED)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('delivered → refunded directly: not allowed (must go through refund_requested)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED });
      await expect(service.updateStatus(1, OrderStatus.REFUNDED)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelOrder', () => {
    it('requires a cancellation reason', async () => {
      await expect(service.cancelOrder(1, '   ')).rejects.toThrow(BadRequestException);
    });

    it('paid order: cancels confirmed payment in the same transaction and stores reason', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PAID,
        orderNumber: 'ORD-1',
        recipientName: '홍길동',
        pointsUsed: 0,
      };
      orderRepo.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: OrderStatus.CANCELLED, cancelReason: '품절' });
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 1,
        status: PaymentStatus.CONFIRMED,
        order,
      });
      mockManager.findOne.mockImplementation((entity: unknown) => {
        if (entity === Order) {
          return Promise.resolve(order);
        }
        if (entity === Payment) {
          return Promise.resolve({ id: 10, orderId: 1, status: PaymentStatus.CONFIRMED, order });
        }
        return Promise.resolve(null);
      });
      paymentsService.cancelPaidOrder = jest.fn().mockResolvedValue({
        paymentId: 10,
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: '품절',
      });

      await service.cancelOrder(1, ' 품절 ');

      expect(paymentsService.cancelPaidOrder).toHaveBeenCalledWith(1, '품절');
      expect(notificationService.sendOrderCancelled).toHaveBeenCalledWith(
        'customer@example.com',
        expect.objectContaining({
          orderNumber: 'ORD-1',
          reason: '품절',
        }),
      );
      expect(messageNotificationService.sendOrderCancelled).toHaveBeenCalledWith(1, '품절');
    });

    it('rejects partial-cancelled payments instead of cancelling the order', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PAID,
        orderNumber: 'ORD-PARTIAL',
        recipientName: '홍길동',
        pointsUsed: 0,
      };
      orderRepo.findOne.mockResolvedValueOnce(order);
      paymentRepo.findOne.mockResolvedValue({
        id: 30,
        orderId: 1,
        status: PaymentStatus.PARTIAL_CANCELLED,
      });

      await expect(service.cancelOrder(1, '부분 환불 후 취소')).rejects.toThrow(
        BadRequestException,
      );
      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, expect.anything());
    });

    it('rejects paid orders without confirmed payment state', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PAID,
        orderNumber: 'ORD-NOPAY',
        recipientName: '홍길동',
        pointsUsed: 0,
      };
      orderRepo.findOne.mockResolvedValueOnce(order);
      paymentRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelOrder(1, '결제 정보 없음')).rejects.toThrow(BadRequestException);
      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
    });
    it('rejects stale paid-order cancel when the locked order already shipped', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PAID,
        orderNumber: 'ORD-SHIPPED',
        recipientName: '홍길동',
        pointsUsed: 0,
      };
      orderRepo.findOne.mockResolvedValueOnce(order);
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 1,
        status: PaymentStatus.CONFIRMED,
        order,
      });
      mockManager.findOne.mockImplementation((entity: unknown) => {
        if (entity === Order) {
          return Promise.resolve({ ...order, status: OrderStatus.SHIPPED });
        }
        if (entity === Payment) {
          return Promise.resolve({
            id: 10,
            orderId: 1,
            status: PaymentStatus.CONFIRMED,
            order: { ...order, status: OrderStatus.SHIPPED },
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.cancelOrder(1, '배송 시작')).rejects.toThrow(BadRequestException);

      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, expect.anything());
    });
    it('paid order with gateway cancellation reconciliation marker finalizes locally without a second PG cancel', async () => {
      const cancelledAt = new Date('2026-07-27T11:30:00.000Z');
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PAID,
        orderNumber: 'ORD-RECON-CANCEL',
        recipientName: '홍길동',
        pointsUsed: 0,
      };
      orderRepo.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: OrderStatus.CANCELLED, cancelReason: '품절' });
      paymentRepo.findOne.mockResolvedValue({
        id: 10,
        orderId: 1,
        status: PaymentStatus.CANCELLED,
        cancelledAt,
        rawResponse: {
          gatewayCancellationSucceeded: true,
          reconciliationRequired: true,
        },
        order,
      });
      mockManager.findOne.mockImplementation((entity: unknown) => {
        if (entity === Order) {
          return Promise.resolve({ id: 1, status: OrderStatus.PAID, pointsUsed: 0, userId: 10 });
        }
        if (entity === Payment) {
          return Promise.resolve({
            id: 10,
            orderId: 1,
            status: PaymentStatus.CANCELLED,
            cancelledAt,
            rawResponse: {
              gatewayCancellationSucceeded: true,
              reconciliationRequired: true,
            },
            order,
          });
        }
        return Promise.resolve(null);
      });

      await service.cancelOrder(1, ' 품절 ');

      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(
        Order,
        1,
        expect.objectContaining({
          status: OrderStatus.CANCELLED,
          cancelReason: '품절',
          cancelledAt,
        }),
      );
    });

    it('pending order: cancels order and pending payment without gateway cancellation', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PENDING,
        orderNumber: 'ORD-2',
        recipientName: '김옥화',
        pointsUsed: 0,
      };
      orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.CANCELLED,
        cancelReason: '고객 요청',
      });
      paymentRepo.findOne.mockResolvedValue({ id: 20, orderId: 1, status: PaymentStatus.PENDING });
      mockManager.findOne.mockImplementation((entity: unknown) => {
        if (entity === Order) {
          return Promise.resolve(order);
        }
        if (entity === Payment) {
          return Promise.resolve({ id: 20, orderId: 1, status: PaymentStatus.PENDING });
        }
        return Promise.resolve(null);
      });
      paymentsService.cancelPaidOrder = jest.fn();
      mockManager.find.mockResolvedValue([
        { orderId: 1, productId: 10, productOptionId: 20, quantity: 3 },
        { orderId: 1, productId: 11, productOptionId: null, quantity: 2 },
      ]);

      await service.cancelOrder(1, '고객 요청');

      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(
        Order,
        1,
        expect.objectContaining({
          status: OrderStatus.CANCELLED,
          cancelReason: '고객 요청',
          cancelledAt: expect.any(Date),
        }),
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        Payment,
        20,
        expect.objectContaining({
          status: PaymentStatus.CANCELLED,
          cancelReason: '고객 요청',
          cancelledAt: expect.any(Date),
        }),
      );
      expect(mockManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 20 }, 'stock', 3);
      expect(mockManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 11 }, 'stock', 2);
      expect(mockManager.increment).toHaveBeenCalledTimes(2);
    });

    it('pending order cancel restores points through the shared first-terminal helper once', async () => {
      const order = {
        id: 1,
        userId: 10,
        user: { email: 'customer@example.com' },
        status: OrderStatus.PENDING,
        orderNumber: 'ORD-POINTS',
        recipientName: '김옥화',
        pointsUsed: 300,
      };
      orderRepo.findOne.mockResolvedValueOnce(order).mockResolvedValueOnce({
        ...order,
        status: OrderStatus.CANCELLED,
        cancelReason: '고객 요청',
      });
      paymentRepo.findOne.mockResolvedValue({ id: 20, orderId: 1, status: PaymentStatus.PENDING });
      mockManager.findOne.mockImplementation((entity: unknown) => {
        if (entity === Order) {
          return Promise.resolve(order);
        }
        if (entity === Payment) {
          return Promise.resolve({ id: 20, orderId: 1, status: PaymentStatus.PENDING });
        }
        return Promise.resolve(null);
      });
      mockManager.find.mockResolvedValue([]);

      await service.cancelOrder(1, '고객 요청');

      expect(pointsService.lockUserForPointChanges).toHaveBeenCalledWith(
        mockManager as unknown as EntityManager,
        10,
      );
      expect(pointsService.creditFifo).toHaveBeenCalledTimes(1);
      expect(pointsService.creditFifo).toHaveBeenCalledWith(
        mockManager as unknown as EntityManager,
        10,
        300,
        '주문 ORD-POINTS 취소/환불로 인한 적립금 복구',
        null,
        1,
        null,
        null,
        'admin_adjust',
      );
      expect(mockManager.findOne.mock.calls.map(([entity]) => entity)).toEqual([
        Order,
        Order,
        Payment,
      ]);
      expect(mockManager.findOne.mock.calls[0][1]).toEqual({ where: { id: 1 } });
      expect(mockManager.findOne.mock.calls[1][1]).toEqual({
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });
      const lockedOrderCall =
        mockManager.findOne.mock.invocationCallOrder[1];
      expect(pointsService.lockUserForPointChanges.mock.invocationCallOrder[0]).toBeLessThan(
        lockedOrderCall,
      );
    });
  });

  describe('registerShipping', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      mockManager.findOne.mockResolvedValue(null);
      await expect(
        service.registerShipping(999, { carrier: 'cj', trackingNumber: '123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if tracking already exists', async () => {
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED })
        .mockResolvedValueOnce({ id: 1, trackingNumber: '123' });

      await expect(
        service.registerShipping(1, { carrier: 'cj', trackingNumber: '456' }),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects unconfirmed payment before mutation or notification', async () => {
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.PENDING });

      await expect(
        service.registerShipping(1, { carrier: 'cj', trackingNumber: '456' }),
      ).rejects.toThrow('결제가 확정되지 않은 주문은 배송을 등록할 수 없습니다.');

      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, {
        status: OrderStatus.PREPARING,
      });
      expect(mockManager.save).not.toHaveBeenCalledWith(Shipping, expect.anything());
      expect(notificationService.sendShippingUpdate).not.toHaveBeenCalled();
      expect(messageNotificationService.sendShippingStarted).not.toHaveBeenCalled();
    });

    it('should create new shipping record', async () => {
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED })
        .mockResolvedValueOnce(null);
      mockManager.save.mockResolvedValue({
        id: 1,
        orderId: 1,
        carrier: 'cj',
        trackingNumber: '123',
        status: ShippingStatus.PREPARING,
      });

      await service.registerShipping(1, { carrier: 'cj', trackingNumber: '123' });
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PREPARING });
      expect(mockManager.save).toHaveBeenCalledWith(
        Shipping,
        expect.objectContaining({
          orderId: 1,
          carrier: 'cj',
          trackingNumber: '123',
          status: ShippingStatus.PREPARING,
        }),
      );
    });

    it('should update existing shipping record without tracking', async () => {
      mockManager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED })
        .mockResolvedValueOnce({ id: 5, trackingNumber: null });
      mockManager.save.mockResolvedValue({
        id: 5,
        orderId: 1,
        carrier: 'hanjin',
        trackingNumber: '789',
        status: ShippingStatus.PREPARING,
      });

      await service.registerShipping(1, { carrier: 'hanjin', trackingNumber: '789' });
      expect(mockManager.save).toHaveBeenCalledWith(
        Shipping,
        expect.objectContaining({
          id: 5,
          orderId: 1,
          carrier: 'hanjin',
          trackingNumber: '789',
          status: ShippingStatus.PREPARING,
        }),
      );
    });

    it.each([OrderStatus.CANCELLED, OrderStatus.REFUNDED])(
      'rejects %s orders before creating shipping',
      async (status) => {
        mockManager.findOne
          .mockResolvedValueOnce({ id: 1, status })
          .mockResolvedValueOnce({ id: 1, status: PaymentStatus.CONFIRMED });

        await expect(
          service.registerShipping(1, { carrier: 'cj', trackingNumber: '123' }),
        ).rejects.toThrow(BadRequestException);
        expect(mockManager.save).not.toHaveBeenCalledWith(Shipping, expect.anything());
      },
    );
  });
});
