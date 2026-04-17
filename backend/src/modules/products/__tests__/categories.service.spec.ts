import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';
import { Product } from '../entities/product.entity';
import { CacheService } from '../../cache/cache.service';

const mockCategoryRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
};

const mockProductRepository = {
  count: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  delPattern: jest.fn(),
};

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: '패션',
  nameEn: null,
  nameJa: null,
  nameZh: null,
  slug: 'fashion',
  parentId: null,
  sortOrder: 0,
  isActive: true,
  imageUrl: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  parent: null as never,
  children: [] as never,
  products: [] as never,
  ...overrides,
} as Category);

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findTree', () => {
    it('캐시 미스 → DB 조회 후 캐시 저장', async () => {
      const categories: Partial<Category>[] = [
        { id: 1, name: '패션', slug: 'fashion', parentId: null, sortOrder: 0, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: '남성', slug: 'men', parentId: 1, sortOrder: 0, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, name: '여성', slug: 'women', parentId: 1, sortOrder: 1, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepository.find.mockResolvedValue(categories);

      const result = await service.findTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(2);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'categories:all',
        expect.any(Array),
        3600,
      );
    });

    it('캐시 히트 → DB 조회 없이 캐시 데이터 반환', async () => {
      const cached: Partial<Category>[] = [
        { id: 1, name: '패션', slug: 'fashion', parentId: null, sortOrder: 0, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date(), children: [] },
      ];

      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.findTree();

      expect(result).toHaveLength(1);
      expect(mockCategoryRepository.find).not.toHaveBeenCalled();
    });

    it('is_active=false 카테고리 제외 — find에 isActive:true 전달', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepository.find.mockResolvedValue([]);

      await service.findTree();

      expect(mockCategoryRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('여러 루트 카테고리 반환', async () => {
      const categories: Partial<Category>[] = [
        { id: 1, name: '패션', slug: 'fashion', parentId: null, sortOrder: 0, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: '전자기기', slug: 'electronics', parentId: null, sortOrder: 1, isActive: true, imageUrl: null, createdAt: new Date(), updatedAt: new Date() },
      ];

      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepository.find.mockResolvedValue(categories);

      const result = await service.findTree();

      expect(result).toHaveLength(2);
      expect(result[0].children).toHaveLength(0);
      expect(result[1].children).toHaveLength(0);
    });

    it('빈 카테고리 목록 → 빈 배열 반환', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockCategoryRepository.find.mockResolvedValue([]);

      const result = await service.findTree();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('루트 카테고리 생성 성공 → 캐시 삭제', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(null);
      mockCategoryRepository.create.mockReturnValue(cat);
      mockCategoryRepository.save.mockResolvedValue(cat);

      const result = await service.create({ name: '패션', slug: 'fashion' });

      expect(result).toBe(cat);
      expect(mockCategoryRepository.save).toHaveBeenCalled();
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:all');
    });

    it('depth 4 시도 → BadRequestException', async () => {
      const grandchild = makeCategory({ id: 4, parentId: 3 });
      const child = makeCategory({ id: 3, parentId: 2 });
      const root = makeCategory({ id: 2, parentId: 1 });
      const level1 = makeCategory({ id: 1, parentId: null });

      mockCategoryRepository.find.mockResolvedValueOnce([grandchild, child, root, level1]);

      await expect(
        service.create({ name: '4단계', slug: '4th-level', parentId: 4 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('slug 중복 → ConflictException', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(cat);

      await expect(
        service.create({ name: '패션', slug: 'fashion' }),
      ).rejects.toThrow(ConflictException);
    });

    it('존재하지 않는 parentId → NotFoundException', async () => {
      mockCategoryRepository.find.mockResolvedValue([makeCategory({ id: 99, parentId: null })]);
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ name: '테스트', slug: 'test', parentId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('카테고리 업데이트 성공 → 캐시 삭제', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(cat);
      mockCategoryRepository.save.mockResolvedValue({ ...cat, name: '업데이트됨' });

      const result = await service.update(1, { name: '업데이트됨' });

      expect(result.name).toBe('업데이트됨');
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:all');
    });

    it('존재하지 않는 카테고리 → NotFoundException', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: '없음' })).rejects.toThrow(NotFoundException);
    });

    it('자기 자신을 부모로 설정 → BadRequestException', async () => {
      const cat = makeCategory({ id: 1 });
      mockCategoryRepository.findOne.mockResolvedValue(cat);

      await expect(service.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('하위 카테고리가 있는 경우 → BadRequestException', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(cat);
      mockCategoryRepository.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('연관 상품이 있는 경우 → BadRequestException', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(cat);
      mockCategoryRepository.count.mockResolvedValue(0);
      mockProductRepository.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('삭제 성공 → 캐시 삭제', async () => {
      const cat = makeCategory();
      mockCategoryRepository.findOne.mockResolvedValue(cat);
      mockCategoryRepository.count.mockResolvedValue(0);
      mockProductRepository.count.mockResolvedValue(0);
      mockCategoryRepository.remove.mockResolvedValue(cat);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockCategoryRepository.remove).toHaveBeenCalledWith(cat);
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:all');
    });

    it('존재하지 않는 카테고리 → NotFoundException', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('순서 일괄 업데이트 → 캐시 삭제', async () => {
      mockCategoryRepository.update.mockResolvedValue({ affected: 1 });

      await service.reorder({ orders: [{ id: 1, sortOrder: 5 }, { id: 2, sortOrder: 10 }] });

      expect(mockCategoryRepository.update).toHaveBeenCalledTimes(2);
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(1, { sortOrder: 5 });
      expect(mockCategoryRepository.update).toHaveBeenCalledWith(2, { sortOrder: 10 });
      expect(mockCacheService.del).toHaveBeenCalledWith('categories:all');
    });
  });
});
