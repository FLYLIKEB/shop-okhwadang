import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { Category } from '../entities/category.entity';

const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  query: jest.fn(),
};

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 1,
  name: '패션',
  slug: 'fashion',
  parentId: null,
  sortOrder: 0,
  isActive: true,
  imageUrl: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  parent: null,
  children: [],
  products: [],
  ...overrides,
});

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    jest.clearAllMocks();
  });

  describe('findTree', () => {
    it('트리 구조 반환 — 루트와 자식 노드 계층화', async () => {
      const categories: Partial<Category>[] = [
        {
          id: 1,
          name: '패션',
          slug: 'fashion',
          parentId: null,
          sortOrder: 0,
          isActive: true,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: '남성',
          slug: 'men',
          parentId: 1,
          sortOrder: 0,
          isActive: true,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 3,
          name: '여성',
          slug: 'women',
          parentId: 1,
          sortOrder: 1,
          isActive: true,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(categories);

      const result = await service.findTree();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].id).toBe(2);
      expect(result[0].children[1].id).toBe(3);
    });

    it('is_active=false 카테고리 제외 확인 — find에 isActive:true 전달', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.findTree();

      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
        }),
      );
    });

    it('여러 루트 카테고리 반환', async () => {
      const categories: Partial<Category>[] = [
        {
          id: 1,
          name: '패션',
          slug: 'fashion',
          parentId: null,
          sortOrder: 0,
          isActive: true,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: '전자기기',
          slug: 'electronics',
          parentId: null,
          sortOrder: 1,
          isActive: true,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(categories);

      const result = await service.findTree();

      expect(result).toHaveLength(2);
      expect(result[0].children).toHaveLength(0);
      expect(result[1].children).toHaveLength(0);
    });

    it('빈 카테고리 목록 → 빈 배열 반환', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findTree();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('루트 카테고리 생성 성공', async () => {
      const cat = makeCategory();
      mockRepository.findOne.mockResolvedValue(null); // no slug conflict
      mockRepository.create.mockReturnValue(cat);
      mockRepository.save.mockResolvedValue(cat);

      const result = await service.create({ name: '패션', slug: 'fashion' });

      expect(result).toBe(cat);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('depth 4 시도 → BadRequestException', async () => {
      // depth chain: child(4) → grandchild(3) → child(2) → root(1) → null
      // parentId = 4, grandchild
      const grandchild = makeCategory({ id: 4, parentId: 3 });
      const child = makeCategory({ id: 3, parentId: 2 });
      const root = makeCategory({ id: 2, parentId: 1 });
      const level1 = makeCategory({ id: 1, parentId: null });

      mockRepository.findOne
        .mockResolvedValueOnce(grandchild) // getDepth: find parentId=4
        .mockResolvedValueOnce(child)      // getDepth: find parentId=3
        .mockResolvedValueOnce(root)       // getDepth: find parentId=2
        .mockResolvedValueOnce(level1);    // getDepth: find parentId=1 (parentId=null → stop)

      await expect(
        service.create({ name: '4단계', slug: '4th-level', parentId: 4 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('slug 중복 → ConflictException', async () => {
      const cat = makeCategory();
      // getDepth: parentId undefined → depth 1 (no findOne call for depth)
      mockRepository.findOne.mockResolvedValue(cat); // slug conflict

      await expect(
        service.create({ name: '패션', slug: 'fashion' }),
      ).rejects.toThrow(ConflictException);
    });

    it('존재하지 않는 parentId → NotFoundException', async () => {
      // getDepth calls findOne(parentId=99) → returns null (depth stays at 2, ok)
      // then parent check: findOne → null
      mockRepository.findOne
        .mockResolvedValueOnce(null) // getDepth: parentId=99 not found
        .mockResolvedValueOnce(null); // parent existence check

      await expect(
        service.create({ name: '테스트', slug: 'test', parentId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('카테고리 업데이트 성공', async () => {
      const cat = makeCategory();
      mockRepository.findOne.mockResolvedValue(cat);
      mockRepository.save.mockResolvedValue({ ...cat, name: '업데이트됨' });

      const result = await service.update(1, { name: '업데이트됨' });

      expect(result.name).toBe('업데이트됨');
    });

    it('존재하지 않는 카테고리 → NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { name: '없음' })).rejects.toThrow(NotFoundException);
    });

    it('자기 자신을 부모로 설정 → BadRequestException', async () => {
      const cat = makeCategory({ id: 1 });
      mockRepository.findOne.mockResolvedValue(cat);

      await expect(service.update(1, { parentId: 1 })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('하위 카테고리가 있는 경우 → BadRequestException', async () => {
      const cat = makeCategory();
      mockRepository.findOne.mockResolvedValue(cat);
      mockRepository.count.mockResolvedValue(2);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('연관 상품이 있는 경우 → BadRequestException', async () => {
      const cat = makeCategory();
      mockRepository.findOne.mockResolvedValue(cat);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.query.mockResolvedValue([{ cnt: '3' }]);

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });

    it('삭제 성공', async () => {
      const cat = makeCategory();
      mockRepository.findOne.mockResolvedValue(cat);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.query.mockResolvedValue([{ cnt: '0' }]);
      mockRepository.remove.mockResolvedValue(cat);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockRepository.remove).toHaveBeenCalledWith(cat);
    });

    it('존재하지 않는 카테고리 → NotFoundException', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reorder', () => {
    it('순서 일괄 업데이트', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.reorder({ orders: [{ id: 1, sortOrder: 5 }, { id: 2, sortOrder: 10 }] });

      expect(mockRepository.update).toHaveBeenCalledTimes(2);
      expect(mockRepository.update).toHaveBeenCalledWith(1, { sortOrder: 5 });
      expect(mockRepository.update).toHaveBeenCalledWith(2, { sortOrder: 10 });
    });
  });
});
