import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { Product, ProductStatus } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductDetailImage } from './entities/product-detail-image.entity';
import { Review } from '../reviews/entities/review.entity';
import { QueryProductsDto, ProductSort } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CacheService } from '../cache/cache.service';
import { findOrThrow } from '../../common/utils/repository.util';
import { applyLocale } from '../../common/utils/locale.util';
import { paginate } from '../../common/utils/pagination.util';

const CACHE_TTL_LIST = 300;
const CACHE_TTL_DETAIL = 600;

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    @InjectRepository(ProductDetailImage)
    private readonly productDetailImageRepository: Repository<ProductDetailImage>,
    private readonly cacheService: CacheService,
  ) {}

  private async getReviewStats(productIds: number[]): Promise<Map<number, { rating: number; reviewCount: number }>> {
    if (!productIds.length) return new Map();

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

  private applyReviewStats<T extends { id: number }>(items: T[], statsMap: Map<number, { rating: number; reviewCount: number }>): (T & { rating: number; reviewCount: number })[] {
    return items.map((item) => {
      const stats = statsMap.get(Number(item.id)) ?? { rating: 0, reviewCount: 0 };
      return { ...item, rating: stats.rating, reviewCount: stats.reviewCount };
    });
  }

  private async resolveCategoryIds(categoryId: number): Promise<number[]> {
    const children = await this.categoryRepository.find({ where: { parentId: categoryId } });
    const childIds = children.map((c) => Number(c.id));
    return [categoryId, ...childIds];
  }

  private buildListCacheKey(query: QueryProductsDto, isAdmin: boolean): string {
    const hash = Buffer.from(JSON.stringify({ ...query, isAdmin })).toString('base64');
    return `products:list:${hash}`;
  }

  private applyLocale(product: Product, locale?: string): Product {
    return applyLocale(product, locale, ['name', 'description', 'shortDescription']);
  }

  async findAll(
    query: QueryProductsDto,
    isAdmin = false,
  ): Promise<{ items: (Product & { rating: number; reviewCount: number })[]; total: number; page: number; limit: number }> {
    const cacheKey = this.buildListCacheKey(query, isAdmin);
    const cached = await this.cacheService.get<{ items: (Product & { rating: number; reviewCount: number })[]; total: number; page: number; limit: number }>(cacheKey);
    if (cached) return cached;

    const {
      page = 1,
      limit = 20,
      sort = ProductSort.LATEST,
      categoryId,
      q,
      status,
      isFeatured,
      price_min,
      price_max,
      locale,
    } = query;

    if (price_min !== undefined && price_max !== undefined && price_min > price_max) {
      throw new BadRequestException('price_min은 price_max보다 클 수 없습니다.');
    }

    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect(
        'product.images',
        'image',
        'image.is_thumbnail = :isThumbnail',
        { isThumbnail: true },
      );

    // 비관리자는 status 파라미터 무시하고 active만 반환
    if (isAdmin && status) {
      qb.andWhere('product.status = :status', { status });
    } else {
      qb.andWhere('product.status = :status', { status: ProductStatus.ACTIVE });
    }

    if (categoryId !== undefined) {
      const categoryIds = await this.resolveCategoryIds(categoryId);
      qb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds });
    }

    if (q) {
      // FULLTEXT search with ngram parser for Korean/CJK support; LIKE fallback for short terms
      if (q.length >= 2) {
        qb.andWhere('MATCH(product.name) AGAINST(:q IN BOOLEAN MODE)', { q });
      } else {
        qb.andWhere('product.name LIKE :q', { q: `%${q}%` });
      }
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
        qb.orderBy(
          `(SELECT COUNT(*) FROM \`review\` r WHERE r.product_id = product.id AND r.is_visible = true)`,
          'DESC',
        );
        break;
      case ProductSort.RATING:
        qb.orderBy(
          `(SELECT AVG(r.rating) FROM \`review\` r WHERE r.product_id = product.id AND r.is_visible = true)`,
          'DESC',
        );
        break;
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }

    try {
      const paged = await paginate(qb, { page, limit });
      const localizedItems = paged.items.map((p) => this.applyLocale(p, locale));
      const statsMap = await this.getReviewStats(localizedItems.map((p) => Number(p.id)));
      const itemsWithStats = this.applyReviewStats(localizedItems, statsMap);
      const result = { ...paged, items: itemsWithStats };
      await this.cacheService.set(cacheKey, result, CACHE_TTL_LIST);
      return result;
    } catch (err) {
      // FULLTEXT 인덱스 미설치 시 LIKE fallback
      if (
        err instanceof QueryFailedError &&
        q &&
        q.length >= 2 &&
        (err as QueryFailedError & { errno?: number }).errno === 1191
      ) {
        this.logger.warn('FULLTEXT index missing — falling back to LIKE search');
        qb.setParameter('q', q);
        // MATCH...AGAINST 조건을 LIKE로 교체
        const likeQb = this.productRepository
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
          })
          .andWhere('product.name LIKE :q', { q: `%${q}%` });

        if (categoryId !== undefined) {
          const categoryIds = await this.resolveCategoryIds(categoryId);
          likeQb.andWhere('product.categoryId IN (:...categoryIds)', { categoryIds });
        }
        if (isFeatured !== undefined) likeQb.andWhere('product.isFeatured = :isFeatured', { isFeatured });
        if (price_min !== undefined) likeQb.andWhere('product.price >= :priceMin', { priceMin: price_min });
        if (price_max !== undefined) likeQb.andWhere('product.price <= :priceMax', { priceMax: price_max });

        switch (sort) {
          case ProductSort.PRICE_ASC: likeQb.orderBy('product.price', 'ASC'); break;
          case ProductSort.PRICE_DESC: likeQb.orderBy('product.price', 'DESC'); break;
          case ProductSort.POPULAR: likeQb.orderBy('product.viewCount', 'DESC'); break;
          case ProductSort.REVIEW_COUNT:
            likeQb.orderBy(
              `(SELECT COUNT(*) FROM \`review\` r WHERE r.product_id = product.id AND r.is_visible = true)`,
              'DESC',
            );
            break;
          case ProductSort.RATING:
            likeQb.orderBy(
              `(SELECT AVG(r.rating) FROM \`review\` r WHERE r.product_id = product.id AND r.is_visible = true)`,
              'DESC',
            );
            break;
          default: likeQb.orderBy('product.createdAt', 'DESC');
        }
        const paged = await paginate(likeQb, { page, limit });
        const localizedItems = paged.items.map((p) => this.applyLocale(p, locale));
        const statsMap = await this.getReviewStats(localizedItems.map((p) => Number(p.id)));
        const itemsWithStats = this.applyReviewStats(localizedItems, statsMap);
        const result = { ...paged, items: itemsWithStats };
        await this.cacheService.set(cacheKey, result, CACHE_TTL_LIST);
        return result;
      }
      throw err;
    }
  }

  async findOne(id: number, isAdmin = false, locale?: string): Promise<Product> {
    const cacheKey = `products:detail:${id}`;
    const cached = await this.cacheService.get<Product>(cacheKey);
    if (cached) {
      if (
        !isAdmin &&
        (cached.status === ProductStatus.DRAFT || cached.status === ProductStatus.HIDDEN)
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

    // fire-and-forget view count increment
    void this.productRepository
      .increment({ id }, 'viewCount', 1)
      .catch((err: Error) =>
        this.logger.warn(`view_count increment failed: ${err.message}`),
      );

    const localized = this.applyLocale(product, locale);
    const statsMap = await this.getReviewStats([id]);
    const itemsWithStats = this.applyReviewStats([localized], statsMap);
    return itemsWithStats[0];
  }

  private async findById(id: number): Promise<Product> {
    return findOrThrow(this.productRepository, { id }, '상품을 찾을 수 없습니다.');
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { images, detailImages, ...productData } = dto;
    const product = this.productRepository.create({
      ...productData,
      categoryId: dto.categoryId ?? null,
      salePrice: dto.salePrice ?? null,
      sku: dto.sku ?? null,
    });

    try {
      const saved = await this.productRepository.save(product);

      if (images && images.length > 0) {
        const imageEntities = images.map((img, index) =>
          this.productImageRepository.create({
            productId: saved.id,
            url: img.url,
            alt: img.alt ?? null,
            sortOrder: img.sortOrder ?? index,
            isThumbnail: img.isThumbnail ?? index === 0,
          }),
        );
        await this.productImageRepository.save(imageEntities);
      }

      if (detailImages && detailImages.length > 0) {
        const detailEntities = detailImages.map((img, index) =>
          this.productDetailImageRepository.create({
            productId: saved.id,
            url: img.url,
            alt: img.alt ?? null,
            sortOrder: img.sortOrder ?? index,
            isActive: true,
          }),
        );
        await this.productDetailImageRepository.save(detailEntities);
      }

      return saved;
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as Error & { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('slug 또는 sku가 이미 존재합니다.');
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const { images, detailImages, ...productData } = dto;
    const product = await this.findById(id);
    Object.assign(product, productData);

    try {
      const saved = await this.productRepository.save(product);

      if (images !== undefined) {
        await this.productImageRepository.delete({ productId: id });
        if (images && images.length > 0) {
          const imageEntities = images.map((img, index) =>
            this.productImageRepository.create({
              productId: id,
              url: img.url,
              alt: img.alt ?? null,
              sortOrder: img.sortOrder ?? index,
              isThumbnail: img.isThumbnail ?? index === 0,
            }),
          );
          await this.productImageRepository.save(imageEntities);
        }
      }

      if (detailImages !== undefined) {
        await this.productDetailImageRepository.delete({ productId: id });
        if (detailImages && detailImages.length > 0) {
          const detailEntities = detailImages.map((img, index) =>
            this.productDetailImageRepository.create({
              productId: id,
              url: img.url,
              alt: img.alt ?? null,
              sortOrder: img.sortOrder ?? index,
              isActive: true,
            }),
          );
          await this.productDetailImageRepository.save(detailEntities);
        }
      }

      await Promise.all([
        this.cacheService.del(`products:detail:${id}`),
        this.cacheService.delPattern('products:list:*'),
      ]);
      return saved;
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as Error & { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('slug 또는 sku가 이미 존재합니다.');
      }
      throw err;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
    await Promise.all([
      this.cacheService.del(`products:detail:${id}`),
      this.cacheService.delPattern('products:list:*'),
    ]);
    return { message: '삭제되었습니다.' };
  }

  async findBulk(ids: number[], isAdmin = false, locale?: string): Promise<(Product & { rating: number; reviewCount: number })[]> {
    if (!ids || ids.length === 0) return [];

    const cacheKey = `products:bulk:${ids.sort().join(',')}`;
    const cached = await this.cacheService.get<(Product & { rating: number; reviewCount: number })[]>(cacheKey);
    if (cached) {
      const localized = cached.map((p) => this.applyLocale(p, locale));
      return localized as (Product & { rating: number; reviewCount: number })[];
    }

    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'image', 'image.is_thumbnail = :isThumbnail', {
        isThumbnail: true,
      })
      .where('product.id IN (:...ids)', { ids })
      .getMany();

    let filtered = products;
    if (!isAdmin) {
      filtered = products.filter((p) => p.status === ProductStatus.ACTIVE);
    }

    const localizedItems = filtered.map((p) => this.applyLocale(p, locale));
    const statsMap = await this.getReviewStats(localizedItems.map((p) => Number(p.id)));
    const itemsWithStats = this.applyReviewStats(localizedItems, statsMap);

    await this.cacheService.set(cacheKey, itemsWithStats, CACHE_TTL_DETAIL);
    return itemsWithStats;
  }

  async autocomplete(q: string): Promise<{ id: number; name: string; slug: string }[]> {
    if (!q || q.length < 2) return [];

    const results = await this.productRepository
      .createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.slug'])
      .where('p.name LIKE :q', { q: `${q}%` })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .limit(10)
      .getMany();

    return results.map((p) => ({ id: p.id, name: p.name, slug: p.slug }));
  }
}
