import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, SelectQueryBuilder, QueryFailedError } from 'typeorm';
import { ProductsService } from '../products.service';
import { Product, ProductStatus } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { Review } from '../../reviews/entities/review.entity';
import { ProductImage } from '../entities/product-image.entity';
import { ProductDetailImage } from '../entities/product-detail-image.entity';
import { AttributeType } from '../entities/attribute-type.entity';
import { ProductAttribute } from '../entities/product-attribute.entity';
import { ProductSort } from '../dto/query-products.dto';
import { CacheService } from '../../cache/cache.service';

function makeFulltextError(): QueryFailedError {
  const err = new QueryFailedError(
    'SELECT * FROM product WHERE MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)',
    ['보이차'],
    new Error(' FULLTEXT index error'),
  );
  Object.defineProperty(err, 'errno', { value: 1191, enumerable: true });
  return err;
}

const mockSelect = jest.fn().mockReturnThis();
const mockOrderBy = jest.fn().mockReturnThis();
const mockAndWhere = jest.fn().mockReturnThis();
const mockSkip = jest.fn().mockReturnThis();
const mockTake = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockLeftJoinAndSelect = jest.fn().mockReturnThis();
const mockGetManyAndCount = jest.fn();
const mockGetMany = jest.fn();
const mockGetOne = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockInnerJoin = jest.fn().mockReturnThis();

const mockQueryBuilder = {
  select: mockSelect,
  leftJoinAndSelect: mockLeftJoinAndSelect,
  andWhere: mockAndWhere,
  where: mockWhere,
  orderBy: mockOrderBy,
  skip: mockSkip,
  take: mockTake,
  limit: mockLimit,
  innerJoin: mockInnerJoin,
  getManyAndCount: mockGetManyAndCount,
  getMany: mockGetMany,
  getOne: mockGetOne,
} as unknown as SelectQueryBuilder<Product>;

const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  increment: jest.fn().mockResolvedValue(undefined),
};

describe('ProductsService — Search', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
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
          useValue: { createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder) },
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ProductDetailImage),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(AttributeType),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(ProductAttribute),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: { get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined), del: jest.fn().mockResolvedValue(undefined), delByPattern: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockSelect.mockReturnThis();
    mockLeftJoinAndSelect.mockReturnThis();
    mockAndWhere.mockReturnThis();
    mockWhere.mockReturnThis();
    mockOrderBy.mockReturnThis();
    mockSkip.mockReturnThis();
    mockTake.mockReturnThis();
    mockLimit.mockReturnThis();
  });

  describe('autocomplete', () => {
    it('q가 undefined이면 빈 배열 반환', async () => {
      const result = await service.autocomplete(undefined as unknown as string);
      expect(result).toEqual([]);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('q 길이가 1이면 빈 배열 반환', async () => {
      const result = await service.autocomplete('a');
      expect(result).toEqual([]);
      expect(mockRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('q 길이가 2 이상이면 repository 쿼리 실행', async () => {
      const mockProducts = [
        { id: 1, name: '나이키 운동화', slug: 'nike-shoes' } as Product,
      ];
      mockGetMany.mockResolvedValue(mockProducts);

      const result = await service.autocomplete('나이키');

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('p');
      expect(mockWhere).toHaveBeenCalledWith('p.name LIKE :q', { q: '나이키%' });
      expect(mockAndWhere).toHaveBeenCalledWith('p.status = :status', {
        status: ProductStatus.ACTIVE,
      });
      expect(result).toEqual([{ id: 1, name: '나이키 운동화', slug: 'nike-shoes' }]);
    });

    it('SQL 인젝션 시도 — 파라미터 바인딩으로 안전하게 처리', async () => {
      mockGetMany.mockResolvedValue([]);
      const maliciousInput = "'; DROP TABLE products; --";

      const result = await service.autocomplete(maliciousInput);

      expect(mockWhere).toHaveBeenCalledWith('p.name LIKE :q', {
        q: `${maliciousInput}%`,
      });
      expect(result).toEqual([]);
    });
  });

  describe('findAll — price range', () => {
    it('price_min > price_max → BadRequestException', async () => {
      await expect(
        service.findAll({ price_min: 50000, price_max: 10000 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.findAll({ price_min: 50000, price_max: 10000 }),
      ).rejects.toThrow('price_min은 price_max보다 클 수 없습니다.');
    });

    it('price_min만 있을 때 >= 조건 추가', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ price_min: 10000 });

      expect(mockAndWhere).toHaveBeenCalledWith('product.price >= :priceMin', {
        priceMin: 10000,
      });
    });

    it('price_max만 있을 때 <= 조건 추가', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ price_max: 50000 });

      expect(mockAndWhere).toHaveBeenCalledWith('product.price <= :priceMax', {
        priceMax: 50000,
      });
    });

    it('price_min === price_max → 정상 처리 (같은 가격 허용)', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await expect(
        service.findAll({ price_min: 10000, price_max: 10000 }),
      ).resolves.not.toThrow();
    });
  });

  describe('findAll — search + sort', () => {
    it('q와 categoryId 동시 사용 시 두 조건 모두 적용', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ q: '나이키', categoryId: 3 });

      expect(mockAndWhere).toHaveBeenCalledWith(
        'MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)',
        { q: '나이키' },
      );
      expect(mockAndWhere).toHaveBeenCalledWith(
        'product.categoryId IN (:...categoryIds)',
        { categoryIds: [3] },
      );
    });

    it('sort=popular → viewCount DESC 정렬', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort: ProductSort.POPULAR });

      expect(mockOrderBy).toHaveBeenCalledWith('product.viewCount', 'DESC');
    });

    it('기본 정렬 → createdAt DESC', async () => {
      mockGetManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(mockOrderBy).toHaveBeenCalledWith('product.createdAt', 'DESC');
    });
  });

  describe('findAll — LIKE fallback', () => {
    it('FULLTEXT 실패 시 errno 1191 → LIKE 폴백으로 정상 결과 반환', async () => {
      mockGetManyAndCount
        .mockRejectedValueOnce(makeFulltextError())
        .mockResolvedValue([[], 0]);

      const result = await service.findAll({ q: '보이차', sort: ProductSort.PRICE_ASC });

      expect(result).toMatchObject({ total: 0, items: [] });
    });

    it('LIKE 폴백 시에도 categoryId + price 필터 적용 → sort price DESC 적용', async () => {
      mockGetManyAndCount
        .mockRejectedValueOnce(makeFulltextError())
        .mockResolvedValue([[], 0]);

      await service.findAll({
        q: '보이차',
        categoryId: 2,
        price_min: 10000,
        price_max: 50000,
        sort: ProductSort.PRICE_DESC,
      });

      expect(mockOrderBy).toHaveBeenCalledWith('product.price', 'DESC');
    });
  });
});
