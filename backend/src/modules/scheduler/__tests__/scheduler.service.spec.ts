import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SchedulerService } from '../scheduler.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { RecentlyViewedProduct } from '../../products/entities/recently-viewed-product.entity';
import { NotificationService } from '../../notification/notification.service';
import { SettingsService } from '../../settings/settings.service';
import { MembershipService } from '../../membership/membership.service';
import { SchedulerLockService } from '../../../common/services/scheduler-lock.service';
import { PointsService } from '../../points/points.service';

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    increment: jest.fn(),
    getRepository: jest.fn(),
  },
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  query: jest.fn(),
};

const mockOrderRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockOrderItemRepo = {
  find: jest.fn(),
};

const mockProductRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockProductOptionRepo = {
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockCouponRepo = {
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPointHistoryRepo = {
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
};

const mockUserRepo = {
  findOne: jest.fn(),
};

const mockRecentlyViewedRepo = {
  createQueryBuilder: jest.fn(),
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendOrderConfirmed: jest.fn(),
  sendOrderCancelled: jest.fn(),
};

const mockSettingsService = {
  getMap: jest.fn(),
};

const mockSchedulerLockService = {
  runWithLock: jest.fn(),
};

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockDataSource.query.mockReset();
    mockDataSource.createQueryRunner.mockReset();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);
    mockQueryRunner.connect.mockReset();
    mockQueryRunner.startTransaction.mockReset();
    mockQueryRunner.commitTransaction.mockReset();
    mockQueryRunner.rollbackTransaction.mockReset();
    mockQueryRunner.release.mockReset();
    mockQueryRunner.manager.createQueryBuilder.mockReset();
    mockQueryRunner.manager.create.mockReset();
    mockQueryRunner.manager.save.mockReset();
    mockQueryRunner.manager.update.mockReset();
    mockQueryRunner.manager.findOne.mockReset();
    mockQueryRunner.manager.find.mockReset();
    mockQueryRunner.manager.increment.mockReset();
    mockQueryRunner.manager.getRepository.mockReset();
    mockSchedulerLockService.runWithLock.mockReset();
    mockSchedulerLockService.runWithLock.mockImplementation(
      async (
        _policy: { lockName: string; ttlMinutes: number },
        task: () => Promise<void>,
      ) => task(),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(Product), useValue: mockProductRepo },
        { provide: getRepositoryToken(ProductOption), useValue: mockProductOptionRepo },
        { provide: getRepositoryToken(Coupon), useValue: mockCouponRepo },
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RecentlyViewedProduct), useValue: mockRecentlyViewedRepo },
        { provide: DataSource, useValue: mockDataSource },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: MembershipService, useValue: { incrementAccumulatedAmount: jest.fn().mockResolvedValue(undefined), evaluateAllUserTiers: jest.fn().mockResolvedValue(undefined) } },
        { provide: PointsService, useValue: { getRunningBalanceInTx: jest.fn().mockResolvedValue(0) } },
        { provide: SchedulerLockService, useValue: mockSchedulerLockService },
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handlePendingOrderCancellation', () => {
    it('should skip when another instance holds lock', async () => {
      mockSchedulerLockService.runWithLock.mockResolvedValueOnce(undefined);

      await service.handlePendingOrderCancellation();

      expect(mockOrderRepo.find).not.toHaveBeenCalled();
    });

    it('should cancel pending orders older than configured interval', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });

      const oldPendingOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-ABC123',
        userId: 1,
        status: OrderStatus.PENDING,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        items: [
          { id: 1, productId: 1, productOptionId: null, quantity: 2 },
        ],
      };

      mockOrderRepo.find.mockResolvedValue([oldPendingOrder]);
      mockUserRepo.findOne.mockResolvedValue({ id: 1, email: 'test@example.com' });
      mockQueryRunner.manager.findOne.mockResolvedValue(null);

      await service.handlePendingOrderCancellation();

      expect(mockOrderRepo.find).toHaveBeenCalled();
      expect(mockSchedulerLockService.runWithLock).toHaveBeenCalledWith(
        { lockName: 'cron:pending-order-cancel', ttlMinutes: 55 },
        expect.any(Function),
      );
    });

    it('should do nothing when no pending orders found', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([]);

      await service.handlePendingOrderCancellation();

      expect(mockOrderRepo.find).toHaveBeenCalled();
    });

    it('skips a persisted CONFIRMING payment while its provider call is paused, allowing confirmation to win', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([{ id: 1, orderNumber: 'ORD-STALE', status: OrderStatus.PENDING }]);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING })
        .mockResolvedValueOnce({ id: 10, orderId: 1, status: 'confirming' });

      await service.handlePendingOrderCancellation();

      expect(mockQueryRunner.manager.update).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.increment).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();

      // The provider call completes after cron has observed CONFIRMING. No scheduler
      // recovery ran, so the confirmation can persist its terminal state without restoring stock.
      mockQueryRunner.manager.findOne.mockReset();
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PAID })
        .mockResolvedValueOnce({ id: 10, orderId: 1, status: 'confirmed' });
      mockOrderRepo.find.mockResolvedValue([{ id: 1, orderNumber: 'ORD-STALE', status: OrderStatus.PENDING }]);

      await service.handlePendingOrderCancellation();

      expect(mockQueryRunner.manager.increment).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('recovers stock and deducted points exactly once for the winning cancellation', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([{
        id: 1,
        orderNumber: 'ORD-RECOVER',
        status: OrderStatus.PENDING,
        userId: 9,
        pointsUsed: 500,
      }]);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING })
        .mockResolvedValueOnce({ id: 10, orderId: 1, status: 'pending' })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING, userId: 9, pointsUsed: 500 });
      mockQueryRunner.manager.find.mockResolvedValue([{ productId: 5, productOptionId: null, quantity: 2 }]);

      await service.handlePendingOrderCancellation();

      expect(mockQueryRunner.manager.increment).toHaveBeenCalledWith(Product, { id: 5 }, 'stock', 2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(PointHistory, expect.objectContaining({
        userId: 9,
        amount: 500,
        orderId: 1,
      }));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.findOne.mock.calls.slice(0, 2).map(([entity]) => entity))
        .toEqual([Order, Payment]);
    });

    it('does not recover an already terminal order on retry', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([{ id: 1, orderNumber: 'ORD-RETRY', status: OrderStatus.PENDING }]);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.CANCELLED })
        .mockResolvedValueOnce({ id: 10, orderId: 1, status: 'cancelled' });

      await service.handlePendingOrderCancellation();

      expect(mockQueryRunner.manager.increment).not.toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('cancels and recovers an expired pending order with no payment record', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([{ id: 1, orderNumber: 'ORD-NO-PAYMENT', status: OrderStatus.PENDING }]);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING, userId: null, pointsUsed: 0 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING, userId: null, pointsUsed: 0 });
      mockQueryRunner.manager.find.mockResolvedValue([{ productId: 5, productOptionId: null, quantity: 2 }]);

      await service.handlePendingOrderCancellation();

      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Order,
        1,
        { status: OrderStatus.CANCELLED },
      );
      expect(mockQueryRunner.manager.update).not.toHaveBeenCalledWith(
        Payment,
        expect.anything(),
        expect.anything(),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('rolls back the terminal transition when recovery fails', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([{ id: 1, orderNumber: 'ORD-ROLLBACK', status: OrderStatus.PENDING }]);
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING })
        .mockResolvedValueOnce({ id: 10, orderId: 1, status: 'pending' })
        .mockResolvedValueOnce({ id: 1, status: OrderStatus.PENDING, userId: null, pointsUsed: 0 });
      mockQueryRunner.manager.find.mockRejectedValueOnce(new Error('stock recovery failed'));

      await expect(service.handlePendingOrderCancellation()).rejects.toThrow('stock recovery failed');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('handleDeliveredOrderAutoConfirm', () => {
    it('should skip when another instance holds lock', async () => {
      mockSchedulerLockService.runWithLock.mockResolvedValueOnce(undefined);

      await service.handleDeliveredOrderAutoConfirm();

      expect(mockOrderRepo.find).not.toHaveBeenCalled();
    });

    it('should confirm delivered orders older than configured interval', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_delivered_confirm_days: '7' });

      const oldDeliveredOrder = {
        id: 1,
        orderNumber: 'ORD-20240101-ABC123',
        userId: 1,
        status: OrderStatus.DELIVERED,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        totalAmount: 50000,
        recipientName: '홍길동',
        user: { id: 1, email: 'test@example.com' },
        items: [{ productName: '테스트상품', quantity: 1, price: 50000 }],
      };

      mockOrderRepo.find.mockResolvedValue([oldDeliveredOrder]);
      mockOrderRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleDeliveredOrderAutoConfirm();

      expect(mockOrderRepo.find).toHaveBeenCalled();
      expect(mockOrderRepo.update).toHaveBeenCalledWith(1, { status: OrderStatus.COMPLETED });
    });

    it('should do nothing when no delivered orders found', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_delivered_confirm_days: '7' });
      mockOrderRepo.find.mockResolvedValue([]);

      await service.handleDeliveredOrderAutoConfirm();

      expect(mockOrderRepo.find).toHaveBeenCalled();
    });
  });

  describe('handleCouponExpiry', () => {
    it('should skip when another instance holds lock', async () => {
      mockSchedulerLockService.runWithLock.mockResolvedValueOnce(undefined);

      await service.handleCouponExpiry();

      expect(mockCouponRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should deactivate expired coupons', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ instance_id: 'default' }]);

      const mockQueryBuilder = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      mockCouponRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.handleCouponExpiry();

      expect(mockCouponRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('handlePointExpiry', () => {
    it('should skip when another instance holds lock', async () => {
      mockSchedulerLockService.runWithLock.mockResolvedValueOnce(undefined);

      await service.handlePointExpiry();

      expect(mockPointHistoryRepo.find).not.toHaveBeenCalled();
    });

    it('should process expired points', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([                             // SELECT expired points raw query
          { id: 1, user_id: 1, amount: 1000, expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        ]);

      mockQueryRunner.manager.save.mockResolvedValue({});
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ balance: 5000 })   // latest balance
        .mockResolvedValueOnce({ id: 1, email: 'test@example.com' }); // user

      await service.handlePointExpiry();

      expect(mockDataSource.query).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(PointHistory, expect.objectContaining({
        userId: 1,
        type: 'expire',
        amount: -1000,
        balance: 4000,
        relatedEntityType: null,
        relatedEntityId: 1,
      }));
    });

    it('should not expire the same earn row again on a later day', async () => {
      const earnRow = {
        id: 99,
        user_id: 1,
        amount: 1000,
        expires_at: new Date('2026-01-01T00:00:00.000Z'),
      };
      const expireMarkers: Array<{ type?: string; relatedEntityType?: string | null; relatedEntityId?: number | null }> = [];

      mockDataSource.query.mockImplementation(async (query: string) => {
        expect(query).toContain('ex.related_entity_id = ph.id');
        expect(query).not.toContain('DATE(ex.created_at)');

        return expireMarkers.some((marker) => (
          marker.type === 'expire'
          && marker.relatedEntityType === null
          && marker.relatedEntityId === earnRow.id
        ))
          ? []
          : [earnRow];
      });
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ balance: 1000 })
        .mockResolvedValueOnce(null);
      mockQueryRunner.manager.save.mockImplementation(async (_entity, entry) => {
        expireMarkers.push(entry);
        return entry;
      });

      jest.setSystemTime(new Date('2026-01-02T02:00:00.000Z'));
      await service.handlePointExpiry();

      jest.setSystemTime(new Date('2026-01-03T02:00:00.000Z'));
      await service.handlePointExpiry();

      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(PointHistory, expect.objectContaining({
        type: 'expire',
        amount: -1000,
        relatedEntityType: null,
        relatedEntityId: earnRow.id,
      }));
    });

    it('should do nothing when no expired points found', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([]); // SELECT expired points — empty

      await service.handlePointExpiry();

      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });

  describe('getSettingNumber', () => {
    it('should return setting value when exists', async () => {
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '48' });

      const result = await service['getSettingNumber']('scheduler_pending_cancel_hours', 24);

      expect(result).toBe(48);
    });

    it('should return default value when setting not found', async () => {
      mockSettingsService.getMap.mockResolvedValue({});

      const result = await service['getSettingNumber']('nonexistent_key', 24);

      expect(result).toBe(24);
    });

    it('should return default value when settings service throws', async () => {
      mockSettingsService.getMap.mockRejectedValue(new Error('DB error'));

      const result = await service['getSettingNumber']('scheduler_pending_cancel_hours', 24);

      expect(result).toBe(24);
    });
  });
});
