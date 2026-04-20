import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecentlyViewedService } from '../recently-viewed.service';
import { RecentlyViewedProduct } from '../entities/recently-viewed-product.entity';

const mockQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  into: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  orUpdate: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
};

const mockRepo = {
  createQueryBuilder: jest.fn(() => mockQueryBuilder),
  findAndCount: jest.fn(),
};

describe('RecentlyViewedService', () => {
  let service: RecentlyViewedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecentlyViewedService,
        { provide: getRepositoryToken(RecentlyViewedProduct), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RecentlyViewedService>(RecentlyViewedService);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.into.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.values.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.orUpdate.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.delete.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.from.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });
  });

  describe('upsert', () => {
    it('should upsert a recently viewed record', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });

      await expect(service.upsert(10, 5)).resolves.toBeUndefined();

      expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockQueryBuilder.orUpdate).toHaveBeenCalledWith(['viewed_at'], ['user_id', 'product_id']);
    });
  });

  describe('findAll', () => {
    it('should return recently viewed items with total', async () => {
      const mockItem = {
        userId: 10,
        productId: 5,
        viewedAt: new Date(),
        product: {
          id: 5,
          name: '테스트 상품',
          slug: 'test-product',
          price: 10000,
          salePrice: null,
          status: 'active',
          images: [],
        },
      } as unknown as RecentlyViewedProduct;

      mockRepo.findAndCount.mockResolvedValue([[mockItem], 1]);

      const result = await service.findAll(10, 20);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productId).toBe(5);
      expect(result.data[0].product?.name).toBe('테스트 상품');
    });

    it('should cap limit at 100', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(10, 200);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should use default limit of 20 when not specified', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll(10);

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete records older than specified days and return count', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 });

      const deleted = await service.deleteOlderThan(90);

      expect(deleted).toBe(5);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('viewed_at < :cutoff', expect.any(Object));
    });

    it('should return 0 when no records deleted', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const deleted = await service.deleteOlderThan(90);

      expect(deleted).toBe(0);
    });
  });
});
