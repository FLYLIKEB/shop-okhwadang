import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from '../admin.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminService],
    }).compile();

    service = module.get(AdminService);
  });

  describe('getDashboardStats', () => {
    it('기본 stats 객체 반환 (모든 카운터 0)', () => {
      const result = service.getDashboardStats();

      expect(result).toEqual({
        totalOrders: 0,
        totalUsers: 0,
        totalProducts: 0,
        totalRevenue: 0,
      });
    });

    it('스키마 키가 모두 number 타입이다', () => {
      const result = service.getDashboardStats();

      expect(typeof result.totalOrders).toBe('number');
      expect(typeof result.totalUsers).toBe('number');
      expect(typeof result.totalProducts).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
    });
  });
});
