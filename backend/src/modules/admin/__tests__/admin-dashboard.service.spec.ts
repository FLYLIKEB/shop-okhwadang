import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AdminDashboardService } from '../admin-dashboard.service';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

function createMockQueryBuilder(overrides: Record<string, unknown> = {}) {
  const qb: Record<string, jest.Mock> = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue({ revenue: '0', count: '0', total: '0' }),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  Object.assign(qb, overrides);
  return qb;
}

function createMockRepository() {
  return {
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
  };
}

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let orderRepo: ReturnType<typeof createMockRepository>;
  let userRepo: ReturnType<typeof createMockRepository>;
  let productRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    orderRepo = createMockRepository();
    userRepo = createMockRepository();
    productRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: getRepositoryToken(Order), useValue: orderRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Product), useValue: productRepo },
      ],
    }).compile();

    service = module.get<AdminDashboardService>(AdminDashboardService);
  });

  describe('getDashboard', () => {
    it('should return dashboard data with default period', async () => {
      const result = await service.getDashboard({});

      expect(result).toHaveProperty('kpi');
      expect(result).toHaveProperty('revenue_chart');
      expect(result).toHaveProperty('order_status_summary');
      expect(result).toHaveProperty('recent_orders');
    });

    it('should return KPI with correct structure', async () => {
      const result = await service.getDashboard({});

      expect(result.kpi).toEqual({
        today_revenue: 0,
        today_revenue_diff_pct: 0,
        today_orders: 0,
        today_orders_diff_pct: 0,
        new_members_today: 0,
        new_members_diff_pct: 0,
        total_product_views: 0,
      });
    });

    it('should calculate revenue from orders excluding cancelled/refunded', async () => {
      // createQueryBuilder is called multiple times: todayAgg, yesterdayAgg, revenueChart rows, orderStatusSummary
      orderRepo.createQueryBuilder
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '80000', count: '2' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '0', count: '0' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }))
        .mockReturnValue(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }));

      const result = await service.getDashboard({ period: 'today' });

      expect(result.kpi.today_revenue).toBe(80000);
      expect(result.kpi.today_orders).toBe(2);
    });

    it('should calculate diff percentage correctly', async () => {
      orderRepo.createQueryBuilder
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '100000', count: '1' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '80000', count: '1' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }))
        .mockReturnValue(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }));

      const result = await service.getDashboard({ period: 'today' });

      expect(result.kpi.today_revenue_diff_pct).toBe(25);
      expect(result.kpi.today_orders_diff_pct).toBe(0);
    });

    it('should return 100% diff when previous is 0 and current > 0', async () => {
      orderRepo.createQueryBuilder
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '50000', count: '1' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ revenue: '0', count: '0' }) }))
        .mockReturnValueOnce(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }))
        .mockReturnValue(createMockQueryBuilder({ getRawMany: jest.fn().mockResolvedValue([]) }));

      const result = await service.getDashboard({ period: 'today' });

      expect(result.kpi.today_revenue_diff_pct).toBe(100);
    });

    it('should aggregate order status summary', async () => {
      orderRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({
          getRawOne: jest.fn().mockResolvedValue({ revenue: '0', count: '0' }),
          getRawMany: jest.fn().mockResolvedValue([
            { status: 'pending', count: '5' },
            { status: 'paid', count: '12' },
            { status: 'delivered', count: '150' },
          ]),
        }),
      );

      const result = await service.getDashboard({});

      expect(result.order_status_summary.pending).toBe(5);
      expect(result.order_status_summary.paid).toBe(12);
      expect(result.order_status_summary.delivered).toBe(150);
      expect(result.order_status_summary.shipped).toBe(0);
    });

    it('should return recent 5 orders', async () => {
      const mockOrders = [
        {
          orderNumber: 'ORD-001',
          user: { name: '홍길동' },
          totalAmount: '58000',
          status: OrderStatus.PAID,
          createdAt: new Date('2026-03-23T10:00:00Z'),
        },
      ];

      // getRecentOrders still uses find(); KPI/chart now use createQueryBuilder
      orderRepo.find.mockResolvedValue(mockOrders);

      const result = await service.getDashboard({});

      expect(result.recent_orders).toHaveLength(1);
      expect(result.recent_orders[0].order_number).toBe('ORD-001');
      expect(result.recent_orders[0].user_name).toBe('홍길동');
      expect(result.recent_orders[0].total_amount).toBe(58000);
      expect(result.recent_orders[0].status).toBe('paid');
    });

    it('should handle custom date range', async () => {
      const result = await service.getDashboard({
        startDate: '2026-03-01',
        endDate: '2026-03-15',
      });

      expect(result.revenue_chart.length).toBeGreaterThanOrEqual(15);
    });

    it('should throw BadRequestException for range > 365 days', async () => {
      await expect(
        service.getDashboard({
          startDate: '2025-01-01',
          endDate: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when startDate > endDate', async () => {
      await expect(
        service.getDashboard({
          startDate: '2026-03-15',
          endDate: '2026-03-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle period=7d', async () => {
      const result = await service.getDashboard({ period: '7d' });

      expect(result.revenue_chart.length).toBeGreaterThanOrEqual(7);
    });

    it('should handle period=90d', async () => {
      const result = await service.getDashboard({ period: '90d' });

      expect(result.revenue_chart.length).toBeGreaterThanOrEqual(90);
    });

    it('should sum product view counts for total_product_views', async () => {
      productRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ total: '4520' }) }),
      );

      const result = await service.getDashboard({});

      expect(result.kpi.total_product_views).toBe(4520);
    });

    it('should handle null view count total', async () => {
      productRepo.createQueryBuilder.mockReturnValue(
        createMockQueryBuilder({ getRawOne: jest.fn().mockResolvedValue({ total: null }) }),
      );

      const result = await service.getDashboard({});

      expect(result.kpi.total_product_views).toBe(0);
    });

    it('should show user name as 알 수 없음 when user is null', async () => {
      orderRepo.find.mockResolvedValue([
        {
          orderNumber: 'ORD-002',
          user: null,
          totalAmount: '10000',
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getDashboard({});

      expect(result.recent_orders[0].user_name).toBe('알 수 없음');
    });
  });
});
