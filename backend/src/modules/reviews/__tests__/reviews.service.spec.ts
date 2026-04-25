import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewsService } from '../reviews.service';
import { Review } from '../entities/review.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { PointHistory } from '../../coupons/entities/point-history.entity';
import { SettingsService } from '../../settings/settings.service';
import { OrderStatus } from '../../orders/entities/order.entity';
import { PointsService } from '../../points/points.service';

describe('ReviewsService', () => {
  let service: ReviewsService;

  const mockReview = {
    id: 1,
    userId: 10,
    productId: 5,
    orderItemId: 22,
    rating: 5,
    content: '정말 좋아요',
    imageUrls: ['https://cdn.example.com/review/abc.webp'],
    isVisible: true,
    createdAt: new Date('2026-03-01T12:00:00Z'),
    updatedAt: new Date('2026-03-01T12:00:00Z'),
    user: { name: '홍길동' },
  };

  const mockOrderItem = {
    id: 22,
    productId: 5,
    order: { userId: 10, status: OrderStatus.DELIVERED },
  };

  const mockRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockOrderItemRepo = {
    createQueryBuilder: jest.fn(),
  };

  const mockPointHistoryRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSettingsService = {
    getNumber: jest.fn(),
  };

  const mockPointsService = {
    getRunningBalanceInTx: jest.fn(),
  };

  // Manager used inside dataSource.transaction
  const mockManager = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
        { provide: getRepositoryToken(PointHistory), useValue: mockPointHistoryRepo },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: DataSource, useValue: mockDataSource },
        { provide: PointsService, useValue: mockPointsService },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
    mockManager.findOne.mockReset();
    mockManager.create.mockReset();
    mockManager.save.mockReset();
    mockManager.remove.mockReset();
    mockManager.query.mockReset();
    mockPointsService.getRunningBalanceInTx.mockResolvedValue(0);

    // Default settings: reward=100, bonus=0
    mockSettingsService.getNumber.mockImplementation((key: string, def: number) => {
      if (key === 'review_point_reward') return Promise.resolve(100);
      if (key === 'photo_review_bonus') return Promise.resolve(0);
      return Promise.resolve(def);
    });
  });

  describe('findAll', () => {
    it('should return reviews with stats and pagination', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockReview], 1]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '5.0', cnt: '1' }),
        getRawMany: jest.fn().mockResolvedValue([{ rating: 5, count: '1' }]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ productId: 5, sort: 'recent', page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].userName).toBe('홍**');
      expect(result.stats.averageRating).toBe(5);
      expect(result.stats.totalCount).toBe(1);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1 });
    });

    it('should sort by rating_high', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null, cnt: '0' }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ sort: 'rating_high' });

      expect(qb.orderBy).toHaveBeenCalledWith('review.rating', 'DESC');
    });
  });

  describe('create', () => {
    function setupOrderItemQb(result: unknown) {
      const qb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(result),
      };
      mockManager.createQueryBuilder.mockReturnValue(qb);
      return qb;
    }

    it('should create a review and award points', async () => {
      setupOrderItemQb(mockOrderItem);
      mockManager.findOne.mockResolvedValueOnce(null); // no duplicate review
      mockManager.findOne.mockResolvedValueOnce(null); // no existing point balance
      mockManager.create.mockImplementation((_entity: unknown, data: unknown) => data);
      mockManager.save.mockImplementation((_entity: unknown, data: unknown) => Promise.resolve({ ...mockReview, ...(data as object) }));

      // reload with user
      mockRepo.findOne.mockResolvedValueOnce(mockReview);

      const result = await service.create(10, {
        productId: 5,
        orderItemId: 22,
        rating: 5,
        content: '정말 좋아요',
        imageUrls: [],
      });

      expect(result.id).toBe(1);
      expect(result.userName).toBe('홍**');
      // Point earn should be created (reward=100, no images so no bonus)
      const saveCalls = mockManager.save.mock.calls;
      const pointSave = saveCalls.find((call: unknown[]) => {
        const data = call[1] as { type?: string };
        return data?.type === 'earn';
      });
      expect(pointSave).toBeDefined();
      expect((pointSave![1] as { amount: number }).amount).toBe(100);
    });

    it('should award photo bonus when images are present', async () => {
      mockSettingsService.getNumber.mockImplementation((key: string) => {
        if (key === 'review_point_reward') return Promise.resolve(100);
        if (key === 'photo_review_bonus') return Promise.resolve(50);
        return Promise.resolve(0);
      });

      setupOrderItemQb(mockOrderItem);
      mockManager.findOne.mockResolvedValueOnce(null);
      mockManager.findOne.mockResolvedValueOnce(null);
      mockManager.create.mockImplementation((_entity: unknown, data: unknown) => data);
      mockManager.save.mockImplementation((_entity: unknown, data: unknown) => Promise.resolve({ ...mockReview, ...(data as object) }));
      mockRepo.findOne.mockResolvedValueOnce(mockReview);

      await service.create(10, {
        productId: 5,
        orderItemId: 22,
        rating: 5,
        imageUrls: ['https://cdn.example.com/review/abc.webp'],
      });

      const saveCalls = mockManager.save.mock.calls;
      const pointSave = saveCalls.find((call: unknown[]) => {
        const data = call[1] as { type?: string };
        return data?.type === 'earn';
      });
      expect(pointSave).toBeDefined();
      expect((pointSave![1] as { amount: number }).amount).toBe(150); // 100 + 50 bonus
    });

    it('should throw BadRequestException for unpurchased product', async () => {
      setupOrderItemQb(null);

      await expect(
        service.create(10, { productId: 5, orderItemId: 22, rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for REFUNDED order', async () => {
      setupOrderItemQb({
        ...mockOrderItem,
        order: { userId: 10, status: OrderStatus.REFUNDED },
      });

      await expect(
        service.create(10, { productId: 5, orderItemId: 22, rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CANCELLED order', async () => {
      setupOrderItemQb({
        ...mockOrderItem,
        order: { userId: 10, status: OrderStatus.CANCELLED },
      });

      await expect(
        service.create(10, { productId: 5, orderItemId: 22, rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate review', async () => {
      setupOrderItemQb(mockOrderItem);
      mockManager.findOne.mockResolvedValueOnce(mockReview); // duplicate

      await expect(
        service.create(10, { productId: 5, orderItemId: 22, rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update own review', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview });
      mockRepo.save.mockImplementation((r: Review) => Promise.resolve(r));

      const result = await service.update(1, 10, { rating: 4 });
      expect(result.rating).toBe(4);
    });

    it('should throw NotFoundException for non-existent review', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.update(999, 10, { rating: 4 })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview, userId: 99 });

      await expect(service.update(1, 10, { rating: 4 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete own review and revoke points', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview });

      const earnEntry = {
        id: 99,
        amount: 100,
        type: 'earn',
        description: '리뷰 포인트 적립 (review_id:1)',
        relatedEntityType: 'review',
        relatedEntityId: 1,
      };
      mockManager.findOne
        .mockResolvedValueOnce(earnEntry) // earn entry
        .mockResolvedValueOnce(null);     // no existing revoke
      mockManager.create.mockImplementation((_entity: unknown, data: unknown) => data);
      mockManager.save.mockResolvedValue({});
      mockManager.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10, 'user')).resolves.not.toThrow();

      const saveCalls = mockManager.save.mock.calls;
      const revokeSave = saveCalls.find((call: unknown[]) => {
        const data = call[1] as { type?: string };
        return data?.type === 'spend';
      });
      expect(revokeSave).toBeDefined();
      expect((revokeSave![1] as { amount: number }).amount).toBe(100);
    });

    it('should revoke based on relatedEntity columns even when description format changes', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview });

      const earnEntry = {
        id: 199,
        amount: 100,
        type: 'earn',
        description: 'LEGACY_FORMAT',
        relatedEntityType: 'review',
        relatedEntityId: 1,
      };
      mockManager.findOne
        .mockResolvedValueOnce(earnEntry)
        .mockResolvedValueOnce(null);
      mockManager.create.mockImplementation((_entity: unknown, data: unknown) => data);
      mockManager.save.mockResolvedValue({});
      mockManager.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10, 'user')).resolves.not.toThrow();

      expect(mockManager.findOne).toHaveBeenNthCalledWith(
        1,
        PointHistory,
        expect.objectContaining({
          where: expect.objectContaining({
            relatedEntityType: 'review',
            relatedEntityId: 1,
            type: 'earn',
          }),
        }),
      );
    });

    it('should not double-revoke points if already revoked', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview });

      const earnEntry = {
        id: 99,
        amount: 100,
        type: 'earn',
        description: '리뷰 포인트 적립 (review_id:1)',
        relatedEntityType: 'review',
        relatedEntityId: 1,
      };
      const spendEntry = {
        id: 100,
        amount: 100,
        type: 'spend',
        description: '리뷰 포인트 환수 (review_id:1)',
        relatedEntityType: 'review',
        relatedEntityId: 1,
      };
      mockManager.findOne
        .mockResolvedValueOnce(earnEntry)  // earn entry found
        .mockResolvedValueOnce(spendEntry); // already revoked
      mockManager.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10, 'user')).resolves.not.toThrow();

      // No spend entry should be saved
      const saveCalls = mockManager.save.mock.calls;
      const revokeSave = saveCalls.find((call: unknown[]) => {
        const data = call[1] as { type?: string };
        return data?.type === 'spend';
      });
      expect(revokeSave).toBeUndefined();
    });

    it('should allow admin to delete any review', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview, userId: 99 });
      mockManager.findOne.mockResolvedValue(null); // no earn entry
      mockManager.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10, 'admin')).resolves.not.toThrow();
    });

    it('should throw ForbiddenException for non-owner non-admin', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview, userId: 99 });

      await expect(service.remove(1, 10, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent review', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 10, 'user')).rejects.toThrow(NotFoundException);
    });
  });
});
