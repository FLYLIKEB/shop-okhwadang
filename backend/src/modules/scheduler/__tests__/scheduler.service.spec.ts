import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SchedulerService } from '../scheduler.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductOption } from '../../products/entities/product-option.entity';
import { Coupon } from '../../coupons/entities/coupon.entity';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { User } from '../../users/entities/user.entity';
import { RecentlyViewedProduct } from '../../products/entities/recently-viewed-product.entity';
import { NotificationService } from '../../notification/notification.service';
import { SettingsService } from '../../settings/settings.service';

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
};

const mockSettingsService = {
  getMap: jest.fn(),
};

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockDataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

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
      ],
    }).compile();

    service = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('handlePendingOrderCancellation', () => {
    it('should skip when another instance holds lock', async () => {
      mockDataSource.query.mockResolvedValue([{ instance_id: 'other-instance' }]);

      await service.handlePendingOrderCancellation();

      expect(mockOrderRepo.find).not.toHaveBeenCalled();
    });

    it('should cancel pending orders older than configured interval', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ instance_id: 'default' }]);
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
      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should do nothing when no pending orders found', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ instance_id: 'default' }]);
      mockSettingsService.getMap.mockResolvedValue({ scheduler_pending_cancel_hours: '24' });
      mockOrderRepo.find.mockResolvedValue([]);

      await service.handlePendingOrderCancellation();

      expect(mockOrderRepo.find).toHaveBeenCalled();
    });
  });

  describe('handleDeliveredOrderAutoConfirm', () => {
    it('should skip when another instance holds lock', async () => {
      mockDataSource.query.mockResolvedValue([{ instance_id: 'other-instance' }]);

      await service.handleDeliveredOrderAutoConfirm();

      expect(mockOrderRepo.find).not.toHaveBeenCalled();
    });

    it('should confirm delivered orders older than configured interval', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ instance_id: 'default' }]);
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
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ instance_id: 'default' }]);
      mockSettingsService.getMap.mockResolvedValue({ scheduler_delivered_confirm_days: '7' });
      mockOrderRepo.find.mockResolvedValue([]);

      await service.handleDeliveredOrderAutoConfirm();

      expect(mockOrderRepo.find).toHaveBeenCalled();
    });
  });

  describe('handleCouponExpiry', () => {
    it('should skip when another instance holds lock', async () => {
      mockDataSource.query.mockResolvedValue([{ instance_id: 'other-instance' }]);

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
      mockDataSource.query.mockResolvedValue([{ instance_id: 'other-instance' }]);

      await service.handlePointExpiry();

      expect(mockPointHistoryRepo.find).not.toHaveBeenCalled();
    });

    it('should process expired points', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])                            // INSERT lock
        .mockResolvedValueOnce([{ instance_id: 'default' }]) // SELECT lock
        .mockResolvedValueOnce([                             // SELECT expired points raw query
          { id: 1, user_id: 1, amount: 1000, expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        ]);

      mockQueryRunner.manager.findOne.mockResolvedValue({ balance: 5000 });
      mockQueryRunner.manager.save.mockResolvedValue({});
      mockQueryRunner.manager.findOne
        .mockResolvedValueOnce({ balance: 5000 })   // latest balance
        .mockResolvedValueOnce({ id: 1, email: 'test@example.com' }); // user

      await service.handlePointExpiry();

      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should do nothing when no expired points found', async () => {
      mockDataSource.query
        .mockResolvedValueOnce([])                            // INSERT lock
        .mockResolvedValueOnce([{ instance_id: 'default' }]) // SELECT lock
        .mockResolvedValueOnce([]);                          // SELECT expired points — empty

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