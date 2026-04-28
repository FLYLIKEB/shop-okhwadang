import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { Review } from '../reviews/entities/review.entity';
import { AttributeType } from './entities/attribute-type.entity';
import { QueryProductsDto, ProductSort } from './dto/query-products.dto';
import { CacheService } from '../cache/cache.service';
import { applyLocale } from '../../common/utils/locale.util';
import { paginate } from '../../common/utils/pagination.util';
import {
  getProductBulkCacheKey,
  getProductDetailCacheKey,
  getProductListCacheKey,
} from './product-cache.util';

const CACHE_TTL_LIST = 300;
const CACHE_TTL_DETAIL = 600;

@Injectable()
export class ProductQueryService {
  private readonly logger = new Logger(ProductQueryService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(AttributeType)
    private readonly attributeTypeRepository: Repository<AttributeType>,
    private readonly cacheService: CacheService,
  ) {}

  async findAll(
    query: QueryProductsDto,
    isAdmin = false,
  ): Promise<{
    items: (Product & { rating: number; reviewCount: number })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const cacheKey = getProductListCacheKey(query, isAdmin);
    const cached = await this.cacheService.get<{
      items: (Product & { rating: number; reviewCount: number })[];
      total: number;
      page: number;
      limit: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const { page = 1, limit = 20, sort = ProductSort.LATEST, q, status, locale } =
      query;

    if (
      query.price_min !== undefined &&
      query.price_max !== undefined &&
      query.price_min > query.price_max
    ) {
      throw new BadRequestException('price_min은 price_max보다 클 수 없습니다.');
    }

    const { categoryIds, attrTypeIdMap } = await this.preResolveFilterData(query);

    const qb = this.buildBaseQueryBuilder(
      isAdmin,
      status as ProductStatus | undefined,
    );

    if (q) {
      if (q.length >= 2) {
        qb.andWhere('MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)', { q });
      } else {
        qb.andWhere('product.name LIKE :q', { q: `%${q}%` });
      }
    }

    this.applyFiltersAndSort(qb, query, categoryIds, attrTypeIdMap);

    try {
      return await this.executeFindAll(qb, page, limit, sort, locale, cacheKey);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        q &&
        q.length >= 2 &&
        (err as QueryFailedError & { errno?: number }).errno === 1191
      ) {
        this.logger.warn('FULLTEXT index missing — falling back to LIKE search');
        return this.executeFindAllWithLikeFallback(
          query,
          isAdmin,
          page,
          limit,
          sort,
          categoryIds,
          attrTypeIdMap,
          locale,
          cacheKey,
        );
      }
      throw err;
    }
  }

  async findOne(id: number, isAdmin = false, locale?: string): Promise<Product> {
    const cacheKey = getProductDetailCacheKey(id);
    const cached = await this.cacheService.get<Product>(cacheKey);

    if (cached) {
      if (
        !isAdmin &&
        (cached.status === ProductStatus.DRAFT ||
          cached.status === ProductStatus.HIDDEN)
      ) {
        throw new NotFoundException('상품을 찾을 수 없습니다.');
      }
      return this.applyLocale(cached, locale);
    }

    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.options', 'option')
      .leftJoinAndSelect('product.images', 'image')
      .leftJoinAndSelect('product.detailImages', 'detailImage')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.id = :id', { id })
      .getOne();

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    if (
      !isAdmin &&
      (product.status === ProductStatus.DRAFT ||
        product.status === ProductStatus.HIDDEN)
    ) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    await this.cacheService.set(cacheKey, product, CACHE_TTL_DETAIL);

    void this.productRepository.increment({ id }, 'viewCount', 1).catch((err: Error) =>
      this.logger.warn(`view_count increment failed: ${err.message}`),
    );

    const localized = this.applyLocale(product, locale);
    const statsMap = await this.getReviewStats([id]);
    const itemsWithStats = this.applyReviewStats([localized], statsMap);
    return itemsWithStats[0];
  }

  async findBulk(
    ids: number[],
    isAdmin = false,
    locale?: string,
  ): Promise<(Product & { rating: number; reviewCount: number })[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    const cacheKey = getProductBulkCacheKey(ids);
    const cached = await this.cacheService.get<
      (Product & { rating: number; reviewCount: number })[]
    >(cacheKey);

    if (cached) {
      const localized = cached.map((product) => this.applyLocale(product, locale));
      return localized as (Product & { rating: number; reviewCount: number })[];
    }

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.is_thumbnail = :isThumbnail',
        {
          isThumbnail: true,
        },
      )
      .where('product.id IN (:...ids)', { ids })
      .getMany();

    const filtered = isAdmin
      ? products
      : products.filter((product) => product.status === ProductStatus.ACTIVE);

    const localizedItems = filtered.map((product) => this.applyLocale(product, locale));
    const statsMap = await this.getReviewStats(
      localizedItems.map((product) => Number(product.id)),
    );
    const itemsWithStats = this.applyReviewStats(localizedItems, statsMap);

    await this.cacheService.set(cacheKey, itemsWithStats, CACHE_TTL_DETAIL);
    return itemsWithStats;
  }

  async autocomplete(q: string): Promise<{ id: number; name: string; slug: string }[]> {
    if (!q || q.length < 2) {
      return [];
    }

    const results = await this.productRepository
      .createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.slug'])
      .where('p.name LIKE :q', { q: `${q}%` })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .limit(10)
      .getMany();

    return results.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
    }));
  }

  private async getReviewStats(
    productIds: number[],
  ): Promise<Map<number, { rating: number; reviewCount: number }>> {
    if (!productIds.length) {
      return new Map();
    }

    const stats = await this.reviewRepository
      .createQueryBuilder('review')
      .select('review.product_id', 'productId')
      .addSelect('AVG(review.rating)', 'avgRating')
      .addSelect('COUNT(review.id)', 'reviewCount')
      .where('review.product_id IN (:...productIds)', { productIds })
      .andWhere('review.is_visible = :visible', { visible: true })
      .groupBy('review.product_id')
      .getRawMany<{ productId: string; avgRating: string; reviewCount: string }>();

    const map = new Map<number, { rating: number; reviewCount: number }>();
    for (const row of stats) {
      map.set(parseInt(row.productId, 10), {
        rating: row.avgRating ? parseFloat(parseFloat(row.avgRating).toFixed(1)) : 0,
        reviewCount: parseInt(row.reviewCount, 10),
      });
    }
    return map;
  }

  private applyReviewStats<T extends { id: number }>(
    items: T[],
    statsMap: Map<number, { rating: number; reviewCount: number }>,
  ): (T & { rating: number; reviewCount: number })[] {
    return items.map((item) => {
      const stats = statsMap.get(Number(item.id)) ?? { rating: 0, reviewCount: 0 };
      return { ...item, rating: stats.rating, reviewCount: stats.reviewCount };
    });
  }

  private applyLocale(product: Product, locale?: string): Product {
    const localized = applyLocale(product, locale, [
      'name',
      'description',
      'shortDescription',
    ]);
    if (locale && locale !== 'ko' && localized.category) {
      localized.category = applyLocale(localized.category, locale, ['name']);
    }
    return localized;
  }

  private async preResolveFilterData(query: QueryProductsDto): Promise<{
    categoryIds: number[] | undefined;
    attrTypeIdMap: Map<string, number>;
  }> {
    const { categoryId, attrs: attrsParam } = query;

    const categoryIds =
      categoryId !== undefined
        ? await this.resolveCategoryIds(categoryId)
        : undefined;

    const attrFilters = this.parseAttrsParam(attrsParam);
    const attrTypeIdMap =
      attrFilters.size > 0
        ? await this.resolveAttributeTypeIds(Array.from(attrFilters.keys()))
        : new Map<string, number>();

    return { categoryIds, attrTypeIdMap };
  }

  private buildBaseQueryBuilder(
    isAdmin: boolean,
    status?: ProductStatus,
  ): SelectQueryBuilder<Product> {
    return this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.is_thumbnail = :isThumbnail',
        { isThumbnail: true },
      )
      .andWhere('product.status = :status', {
        status: isAdmin && status ? status : ProductStatus.ACTIVE,
      });
  }

  private applyFiltersAndSort(
    qb: SelectQueryBuilder<Product>,
    query: QueryProductsDto,
    categoryIds: number[] | undefined,
    attrTypeIdMap: Map<string, number>,
  ): void {
    const { isFeatured, price_min, price_max, sort, attrs: attrsParam } = query;

    if (categoryIds !== undefined) {
      qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (isFeatured !== undefined) {
      qb.andWhere('product.isFeatured = :isFeatured', { isFeatured });
    }

    if (price_min !== undefined) {
      qb.andWhere('product.price >= :priceMin', { priceMin: price_min });
    }

    if (price_max !== undefined) {
      qb.andWhere('product.price <= :priceMax', { priceMax: price_max });
    }

    const attrFilters = this.parseAttrsParam(attrsParam);
    if (attrFilters.size > 0) {
      let attrIndex = 0;
      for (const [code, value] of attrFilters) {
        const typeId = attrTypeIdMap.get(code);
        if (typeId === undefined) {
          continue;
        }

        const alias = `pa_${attrIndex}`;
        qb.innerJoin(
          'product.attributes',
          alias,
          `${alias}.attributeTypeId = :typeId${attrIndex} AND ${alias}.value = :attrValue${attrIndex}`,
          {
            [`typeId${attrIndex}`]: typeId,
            [`attrValue${attrIndex}`]: value,
          },
        );
        attrIndex++;
      }
    }

    this.applySortOrder(qb, sort ?? ProductSort.LATEST);
  }

  private applySortOrder(
    qb: SelectQueryBuilder<Product>,
    sort: ProductSort,
  ): void {
    switch (sort) {
      case ProductSort.PRICE_ASC:
        qb.orderBy('product.price', 'ASC');
        break;
      case ProductSort.PRICE_DESC:
        qb.orderBy('product.price', 'DESC');
        break;
      case ProductSort.POPULAR:
        qb.orderBy('product.viewCount', 'DESC');
        break;
      case ProductSort.REVIEW_COUNT:
        qb.orderBy('product.reviewCount', 'DESC')
          .addOrderBy('product.createdAt', 'DESC');
        break;
      case ProductSort.RATING:
        qb.orderBy('product.avgRating', 'DESC')
          .addOrderBy('product.reviewCount', 'DESC')
          .addOrderBy('product.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }
  }

  private async executeFindAll(
    qb: SelectQueryBuilder<Product>,
    page: number,
    limit: number,
    sort: ProductSort,
    locale?: string,
    cacheKey?: string,
  ) {
    const paged = await paginate(qb, { page, limit });
    const localizedItems = paged.items.map((product) =>
      this.applyLocale(product, locale),
    );
    const statsMap = await this.getReviewStats(
      localizedItems.map((product) => Number(product.id)),
    );
    const itemsWithStats = this.applyReviewStats(localizedItems, statsMap);

    const result = { ...paged, items: itemsWithStats };
    if (cacheKey) {
      await this.cacheService.set(cacheKey, result, CACHE_TTL_LIST);
    }
    return result;
  }

  private async executeFindAllWithLikeFallback(
    query: QueryProductsDto,
    isAdmin: boolean,
    page: number,
    limit: number,
    sort: ProductSort,
    categoryIds: number[] | undefined,
    attrTypeIdMap: Map<string, number>,
    locale?: string,
    cacheKey?: string,
  ) {
    const { status, q } = query;

    const likeQb = this.buildBaseQueryBuilder(
      isAdmin,
      status as ProductStatus | undefined,
    );

    if (q) {
      likeQb.andWhere('product.name LIKE :q', { q: `%${q}%` });
    }

    this.applyFiltersAndSort(likeQb, query, categoryIds, attrTypeIdMap);

    return this.executeFindAll(likeQb, page, limit, sort, locale, cacheKey);
  }

  private async resolveCategoryIds(categoryId: number): Promise<number[]> {
    const children = await this.categoryRepository.find({
      where: { parentId: categoryId },
    });
    const childIds = children.map((category) => Number(category.id));
    return [categoryId, ...childIds];
  }

  private parseAttrsParam(attrs?: string): Map<string, string> {
    const result = new Map<string, string>();
    if (!attrs) {
      return result;
    }

    const pairs = attrs.split(',');
    for (const pair of pairs) {
      const [code, value] = pair.split(':');
      if (code && value) {
        result.set(code.trim(), value.trim());
      }
    }
    return result;
  }

  private async resolveAttributeTypeIds(codes: string[]): Promise<Map<string, number>> {
    if (!codes.length) {
      return new Map();
    }

    const types = await this.attributeTypeRepository
      .createQueryBuilder('at')
      .where('at.code IN (:...codes)', { codes })
      .getMany();

    const map = new Map<string, number>();
    for (const type of types) {
      map.set(type.code, type.id);
    }
    return map;
  }
}
