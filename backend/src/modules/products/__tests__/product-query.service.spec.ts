import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { ProductQueryService } from '../product-query.service';
import { Product, ProductStatus } from '../entities/product.entity';
import { Category } from '../entities/category.entity';
import { AttributeType } from '../entities/attribute-type.entity';
import { Review } from '../../reviews/entities/review.entity';
import { CacheService } from '../../cache/cache.service';
import { ProductSort } from '../dto/query-products.dto';

type RepoMock<T extends ObjectLiteral> = jest.Mocked<
  Pick<Repository<T>, 'find' | 'findOne' | 'createQueryBuilder' | 'increment'>
>;

function createRepoMock<T extends ObjectLiteral>(): RepoMock<T> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn().mockResolvedValue(undefined),
  } as unknown as RepoMock<T>;
}

interface QueryBuilderMock {
  leftJoinAndSelect: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  addOrderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  groupBy: jest.Mock;
  getMany: jest.Mock;
  getOne: jest.Mock;
  getManyAndCount: jest.Mock;
  getRawMany: jest.Mock;
  limit: jest.Mock;
}

function createQueryBuilderMock(): QueryBuilderMock {
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn().mockResolvedValue([]),
    limit: jest.fn().mockReturnThis(),
  };
  return qb;
}

describe('ProductQueryService', () => {
  let service: ProductQueryService;
  let productRepo: RepoMock<Product>;
  let categoryRepo: RepoMock<Category>;
  let reviewRepo: RepoMock<Review>;
  let attrTypeRepo: RepoMock<AttributeType>;
  let cacheService: { get: jest.Mock; set: jest.Mock; del: jest.Mock; delPattern: jest.Mock };
  let qb: QueryBuilderMock;
  let reviewQb: QueryBuilderMock;

  beforeEach(async () => {
    productRepo = createRepoMock<Product>();
    categoryRepo = createRepoMock<Category>();
    reviewRepo = createRepoMock<Review>();
    attrTypeRepo = createRepoMock<AttributeType>();
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      delPattern: jest.fn().mockResolvedValue(undefined),
    };

    qb = createQueryBuilderMock();
    reviewQb = createQueryBuilderMock();

    productRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<Product>);
    reviewRepo.createQueryBuilder.mockReturnValue(reviewQb as unknown as SelectQueryBuilder<Review>);
    categoryRepo.find.mockResolvedValue([]);
    attrTypeRepo.createQueryBuilder.mockReturnValue(qb as unknown as SelectQueryBuilder<AttributeType>);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductQueryService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(Review), useValue: reviewRepo },
        { provide: getRepositoryToken(AttributeType), useValue: attrTypeRepo },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get(ProductQueryService);
  });

  describe('findAll - 캐시', () => {
    it('cache hit 시 즉시 반환하고 DB 조회를 건너뛴다', async () => {
      const cached = { items: [], total: 0, page: 1, limit: 20 };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.findAll({});

      expect(result).toBe(cached);
      expect(productRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('findAll - 가격 필터', () => {
    it('price_min > price_max 면 BadRequestException', async () => {
      await expect(
        service.findAll({ price_min: 50000, price_max: 10000 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('price_min/price_max 가 정상이면 andWhere 호출', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      reviewQb.getRawMany.mockResolvedValue([]);

      await service.findAll({ price_min: 1000, price_max: 5000 });

      expect(qb.andWhere).toHaveBeenCalledWith('product.price >= :priceMin', { priceMin: 1000 });
      expect(qb.andWhere).toHaveBeenCalledWith('product.price <= :priceMax', { priceMax: 5000 });
    });
  });

  describe('findAll - 검색', () => {
    it('q 길이 >= 2 → MATCH AGAINST FULLTEXT 사용', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ q: '보이차' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)',
        { q: '보이차' },
      );
    });

    it('q 길이 < 2 → LIKE 검색', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ q: '보' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.name LIKE :q',
        { q: '%보%' },
      );
    });
  });

  describe('findAll - 정렬', () => {
    it.each([
      [ProductSort.LATEST, 'product.createdAt', 'DESC'],
      [ProductSort.PRICE_ASC, 'product.price', 'ASC'],
      [ProductSort.PRICE_DESC, 'product.price', 'DESC'],
      [ProductSort.POPULAR, 'product.viewCount', 'DESC'],
      [ProductSort.REVIEW_COUNT, 'product.reviewCount', 'DESC'],
      [ProductSort.RATING, 'product.avgRating', 'DESC'],
    ])('sort=%s → orderBy(%s, %s)', async (sort, field, direction) => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ sort });

      expect(qb.orderBy).toHaveBeenCalledWith(field, direction);
    });
  });

  describe('findAll - 페이지네이션', () => {
    it('skip/take 가 page,limit 에 맞춰 호출된다', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 3, limit: 10 });

      expect(qb.skip).toHaveBeenCalledWith(20); // (3-1)*10
      expect(qb.take).toHaveBeenCalledWith(10);
    });

    it('결과를 캐시에 저장한다', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('findAll - 카테고리 트리', () => {
    it('categoryId 지정 시 자식 카테고리 ID 까지 조건에 포함', async () => {
      categoryRepo.find.mockResolvedValue([
        { id: 11, parentId: 1 } as Category,
        { id: 12, parentId: 1 } as Category,
      ]);
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ categoryId: 1 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'product.categoryId IN (:...categoryIds)',
        { categoryIds: [1, 11, 12] },
      );
    });
  });

  describe('findAll - admin/공개 분기', () => {
    it('비관리자는 status=ACTIVE 강제', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: 'draft' }, false);

      expect(qb.andWhere).toHaveBeenCalledWith('product.status = :status', {
        status: ProductStatus.ACTIVE,
      });
    });

    it('관리자가 status 지정 시 그대로 적용', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ status: 'draft' }, true);

      expect(qb.andWhere).toHaveBeenCalledWith('product.status = :status', {
        status: 'draft',
      });
    });
  });

  describe('findOne', () => {
    it('없는 ID 조회 시 NotFoundException', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('비관리자가 draft 상품 조회 시 NotFoundException', async () => {
      qb.getOne.mockResolvedValue({ id: 1, status: ProductStatus.DRAFT } as Product);

      await expect(service.findOne(1, false)).rejects.toThrow(NotFoundException);
    });

    it('비관리자가 hidden 상품 조회 시 NotFoundException', async () => {
      qb.getOne.mockResolvedValue({ id: 2, status: ProductStatus.HIDDEN } as Product);

      await expect(service.findOne(2, false)).rejects.toThrow(NotFoundException);
    });

    it('정상 조회 후 viewCount 증가는 fire-and-forget', async () => {
      qb.getOne.mockResolvedValue({ id: 1, status: ProductStatus.ACTIVE } as Product);
      reviewQb.getRawMany.mockResolvedValue([]);

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(productRepo.increment).toHaveBeenCalledWith({ id: 1 }, 'viewCount', 1);
    });

    it('cache 에 저장되는지 확인', async () => {
      qb.getOne.mockResolvedValue({ id: 1, status: ProductStatus.ACTIVE } as Product);
      reviewQb.getRawMany.mockResolvedValue([]);

      await service.findOne(1);

      expect(cacheService.set).toHaveBeenCalled();
    });

    it('cache hit 인 draft 상품이라도 비관리자는 NotFoundException', async () => {
      cacheService.get.mockResolvedValue({ id: 1, status: ProductStatus.DRAFT });

      await expect(service.findOne(1, false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findBulk', () => {
    it('빈 배열 입력 시 빈 배열 반환', async () => {
      const result = await service.findBulk([]);
      expect(result).toEqual([]);
    });

    it('비관리자는 ACTIVE 상태만 필터링', async () => {
      qb.getMany.mockResolvedValue([
        { id: 1, status: ProductStatus.ACTIVE } as Product,
        { id: 2, status: ProductStatus.HIDDEN } as Product,
      ]);
      reviewQb.getRawMany.mockResolvedValue([]);

      const result = await service.findBulk([1, 2], false);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('autocomplete', () => {
    it('q 길이 < 2 면 빈 배열', async () => {
      const result = await service.autocomplete('a');

      expect(result).toEqual([]);
    });

    it('정상 호출 시 LIKE 쿼리 + status=ACTIVE 조건', async () => {
      qb.getMany.mockResolvedValue([
        { id: 1, name: '보이차', slug: 'pu-erh' } as Product,
      ]);

      const result = await service.autocomplete('보이');

      expect(qb.where).toHaveBeenCalledWith('p.name LIKE :q', { q: '보이%' });
      expect(qb.andWhere).toHaveBeenCalledWith('p.status = :status', { status: ProductStatus.ACTIVE });
      expect(result).toEqual([{ id: 1, name: '보이차', slug: 'pu-erh' }]);
    });
  });

  describe('locale 적용', () => {
    it('locale=en 이면 nameEn 으로 name 덮어쓴다', async () => {
      qb.getOne.mockResolvedValue({
        id: 1,
        status: ProductStatus.ACTIVE,
        name: '보이차',
        nameEn: 'Pu-erh',
      } as unknown as Product);
      reviewQb.getRawMany.mockResolvedValue([]);

      const result = await service.findOne(1, false, 'en');

      expect(result.name).toBe('Pu-erh');
    });
  });
});
