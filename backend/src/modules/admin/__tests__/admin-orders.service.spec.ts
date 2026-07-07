import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
      transaction: jest.fn(async (cb: (manager: typeof transactionManager) => Promise<void>) => cb(transactionManager)),
    },
  };
}

function createMockManager() {
  return {
    update: jest.fn().mockResolvedValue({}),
    find: jest.fn().mockResolvedValue([]),
    increment: jest.fn().mockResolvedValue({}),
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
    } as unknown as jest.Mocked<PaymentsService>;
    pointsService = {
      getRunningBalanceInTx: jest.fn().mockResolvedValue(0),
    } as unknown as jest.Mocked<PointsService>;
    notificationService = {
      sendOrderCancelled: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;
    messageNotificationService = {
      sendOrderCancelled: jest.fn().mockResolvedValue(undefined),
      sendShippingStarted: jest.fn().mockResolvedValue(undefined),
      sendShippingDelivered: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MessageNotificationService>;
    dataSource = {
      transaction: jest.fn().mockImplementation((cb: (manager: unknown) => Promise<unknown>) => cb(mockManager)),
    } as unknown as jest.Mocked<DataSource>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Shipping), useValue: shippingRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: DataSource, useValue: dataSource },
        { provide: MembershipService, useValue: { incrementAccumulatedAmount: jest.fn().mockResolvedValue(undefined) } },
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
      await expect(service.updateStatus(999, OrderStatus.PAID))
        .rejects.toThrow(NotFoundException);
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

      await service.updateStatus(1, OrderStatus.PREPARING);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.PREPARING });
    });

    it('preparing → shipped: requires tracking number', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING });
      shippingRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(1, OrderStatus.SHIPPED))
        .rejects.toThrow(BadRequestException);
    });

    it('preparing → shipped: allowed with tracking number and marks shipping as shipped', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.SHIPPED });
      shippingRepo.findOne.mockResolvedValue({ orderId: 1, status: ShippingStatus.PREPARING, trackingNumber: '123456' });

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

      await service.updateStatus(1, OrderStatus.DELIVERED);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.DELIVERED });
      expect(mockManager.update).toHaveBeenCalledWith(
        Shipping,
        { orderId: 1 },
        expect.objectContaining({ status: ShippingStatus.DELIVERED, deliveredAt: expect.any(Date) }),
      );
    });

    it('delivered → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED });
      await expect(service.updateStatus(1, OrderStatus.PAID))
        .rejects.toThrow(BadRequestException);
    });

    it('cancelled → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED });
      await expect(service.updateStatus(1, OrderStatus.PAID))
        .rejects.toThrow(BadRequestException);
    });

    it('refunded → paid: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      await expect(service.updateStatus(1, OrderStatus.PAID))
        .rejects.toThrow(BadRequestException);
    });

    it('paid → refunded: should call paymentsService.cancelAdmin (PG cancel)', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 1 });
      paymentsService.cancelAdmin.mockResolvedValue({
        paymentId: 10,
        status: PaymentStatus.REFUNDED,
        cancelledAt: new Date(),
        cancelReason: '관리자 환불 처리',
      });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(1, '관리자 환불 처리');
    });

    it('paid → cancelled: generic status update requires dedicated cancel flow with reason', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID });

      await expect(service.updateStatus(1, OrderStatus.CANCELLED))
        .rejects.toThrow(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalledWith(Order, 1, { status: OrderStatus.CANCELLED });
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
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, { status: OrderStatus.REFUND_REQUESTED });
    });

    it('refund_requested → refunded: should call paymentsService.cancelAdmin', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUND_REQUESTED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 1 });
      paymentsService.cancelAdmin.mockResolvedValue({
        paymentId: 10,
        status: PaymentStatus.REFUNDED,
        cancelledAt: new Date(),
        cancelReason: '관리자 환불 처리',
      });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(1, '관리자 환불 처리');
    });

    it('REFUNDED 전환 시 옵션 항목은 옵션 재고만 복구', async () => {
      const items = [
        { orderId: 1, productId: 5, productOptionId: 50, quantity: 1 },
      ];
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUND_REQUESTED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUNDED });
      paymentRepo.findOne.mockResolvedValue({ id: 99, orderId: 1 });
      paymentsService.cancelAdmin.mockResolvedValue({
        paymentId: 99,
        status: PaymentStatus.REFUNDED,
        cancelledAt: new Date(),
        cancelReason: '관리자 환불 처리',
      });
      mockManager.find.mockResolvedValue(items);

      await service.updateStatus(1, OrderStatus.REFUNDED);

      expect(mockManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 50 }, 'stock', 1);
      expect(mockManager.increment).toHaveBeenCalledTimes(1);
    });

    it('이미 CANCELLED 상태인 주문은 재고 복구가 두 번 실행되지 않는다 (멱등성)', async () => {
      // 상태 머신상 CANCELLED → 다른 상태 전이는 차단되므로 (terminal),
      // 같은 환불 처리가 두 번 호출되어도 재고가 추가로 복구되지 않는 것을 보장.
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED });
      await expect(service.updateStatus(1, OrderStatus.CANCELLED))
        .rejects.toThrow(BadRequestException);
      expect(mockManager.increment).not.toHaveBeenCalled();
    });

    it('completed → any: not allowed (terminal state)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.COMPLETED });
      await expect(service.updateStatus(1, OrderStatus.DELIVERED))
        .rejects.toThrow(BadRequestException);
    });

    it('delivered → refunded directly: not allowed (must go through refund_requested)', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED });
      await expect(service.updateStatus(1, OrderStatus.REFUNDED))
        .rejects.toThrow(BadRequestException);
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
      paymentRepo.findOne.mockResolvedValue({ id: 10, orderId: 1, status: PaymentStatus.CONFIRMED, order });
      paymentsService.cancelPaidOrder = jest.fn().mockResolvedValue({
        paymentId: 10,
        status: PaymentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: '품절',
      });

      await service.cancelOrder(1, ' 품절 ');

      expect(paymentsService.cancelPaidOrder).toHaveBeenCalledWith(1, '품절', mockManager);
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, expect.objectContaining({
        cancelReason: '품절',
        cancelledAt: expect.any(Date),
      }));
      expect(notificationService.sendOrderCancelled).toHaveBeenCalledWith('customer@example.com', expect.objectContaining({
        orderNumber: 'ORD-1',
        reason: '품절',
      }));
      expect(messageNotificationService.sendOrderCancelled).toHaveBeenCalledWith(1, '품절');
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
      orderRepo.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce({ ...order, status: OrderStatus.CANCELLED, cancelReason: '고객 요청' });
      paymentRepo.findOne.mockResolvedValue({ id: 20, orderId: 1, status: PaymentStatus.PENDING });
      paymentsService.cancelPaidOrder = jest.fn();
      mockManager.find.mockResolvedValue([
        { orderId: 1, productId: 10, productOptionId: 20, quantity: 3 },
        { orderId: 1, productId: 11, productOptionId: null, quantity: 2 },
      ]);

      await service.cancelOrder(1, '고객 요청');

      expect(paymentsService.cancelPaidOrder).not.toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(Order, 1, expect.objectContaining({
        status: OrderStatus.CANCELLED,
        cancelReason: '고객 요청',
        cancelledAt: expect.any(Date),
      }));
      expect(mockManager.update).toHaveBeenCalledWith(Payment, 20, expect.objectContaining({
        status: PaymentStatus.CANCELLED,
        cancelReason: '고객 요청',
        cancelledAt: expect.any(Date),
      }));
      expect(mockManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 20 }, 'stock', 3);
      expect(mockManager.increment).toHaveBeenCalledWith(expect.anything(), { id: 11 }, 'stock', 2);
      expect(mockManager.increment).toHaveBeenCalledTimes(2);
    });
  });

  describe('registerShipping', () => {
    it('should throw NotFoundException for non-existent order', async () => {
      orderRepo.findOne.mockResolvedValue(null);
      await expect(service.registerShipping(999, { carrier: 'cj', trackingNumber: '123' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if tracking already exists', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 1 });
      shippingRepo.findOne.mockResolvedValue({ id: 1, trackingNumber: '123' });

      await expect(service.registerShipping(1, { carrier: 'cj', trackingNumber: '456' }))
        .rejects.toThrow(ConflictException);
    });

    it('should create new shipping record', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 1 });
      shippingRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, carrier: 'cj', trackingNumber: '123' });
      shippingRepo.create.mockReturnValue({ orderId: 1, carrier: 'cj', trackingNumber: '123' });
      shippingRepo.save.mockResolvedValue({ id: 1 });

      await service.registerShipping(1, { carrier: 'cj', trackingNumber: '123' });
      expect(shippingRepo.create).toHaveBeenCalled();
      expect(shippingRepo.save).toHaveBeenCalled();
    });

    it('should update existing shipping record without tracking', async () => {
      orderRepo.findOne.mockResolvedValue({ id: 1 });
      shippingRepo.findOne
        .mockResolvedValueOnce({ id: 5, trackingNumber: null })
        .mockResolvedValueOnce({ id: 5, carrier: 'hanjin', trackingNumber: '789' });
      shippingRepo.update.mockResolvedValue({ affected: 1 });

      await service.registerShipping(1, { carrier: 'hanjin', trackingNumber: '789' });
      expect(shippingRepo.update).toHaveBeenCalledWith(5, expect.objectContaining({
        carrier: 'hanjin',
        trackingNumber: '789',
      }));
    });
  });
});
