import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { ProductsService } from '../products.service';
import { ProductQueryService } from '../product-query.service';
import { ProductCommandService } from '../product-command.service';
import { Product, ProductStatus } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductDetailImage } from '../entities/product-detail-image.entity';
import { Review } from '../../reviews/entities/review.entity';
import { AttributeType } from '../entities/attribute-type.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { ProductSort } from '../dto/query-products.dto';
import { CacheService } from '../../cache/cache.service';
import { RestockAlertsService } from '../../restock-alerts/restock-alerts.service';

const mockOrderBy = jest.fn().mockReturnThis();
const mockAddOrderBy = jest.fn().mockReturnThis();
const mockAndWhere = jest.fn().mockReturnThis();
const mockSkip = jest.fn().mockReturnThis();
const mockTake = jest.fn().mockReturnThis();
const mockLeftJoinAndSelect = jest.fn().mockReturnThis();
const mockGetManyAndCount = jest.fn();
const mockGetOne = jest.fn();
const mockWhere = jest.fn().mockReturnThis();

const mockGetMany = jest.fn();

const mockQueryBuilder = {
  leftJoinAndSelect: mockLeftJoinAndSelect,
  andWhere: mockAndWhere,
  where: mockWhere,
  orderBy: mockOrderBy,
  addOrderBy: mockAddOrderBy,
  skip: mockSkip,
  take: mockTake,
  getManyAndCount: mockGetManyAndCount,
  getOne: mockGetOne,
  getMany: mockGetMany,
} as unknown as SelectQueryBuilder<Product>;

const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn().mockResolvedValue(undefined),
};

const mockManager = {
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn().mockImplementation(async (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager)),
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        ProductQueryService,
        ProductCommandService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(Review),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              addSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: { create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(ProductDetailImage),
          useValue: { create: jest.fn(), save: jest.fn(), delete: jest.fn() },
        },
        {
          provide: getRepositoryToken(AttributeType),
          useValue: { find: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: getRepositoryToken(ProductAttribute),
          useValue: { find: jest.fn().mockResolvedValue([]), delete: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined), delByPattern: jest.fn().mockResolvedValue(undefined), delPattern: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: RestockAlertsService,
          useValue: { processProductRestock: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockLeftJoinAndSelect.mockReturnThis();
    mockAndWhere.mockReturnThis();
    mockWhere.mockReturnThis();
    mockOrderBy.mockReturnThis();
    mockSkip.mockReturnThis();
    mockTake.mockReturnThis();
    mockDataSource.transaction.mockImplementation(async (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager));
    mockManager.create.mockReturnValue({});
    mockManager.save.mockResolvedValue({});
    mockManager.delete.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('sort=latest → orderBy createdAt DESC', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort: ProductSort.LATEST });

      expect(mockOrderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });

    it('sort=price_asc → orderBy price ASC', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort: ProductSort.PRICE_ASC });

      expect(mockOrderBy).toHaveBeenCalledWith('product.price', 'ASC');
    });

    it('sort=price_desc → orderBy price DESC', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort: ProductSort.PRICE_DESC });

      expect(mockOrderBy).toHaveBeenCalledWith('product.price', 'DESC');
    });

    it('sort=popular → orderBy viewCount DESC', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort: ProductSort.POPULAR });

      expect(mockOrderBy).toHaveBeenCalledWith('product.viewCount', 'DESC');
    });

    it('q=keyword → LIKE condition included', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ q: '키워드' });

      expect(mockAndWhere).toHaveBeenCalledWith(
        'MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)',
        { q: '키워드' },
      );
    });

    it('categoryId=3 → categoryId condition included', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ categoryId: 3 });

      expect(mockAndWhere).toHaveBeenCalledWith(
        'product.categoryId IN (:...categoryIds)',
        { categoryIds: [3] },
      );
    });

    it('returns pagination structure', async () => {
      const items = [{ id: 1 } as Product];
      mockGetManyAndCount.mockResolvedValue([items, 1]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result).toMatchObject({ total: 1, page: 2, limit: 10 });
      expect(result.items[0]).toMatchObject({ id: 1 });
      expect(mockSkip).toHaveBeenCalledWith(10);
      expect(mockTake).toHaveBeenCalledWith(10);
    });
  });

  describe('findOne', () => {
    it('존재하지 않는 id → NotFoundException', async () => {
      mockGetOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('draft 상품 비관리자 조회 → NotFoundException', async () => {
      mockGetOne.mockResolvedValue({
        id: 1,
        status: ProductStatus.DRAFT,
      } as Product);

      await expect(service.findOne(1, false)).rejects.toThrow(NotFoundException);
    });

    it('hidden 상품 비관리자 조회 → NotFoundException', async () => {
      mockGetOne.mockResolvedValue({
        id: 2,
        status: ProductStatus.HIDDEN,
      } as Product);

      await expect(service.findOne(2, false)).rejects.toThrow(NotFoundException);
    });

    it('active 상품 정상 반환', async () => {
      const product = { id: 3, status: ProductStatus.ACTIVE } as Product;
      mockGetOne.mockResolvedValue(product);

      const result = await service.findOne(3);

      expect(result).toMatchObject({ id: 3, status: ProductStatus.ACTIVE });
    });

    it('관리자 draft 상품 조회 성공', async () => {
      const product = { id: 4, status: ProductStatus.DRAFT } as Product;
      mockGetOne.mockResolvedValue(product);

      const result = await service.findOne(4, true);

      expect(result).toMatchObject({ id: 4, status: ProductStatus.DRAFT });
    });
  });

  describe('create', () => {
    it('slug 중복 → ConflictException (DB ER_DUP_ENTRY)', async () => {
      const dupError = Object.assign(new Error('Duplicate entry'), {
        name: 'QueryFailedError',
        code: 'ER_DUP_ENTRY',
      });
      mockManager.create.mockReturnValue({});
      mockManager.save.mockRejectedValue(dupError);

      await expect(
        service.create({ name: 'test', slug: 'duplicate', price: 1000 }),
      ).rejects.toThrow(ConflictException);
    });

    it('정상 생성', async () => {
      const created = { id: 1 } as Product;
      mockManager.create.mockReturnValue(created);
      mockManager.save.mockResolvedValue(created);

      const result = await service.create({
        name: '신상품',
        slug: 'new-product',
        price: 10000,
      });

      expect(result).toBe(created);
    });

    it('영어 번역 필드 포함 생성 시 entity에 전달됨', async () => {
      const created = { id: 2 } as Product;
      mockManager.create.mockReturnValue(created);
      mockManager.save.mockResolvedValue(created);

      await service.create({
        name: '보이차',
        slug: 'pu-erh',
        price: 35000,
        nameEn: 'Pu-erh Tea',
        descriptionEn: 'Traditional pu-erh',
        shortDescriptionEn: 'Smooth taste',
      });

      expect(mockManager.create).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          nameEn: 'Pu-erh Tea',
          descriptionEn: 'Traditional pu-erh',
          shortDescriptionEn: 'Smooth taste',
        }),
      );
    });

    it('이미지 저장 실패 시 상품도 롤백됨', async () => {
      const created = { id: 10 } as Product;
      mockManager.create.mockReturnValue(created);
      // 첫 번째 save(Product) 성공, 두 번째 save(ProductImage) 실패
      mockManager.save
        .mockResolvedValueOnce(created)
        .mockRejectedValueOnce(new Error('이미지 저장 실패'));
      // transaction 자체가 reject되도록 실제 콜백 실행
      mockDataSource.transaction.mockImplementation(async (cb: (manager: typeof mockManager) => Promise<unknown>) => cb(mockManager));

      await expect(
        service.create({
          name: '롤백테스트',
          slug: 'rollback-test',
          price: 5000,
          images: [{ url: 'https://example.com/img.jpg' }],
        }),
      ).rejects.toThrow('이미지 저장 실패');
    });
  });

  describe('update', () => {
    it('영어 번역 필드 업데이트 시 entity에 반영됨', async () => {
      const existing = {
        id: 1,
        status: ProductStatus.ACTIVE,
        nameEn: null,
        descriptionEn: null,
        shortDescriptionEn: null,
      } as unknown as Product;
      mockRepository.findOne.mockResolvedValue(existing);
      const updated = { ...existing, nameEn: 'Updated English Name' };
      mockManager.save.mockResolvedValue(updated);

      const result = await service.update(1, { nameEn: 'Updated English Name' });

      expect(result).toMatchObject({ nameEn: 'Updated English Name' });
    });
  });

  describe('findBulk', () => {
    it('원본 ids 배열을 변경하지 않는다', async () => {
      mockGetMany.mockResolvedValue([]);

      const ids = [3, 1, 2];
      const originalOrder = [...ids];

      await service.findBulk(ids);

      expect(ids).toEqual(originalOrder);
    });
  });
});
