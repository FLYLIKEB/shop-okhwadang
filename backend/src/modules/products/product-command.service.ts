import {
  ConflictException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, ObjectLiteral, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductDetailImage } from './entities/product-detail-image.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductAttribute } from './entities/product-attribute.entity';
import { CreateProductDto, ProductOptionInputDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SetProductAttributeItemDto } from './dto/product-attribute.dto';
import { RestockAlertsService } from '../restock-alerts/restock-alerts.service';
import { CacheService } from '../cache/cache.service';
import { findOrThrow } from '../../common/utils/repository.util';
import {
  PRODUCT_BULK_CACHE_PATTERN,
  PRODUCT_DETAIL_CACHE_PATTERN,
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

  private assertUsdPrices(product: { priceUsd?: number | null; salePriceUsd?: number | null }): void {
    if (product.salePriceUsd != null && (product.priceUsd == null || Number(product.salePriceUsd) >= Number(product.priceUsd))) {
      throw new BadRequestException('달러 할인가는 달러 판매가보다 낮게 입력해 주세요.');
    }
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const { images, detailImages, options, attributes, ...productData } = dto;
    this.assertUsdPrices(dto);
    this.normalizePreOrder(productData);

    try {
      const saved = await this.dataSource.transaction(async (manager: EntityManager) => {
        const product = manager.create(Product, {
          ...productData,
          categoryId: dto.categoryId ?? null,
          salePrice: dto.salePrice ?? null,
          priceUsd: dto.priceUsd ?? null,
          salePriceUsd: dto.salePriceUsd ?? null,
          sku: dto.sku?.trim() ? dto.sku : null,
          isVisibleKo: dto.isVisibleKo ?? true,
          isVisibleEn: dto.isVisibleEn ?? false,
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
              thumbnailUrl: image.thumbnailUrl ?? null,
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

        if (options !== undefined) {
          await this.syncProductOptions(manager, saved.id, options);
        }

        if (attributes !== undefined) {
          await this.syncProductAttributes(manager, saved.id, attributes);
        }

        return saved;
      });
      await this.invalidateProductListCache();
      return saved;
    } catch (err) {
      this.rethrowIfDuplicateKey(err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const { images, detailImages, options, attributes, ...productData } = dto;
    const product = await this.findById(id);
    const previousStock = product.stock;
    if (typeof productData.sku === 'string' && productData.sku.trim() === '') productData.sku = null;
    Object.assign(product, productData);
    if (dto.priceUsd === null) product.salePriceUsd = null;
    this.assertUsdPrices(product);
    this.normalizePreOrder(product);
    let optionRestocks: { id: number; previousStock: number; nextStock: number }[] = [];

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
              thumbnailUrl: image.thumbnailUrl ?? null,
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

        if (options !== undefined) {
          optionRestocks = await this.syncProductOptions(manager, id, options);
        }

        if (attributes !== undefined) {
          await this.syncProductAttributes(manager, id, attributes);
        }

        return updatedProduct;
      });

      await this.invalidateProductCache();

      if (dto.stock !== undefined) {
        await this.restockAlertsService.processProductRestock(
          id,
          previousStock,
          saved.stock,
        );
      }

      for (const option of optionRestocks) {
        await this.restockAlertsService.processProductRestock(
          id, option.previousStock, option.nextStock, option.id,
        );
      }

      return saved;
    } catch (err) {
      this.rethrowIfDuplicateKey(err);
      throw err;
    }
  }

  private normalizePreOrder(product: Partial<Product>): void {
    if (product.isPreOrder !== undefined && typeof product.isPreOrder !== 'boolean') {
      throw new BadRequestException('예약구매 여부는 불리언이어야 합니다.');
    }
    if (!product.isPreOrder) {
      product.preOrderShippingDate = null;
      return;
    }
    const date = product.preOrderShippingDate;
    const parsed = typeof date === 'string' ? new Date(`${date}T00:00:00Z`) : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('예약구매 상품의 유효한 발송 예정일을 입력해 주세요.');
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findById(id);
    try {
      await this.productRepository.remove(product);
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new BadRequestException('장바구니 또는 주문 등에서 사용 중인 상품은 삭제할 수 없습니다. 상품을 숨김 처리해 주세요.');
      }
      throw error;
    }
    await this.invalidateProductCache();
    return { message: '삭제되었습니다.' };
  }

  private async findById(id: number): Promise<Product> {
    return findOrThrow(this.productRepository, { id }, '상품을 찾을 수 없습니다.');
  }

  private async invalidateProductCache(): Promise<void> {
    await Promise.all([
      this.cacheService.delPattern(PRODUCT_DETAIL_CACHE_PATTERN),
      this.cacheService.delPattern(PRODUCT_LIST_CACHE_PATTERN),
      this.cacheService.delPattern(PRODUCT_BULK_CACHE_PATTERN),
    ]);
  }

  private async invalidateProductListCache(): Promise<void> {
    await Promise.all([
      this.cacheService.delPattern(PRODUCT_LIST_CACHE_PATTERN),
      this.cacheService.delPattern(PRODUCT_BULK_CACHE_PATTERN),
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

  private async syncProductOptions(
    manager: EntityManager,
    productId: number,
    options: ProductOptionInputDto[],
  ): Promise<{ id: number; previousStock: number; nextStock: number }[]> {
    const existing = await manager.find(ProductOption, { where: { productId } });
    const existingByKey = new Map(existing.map((option) => [`${option.name}\u0000${option.value}`, option]));
    const existingById = new Map(existing.map((option) => [Number(option.id), option]));
    const matchedIds = new Set<number>();
    const inputKeys = new Set<string>();
    const toSave: ProductOption[] = [];
    const restocks: { id: number; previousStock: number; nextStock: number }[] = [];

    options.forEach((input, index) => {
      const key = `${input.name}\u0000${input.value}`;
      if (inputKeys.has(key)) {
        throw new BadRequestException('중복된 상품 옵션입니다.');
      }
      inputKeys.add(key);
      const matched = input.id !== undefined
        ? existingById.get(Number(input.id))
        : existingByKey.get(key);
      if (input.id !== undefined && !matched) {
        throw new BadRequestException('해당 상품에 속하지 않는 옵션 ID입니다.');
      }
      if (matched) {
        const matchedId = Number(matched.id);
        if (matchedIds.has(matchedId)) {
          throw new BadRequestException('중복된 상품 옵션 ID입니다.');
        }
        matchedIds.add(matchedId);
        const nextStock = input.stock ?? 0;
        if (matched.stock <= 0 && nextStock > 0) {
          restocks.push({ id: matchedId, previousStock: matched.stock, nextStock });
        }
        matched.name = input.name;
        matched.value = input.value;
        matched.priceAdjustment = input.priceAdjustment ?? 0;
        matched.stock = input.stock ?? 0;
        matched.sortOrder = input.sortOrder ?? index;
        toSave.push(matched);
        return;
      }
      toSave.push(manager.create(ProductOption, {
        productId,
        name: input.name,
        value: input.value,
        priceAdjustment: input.priceAdjustment ?? 0,
        stock: input.stock ?? 0,
        sortOrder: input.sortOrder ?? index,
      }));
    });

    const removedIds = existing.filter((option) => !matchedIds.has(Number(option.id))).map((option) => option.id);
    if (removedIds.length > 0) {
      try {
        await manager.delete(ProductOption, { id: In(removedIds) });
      } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ER_ROW_IS_REFERENCED_2') {
          throw new BadRequestException('장바구니 또는 주문에서 사용 중인 옵션은 삭제할 수 없습니다.');
        }
        throw error;
      }
    }
    if (toSave.length > 0) {
      await manager.save(ProductOption, toSave);
    }
    return restocks;
  }

  private async syncProductAttributes(
    manager: EntityManager,
    productId: number,
    attributes: SetProductAttributeItemDto[],
  ): Promise<void> {
    await manager.delete(ProductAttribute, { productId });

    if (!attributes.length) {
      return;
    }

    const entities = attributes.map((attr, index) =>
      manager.create(ProductAttribute, {
        productId,
        attributeTypeId: attr.attributeTypeId,
        value: attr.value,
        displayValue: attr.displayValue ?? attr.value,
        sortOrder: attr.sortOrder ?? index,
      }),
    );
    await manager.save(ProductAttribute, entities);
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
