import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, ObjectLiteral, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductDetailImage } from './entities/product-detail-image.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RestockAlertsService } from '../restock-alerts/restock-alerts.service';
import { CacheService } from '../cache/cache.service';
import { findOrThrow } from '../../common/utils/repository.util';
import {
  getProductDetailCacheKey,
  PRODUCT_LIST_CACHE_PATTERN,
} from './product-cache.util';

@Injectable()
export class ProductCommandService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
    private readonly restockAlertsService: RestockAlertsService,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const { images, detailImages, ...productData } = dto;

    try {
      return await this.dataSource.transaction(async (manager: EntityManager) => {
        const product = manager.create(Product, {
          ...productData,
          categoryId: dto.categoryId ?? null,
          salePrice: dto.salePrice ?? null,
          sku: dto.sku ?? null,
        });
        const saved = await manager.save(product);

        if (images !== undefined) {
          await this.upsertMediaEntities({
            manager,
            entityClass: ProductImage,
            productId: saved.id,
            items: images,
            replaceExisting: false,
            mapInputToEntity: (image, index) => ({
              productId: saved.id,
              url: image.url,
              alt: image.alt ?? null,
              sortOrder: image.sortOrder ?? index,
              isThumbnail: image.isThumbnail ?? index === 0,
            }),
          });
        }

        if (detailImages !== undefined) {
          await this.upsertMediaEntities({
            manager,
            entityClass: ProductDetailImage,
            productId: saved.id,
            items: detailImages,
            replaceExisting: false,
            mapInputToEntity: (detailImage, index) => ({
              productId: saved.id,
              url: detailImage.url,
              alt: detailImage.alt ?? null,
              sortOrder: detailImage.sortOrder ?? index,
              isActive: true,
            }),
          });
        }

        return saved;
      });
    } catch (err) {
      this.rethrowIfDuplicateKey(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const { images, detailImages, ...productData } = dto;
    const product = await this.findById(id);
    const previousStock = product.stock;
    Object.assign(product, productData);

    try {
      const saved = await this.dataSource.transaction(async (manager: EntityManager) => {
        const updatedProduct = await manager.save(product);

        if (images !== undefined) {
          await this.upsertMediaEntities({
            manager,
            entityClass: ProductImage,
            productId: id,
            items: images,
            replaceExisting: true,
            mapInputToEntity: (image, index) => ({
              productId: id,
              url: image.url,
              alt: image.alt ?? null,
              sortOrder: image.sortOrder ?? index,
              isThumbnail: image.isThumbnail ?? index === 0,
            }),
          });
        }

        if (detailImages !== undefined) {
          await this.upsertMediaEntities({
            manager,
            entityClass: ProductDetailImage,
            productId: id,
            items: detailImages,
            replaceExisting: true,
            mapInputToEntity: (detailImage, index) => ({
              productId: id,
              url: detailImage.url,
              alt: detailImage.alt ?? null,
              sortOrder: detailImage.sortOrder ?? index,
              isActive: true,
            }),
          });
        }

        return updatedProduct;
      });

      await this.invalidateProductCache(id);

      if (dto.stock !== undefined) {
        await this.restockAlertsService.processProductRestock(
          id,
          previousStock,
          saved.stock,
        );
      }

      return saved;
    } catch (err) {
      this.rethrowIfDuplicateKey(err);
      throw err;
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findById(id);
    await this.productRepository.remove(product);
    await this.invalidateProductCache(id);
    return { message: '삭제되었습니다.' };
  }

  private async findById(id: number): Promise<Product> {
    return findOrThrow(this.productRepository, { id }, '상품을 찾을 수 없습니다.');
  }

  private async invalidateProductCache(productId: number): Promise<void> {
    await Promise.all([
      this.cacheService.del(getProductDetailCacheKey(productId)),
      this.cacheService.delPattern(PRODUCT_LIST_CACHE_PATTERN),
    ]);
  }

  private async upsertMediaEntities<TInput>(params: {
    manager: EntityManager;
    entityClass: new () => ObjectLiteral;
    productId: number;
    items: TInput[];
    replaceExisting: boolean;
    mapInputToEntity: (item: TInput, index: number) => ObjectLiteral;
  }): Promise<void> {
    const {
      manager,
      entityClass,
      productId,
      items,
      replaceExisting,
      mapInputToEntity,
    } = params;

    if (replaceExisting) {
      await manager.delete(entityClass, { productId });
    }

    if (!items || items.length === 0) {
      return;
    }

    const entities = items.map((item, index) => manager.create(entityClass, mapInputToEntity(item, index)));
    await manager.save(entityClass, entities);
  }

  private rethrowIfDuplicateKey(err: unknown): void {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Error & { code: string }).code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('slug 또는 sku가 이미 존재합니다.');
    }
  }
}
