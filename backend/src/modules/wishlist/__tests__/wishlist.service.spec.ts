import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WishlistService } from '../wishlist.service';
import { Wishlist } from '../entities/wishlist.entity';

const mockRepo = {
  findAndCount: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
};

describe('WishlistService', () => {
  let service: WishlistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: getRepositoryToken(Wishlist), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<WishlistService>(WishlistService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return wishlist items with total', async () => {
      const mockItem = {
        id: 1,
        userId: 10,
        productId: 5,
        createdAt: new Date(),
        product: {
          id: 5,
          name: '테스트 상품',
          slug: 'test-product',
          price: 10000,
          salePrice: null,
          status: 'active',
          images: [],
        },
      } as unknown as Wishlist;

      mockRepo.findAndCount.mockResolvedValue([[mockItem], 1]);

      const result = await service.findAll(10);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].productId).toBe(5);
    });
  });

  describe('check', () => {
    it('should return isWishlisted=true when item exists', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, userId: 10, productId: 5 });
      const result = await service.check(10, 5);
      expect(result.isWishlisted).toBe(true);
      expect(result.wishlistId).toBe(1);
    });

    it('should return isWishlisted=false when item does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.check(10, 999);
      expect(result.isWishlisted).toBe(false);
      expect(result.wishlistId).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a wishlist item', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const newItem = { id: 1, userId: 10, productId: 5, createdAt: new Date() } as Wishlist;
      mockRepo.create.mockReturnValue(newItem);
      mockRepo.save.mockResolvedValue(newItem);

      const result = await service.create(10, { productId: 5 });

      expect(result.id).toBe(1);
      expect(result.productId).toBe(5);
    });

    it('should throw ConflictException when item already exists', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create(10, { productId: 5 })).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should remove a wishlist item', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, userId: 10, productId: 5 });
      mockRepo.remove.mockResolvedValue(undefined);

      await expect(service.remove(1, 10)).resolves.toBeUndefined();
    });

    it('should throw NotFoundException when item does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 10)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own item', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, userId: 99, productId: 5 });

      await expect(service.remove(1, 10)).rejects.toThrow(ForbiddenException);
    });
  });
});
