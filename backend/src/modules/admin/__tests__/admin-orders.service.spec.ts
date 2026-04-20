import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AdminOrdersService } from '../admin-orders.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { Payment, PaymentStatus } from '../../payments/entities/payment.entity';
import { Shipping } from '../../payments/entities/shipping.entity';
import { PaymentsService } from '../../payments/payments.service';
import { MembershipService } from '../../membership/membership.service';

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

describe('AdminOrdersService', () => {
  let service: AdminOrdersService;
  let orderRepo: ReturnType<typeof createMockRepository>;
  let paymentRepo: ReturnType<typeof createMockRepository>;
  let shippingRepo: ReturnType<typeof createMockRepository>;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    orderRepo = createMockRepository();
    paymentRepo = createMockRepository();
    shippingRepo = createMockRepository();
    paymentsService = {
      cancelAdmin: jest.fn(),
    } as unknown as jest.Mocked<PaymentsService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminOrdersService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: getRepositoryToken(Shipping), useValue: shippingRepo },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: MembershipService, useValue: { incrementAccumulatedAmount: jest.fn().mockResolvedValue(undefined) } },
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
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.PAID);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.PAID });
    });

    it('paid → preparing: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING });
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.PREPARING);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.PREPARING });
    });

    it('preparing → shipped: requires tracking number', async () => {
      orderRepo.findOne.mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING });
      shippingRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(1, OrderStatus.SHIPPED))
        .rejects.toThrow(BadRequestException);
    });

    it('preparing → shipped: allowed with tracking number', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PREPARING })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.SHIPPED });
      shippingRepo.findOne.mockResolvedValue({ trackingNumber: '123456' });
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.SHIPPED);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.SHIPPED });
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
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(1, '관리자 환불 처리');
    });

    it('paid → cancelled: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED });
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.CANCELLED);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.CANCELLED });
    });

    it('delivered → completed: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.COMPLETED });
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.COMPLETED);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.COMPLETED });
    });

    it('delivered → refund_requested: allowed', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.DELIVERED })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.REFUND_REQUESTED });
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.REFUND_REQUESTED);
      expect(orderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.REFUND_REQUESTED });
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
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateStatus(1, OrderStatus.REFUNDED);
      expect(paymentsService.cancelAdmin).toHaveBeenCalledWith(1, '관리자 환불 처리');
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
