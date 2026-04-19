import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from '../reviews.service';
import { Review } from '../entities/review.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(Review), useValue: mockRepo },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepo },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
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
    it('should create a review', async () => {
      const orderItemQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 22 }),
      };
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(orderItemQb);
      mockRepo.findOne.mockResolvedValueOnce(null);
      mockRepo.create.mockReturnValue(mockReview);
      mockRepo.save.mockResolvedValue(mockReview);
      mockRepo.findOne.mockResolvedValueOnce(mockReview);

      const result = await service.create(10, {
        productId: 5,
        orderItemId: 22,
        rating: 5,
        content: '정말 좋아요',
        imageUrls: ['https://cdn.example.com/review/abc.webp'],
      });

      expect(result.id).toBe(1);
      expect(result.userName).toBe('홍**');
    });

    it('should throw BadRequestException for unpurchased product', async () => {
      const orderItemQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(orderItemQb);

      await expect(
        service.create(10, { productId: 5, orderItemId: 22, rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException for duplicate review', async () => {
      const orderItemQb = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: 22 }),
      };
      mockOrderItemRepo.createQueryBuilder.mockReturnValue(orderItemQb);
      mockRepo.findOne.mockResolvedValue(mockReview);

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
    it('should delete own review', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview });
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10, 'user')).resolves.not.toThrow();
    });

    it('should allow admin to delete any review', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockReview, userId: 99 });
      mockRepo.remove.mockResolvedValue(undefined);

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
