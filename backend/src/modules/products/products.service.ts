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
import { QueryProductsDto, ProductSort } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CacheService } from '../cache/cache.service';

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
    private readonly cacheService: CacheService,
  ) {}

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
    if (!locale || locale === 'ko') return product;
    const localeMap: Record<string, 'En' | 'Ja' | 'Zh'> = { en: 'En', ja: 'Ja', zh: 'Zh' };
    const suffix = localeMap[locale];
    if (!suffix) return product;

    const nameKey = `name${suffix}` as keyof Product;
    const descKey = `description${suffix}` as keyof Product;
    const shortDescKey = `shortDescription${suffix}` as keyof Product;

    return {
      ...product,
      name: (product[nameKey] as string | null) ?? product.name,
      description: (product[descKey] as string | null) ?? product.description,
      shortDescription: (product[shortDescKey] as string | null) ?? product.shortDescription,
    };
  }

  async findAll(
    query: QueryProductsDto,
    isAdmin = false,
  ): Promise<{ items: Product[]; total: number; page: number; limit: number }> {
    const cacheKey = this.buildListCacheKey(query, isAdmin);
    const cached = await this.cacheService.get<{ items: Product[]; total: number; page: number; limit: number }>(cacheKey);
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
      default:
        qb.orderBy('product.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    try {
      const [items, total] = await qb.getManyAndCount();
      const result = { items: items.map((p) => this.applyLocale(p, locale)), total, page, limit };
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
          default: likeQb.orderBy('product.createdAt', 'DESC');
        }
        likeQb.skip((page - 1) * limit).take(limit);

        const [items, total] = await likeQb.getManyAndCount();
        const result = { items: items.map((p) => this.applyLocale(p, locale)), total, page, limit };
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

    return this.applyLocale(product, locale);
  }

  private async findById(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      ...dto,
      categoryId: dto.categoryId ?? null,
      salePrice: dto.salePrice ?? null,
      sku: dto.sku ?? null,
    });

    try {
      return await this.productRepository.save(product);
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
    const product = await this.findById(id);
    Object.assign(product, dto);

    try {
      const saved = await this.productRepository.save(product);
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
