import { Injectable } from '@nestjs/common';
import {
  CreateProductDto,
  ProductNoticeInfoType,
  ProductOptionInputDto,
} from './dto/create-product.dto';
import { ProductStatus } from './entities/product.entity';
import { NaverCommerceApiClient, NaverCommerceFetchedProduct } from './naver-commerce-api.client';
import {
  SmartStoreImportResult,
  SmartStoreParsedProductRow,
  SmartStoreProductImportService,
} from './smartstore-product-import.service';
import { resolveImportOptionsStock } from './product-import-stock.util';
import { buildNaverExternalProductKey } from '../../common/imports/external-source.util';

@Injectable()
export class NaverCommerceProductImportService {
  constructor(
    private readonly naverCommerceApiClient: NaverCommerceApiClient,
    private readonly smartStoreProductImportService: SmartStoreProductImportService,
  ) {}

  async preview(): Promise<SmartStoreImportResult> {
    return this.process(false);
  }

  async commit(): Promise<SmartStoreImportResult> {
    return this.process(true);
  }

  private async process(commit: boolean): Promise<SmartStoreImportResult> {
    const fetchedProducts = await this.naverCommerceApiClient.fetchProductsWithDetails();
    const parsedRows = fetchedProducts.map((product) => this.toParsedRow(product));
    const options = {
      unmatchedAction: 'create' as const,
    };
    return commit
      ? this.smartStoreProductImportService.commitParsedRows(parsedRows, options)
      : this.smartStoreProductImportService.previewParsedRows(parsedRows, options);
  }

  private toParsedRow(fetchedProduct: NaverCommerceFetchedProduct): SmartStoreParsedProductRow {
    const product = this.mergeProduct(fetchedProduct.listProduct, fetchedProduct.detailProduct);
    const errors = fetchedProduct.error ? [fetchedProduct.error] : [];
    const productName = this.firstString(product, [
      'originProduct.name',
      'name',
      'productName',
      'channelProducts.0.name',
      'channelProducts.0.productName',
    ]);
    const naverProductNumber = this.firstNumberLike(product, [
      'channelProducts.0.channelProductNo',
      'channelProducts.0.productNo',
      'originProduct.channelProducts.0.channelProductNo',
      'originProductNo',
      'originProduct.originProductNo',
    ]);
    const sellerCode = this.firstString(product, [
      'sellerManagementCode',
      'originProduct.sellerManagementCode',
      'originProduct.detailAttribute.sellerCodeInfo.sellerManagementCode',
      'originProduct.detailAttribute.sellerManagementCode',
      'detailAttribute.sellerCodeInfo.sellerManagementCode',
      'detailAttribute.sellerManagementCode',
      'channelProducts.0.sellerManagementCode',
      'channelProducts.0.sellerManagementCodeNo',
    ]);
    const identifier = this.buildIdentifier(sellerCode, naverProductNumber);
    const price = this.firstNumber(product, [
      'originProduct.salePrice',
      'salePrice',
      'channelProducts.0.salePrice',
      'channelProducts.0.price',
    ]);
    const rawStock = this.firstNumber(product, [
      'originProduct.stockQuantity',
      'stockQuantity',
      'originProduct.optionInfo.stockQuantity',
      'originProduct.detailAttribute.optionInfo.stockQuantity',
      'detailAttribute.optionInfo.stockQuantity',
      'channelProducts.0.stockQuantity',
    ]);
    const salePrice = this.resolveSalePrice(product, price);
    const description = this.firstString(product, [
      'originProduct.detailContent',
      'originProduct.description',
      'detailContent',
      'description',
    ]);
    const representativeImage = this.firstString(product, [
      'originProduct.images.representativeImage.url',
      'originProduct.images.representativeImageUrl',
      'representativeImage.url',
      'representativeImageUrl',
    ]);
    const galleryUrls = this.uniqueStrings([
      representativeImage,
      ...this.stringArray(product, [
        'originProduct.images.optionalImages.*.url',
        'originProduct.images.optionalImageUrls.*',
        'optionalImages.*.url',
        'additionalImages.*.url',
      ]),
    ]);
    const detailUrls = this.uniqueStrings(
      this.stringArray(product, [
        'originProduct.detailImages.*.url',
        'originProduct.detailImageUrls.*',
        'detailImages.*.url',
        'detailImageUrls.*',
      ]),
    );
    const noticeInfo = this.buildNoticeInfo(product, productName);
    const parsedOptions = this.buildOptions(product);
    const { options, stock, optionStockTotal, stockSource } = resolveImportOptionsStock(
      rawStock,
      parsedOptions,
    );

    if (!identifier) errors.push('네이버 상품번호 또는 판매자 상품코드가 필요합니다.');
    if (!productName) errors.push('네이버 상품명이 필요합니다.');
    if (price === null || price < 1) errors.push('네이버 판매가는 1원 이상이어야 합니다.');

    const dto: CreateProductDto | null =
      errors.length > 0 || !identifier || !productName || price === null
        ? null
        : {
            name: productName,
            slug: this.slugify(identifier),
            sku: identifier,
            price,
            salePrice: salePrice ?? undefined,
            stock: stock ?? 0,
            status: this.mapStatus(
              this.firstString(product, [
                'originProduct.statusType',
                'statusType',
                'channelProducts.0.statusType',
                'channelProducts.0.channelProductStatusType',
              ]),
              stock ?? 0,
            ),
            description: description || undefined,
            isFreeShipping: this.resolveFreeShipping(product),
            isVisibleKo: true,
            isVisibleEn: false,
            noticeInfo,
            images: this.buildImages(productName, galleryUrls),
            detailImages: detailUrls.map((url, index) => ({
              url,
              alt: productName,
              sortOrder: index,
            })),
            // 네이버 커머스 API는 원격 원본 전체 동기화이므로 옵션이 없으면 기존 로컬 자동 옵션을 제거한다.
            options: options ?? [],
          };

    if (dto?.detailImages?.length === 0) delete dto.detailImages;

    return {
      rowNumber: fetchedProduct.rowNumber,
      identifier,
      productName,
      dto,
      optionCount: options?.length ?? 0,
      galleryImageCount: galleryUrls.length,
      detailImageCount: detailUrls.length,
      price,
      salePrice: salePrice ?? null,
      hasDiscount: salePrice !== undefined && price !== null && salePrice < price,
      isFreeShipping: this.resolveFreeShipping(product) ?? null,
      hasNoticeInfo: Boolean(noticeInfo),
      stock,
      optionStockTotal,
      stockSource,
      errors,
    };
  }

  private mergeProduct(
    listProduct: Record<string, unknown>,
    detailProduct: Record<string, unknown> | null,
  ): Record<string, unknown> {
    return detailProduct ? { ...listProduct, ...detailProduct } : listProduct;
  }

  private buildIdentifier(
    sellerCode: string | null,
    originProductNo: string | null,
  ): string | null {
    const raw = sellerCode || buildNaverExternalProductKey(originProductNo ?? '') || '';
    const normalized = raw.trim();
    return normalized || null;
  }

  private resolveSalePrice(
    product: Record<string, unknown>,
    price: number | null,
  ): number | undefined {
    const discounted = this.firstNumber(product, [
      'originProduct.discountedSalePrice',
      'discountedSalePrice',
      'channelProducts.0.discountedSalePrice',
    ]);
    if (discounted !== null) return discounted;
    if (price === null) return undefined;

    const discountValue = this.firstNumber(product, [
      'originProduct.customerBenefit.immediateDiscountPolicy.discountMethod.value',
      'originProduct.detailAttribute.customerBenefit.immediateDiscountPolicy.discountMethod.value',
      'customerBenefit.immediateDiscountPolicy.discountMethod.value',
    ]);
    if (discountValue === null || discountValue <= 0) return undefined;
    const unit = this.firstString(product, [
      'originProduct.customerBenefit.immediateDiscountPolicy.discountMethod.unitType',
      'originProduct.detailAttribute.customerBenefit.immediateDiscountPolicy.discountMethod.unitType',
      'customerBenefit.immediateDiscountPolicy.discountMethod.unitType',
    ])?.toUpperCase();
    if (unit === 'PERCENT' || unit === 'PERCENTAGE' || unit === '%') {
      return Math.max(0, Math.round((price * (100 - discountValue)) / 100));
    }
    return Math.max(0, price - discountValue);
  }

  private resolveFreeShipping(product: Record<string, unknown>): boolean | undefined {
    const deliveryFeeType = this.firstString(product, [
      'originProduct.deliveryInfo.deliveryFee.deliveryFeeType',
      'originProduct.deliveryInfo.deliveryFeeType',
      'deliveryInfo.deliveryFee.deliveryFeeType',
      'deliveryFeeType',
    ])?.toUpperCase();
    if (deliveryFeeType) {
      if (deliveryFeeType.includes('FREE') || deliveryFeeType.includes('무료')) return true;
      if (
        deliveryFeeType.includes('PAID') ||
        deliveryFeeType.includes('CONDITIONAL') ||
        deliveryFeeType.includes('유료')
      )
        return false;
    }

    const baseFee = this.firstNumber(product, [
      'originProduct.deliveryInfo.deliveryFee.baseFee',
      'originProduct.deliveryInfo.baseFee',
      'deliveryInfo.deliveryFee.baseFee',
      'baseFee',
    ]);
    if (baseFee === 0) return true;
    if (baseFee !== null && baseFee > 0) return false;
    return undefined;
  }

  private buildNoticeInfo(
    product: Record<string, unknown>,
    productName: string | null,
  ): CreateProductDto['noticeInfo'] {
    const manufacturer = this.firstString(product, [
      'originProduct.detailAttribute.manufacturerName',
      'originProduct.manufacturerName',
      'manufacturerName',
    ]);
    const origin = this.firstString(product, [
      'originProduct.detailAttribute.originAreaInfo.content',
      'originProduct.originAreaInfo.content',
      'originAreaInfo.content',
      'origin',
    ]);
    const asPhone = this.firstString(product, [
      'originProduct.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber',
      'afterServiceInfo.afterServiceTelephoneNumber',
      'asPhone',
    ]);
    const asGuide = this.firstString(product, [
      'originProduct.detailAttribute.afterServiceInfo.afterServiceGuideContent',
      'afterServiceInfo.afterServiceGuideContent',
      'asGuide',
    ]);

    if (!manufacturer && !origin && !asPhone && !asGuide) return undefined;
    return {
      type: ProductNoticeInfoType.TEAWARE,
      productName: productName ?? undefined,
      manufacturer: manufacturer ?? undefined,
      countryOfOrigin: origin ?? undefined,
      origin: origin ?? undefined,
      asContact: asPhone ?? undefined,
      warrantyPolicy: asGuide ?? undefined,
    };
  }

  private buildOptions(product: Record<string, unknown>): ProductOptionInputDto[] | undefined {
    const combinations = this.firstArray(product, [
      'originProduct.optionInfo.optionCombinations',
      'originProduct.detailAttribute.optionInfo.optionCombinations',
      'optionInfo.optionCombinations',
      'detailAttribute.optionInfo.optionCombinations',
      'optionCombinations',
    ]);
    if (!combinations || combinations.length === 0) return undefined;

    const groupNames = this.resolveOptionGroupNames(product);
    const options: ProductOptionInputDto[] = [];
    for (const item of combinations) {
      if (!this.isRecord(item)) continue;
      const usable = this.firstExistingValue(item, ['usable', 'isUsable', 'useYn']);
      if (this.isNaverOptionDisabled(usable)) continue;
      const optionParts = this.resolveOptionValueParts(item);
      const optionValue = optionParts.join('/');
      if (!optionValue) continue;
      const optionName =
        groupNames.slice(0, optionParts.length).join('/') ||
        this.firstString(item, ['optionName', 'name']) ||
        '옵션';
      options.push({
        name: optionName,
        value: optionValue,
        priceAdjustment: this.firstNumber(item, ['price', 'priceAdjustment', 'optionPrice']) ?? 0,
        stock: this.firstNumber(item, ['stockQuantity', 'stock']) ?? 0,
        sortOrder: options.length,
      });
    }

    return options.length > 0 ? options : undefined;
  }

  private resolveOptionGroupNames(product: Record<string, unknown>): string[] {
    const groupRecord = this.firstRecord(product, [
      'originProduct.detailAttribute.optionInfo.optionCombinationGroupNames',
      'originProduct.optionInfo.optionCombinationGroupNames',
      'detailAttribute.optionInfo.optionCombinationGroupNames',
      'optionInfo.optionCombinationGroupNames',
      'optionCombinationGroupNames',
    ]);
    if (!groupRecord) return [];
    return [1, 2, 3, 4]
      .map((index) => this.firstString(groupRecord, [`optionGroupName${index}`]))
      .filter((value): value is string => Boolean(value));
  }

  private resolveOptionValueParts(item: Record<string, unknown>): string[] {
    const explicit = this.firstString(item, ['optionValue', 'value']);
    if (explicit) return [explicit];
    return [1, 2, 3, 4]
      .map((index) => this.firstString(item, [`optionName${index}`, `optionValue${index}`]))
      .filter((value): value is string => Boolean(value));
  }

  private isNaverOptionDisabled(value: unknown): boolean {
    if (value === false || value === 0) return true;
    if (typeof value !== 'string') return false;
    return ['N', 'NO', 'FALSE', '사용안함', 'X'].includes(value.toUpperCase());
  }

  private mapStatus(status: string | null, stock: number): ProductStatus {
    const normalized = (status ?? '').replace(/[\s_-]/g, '').toUpperCase();
    if (
      ['SUSPENSION', 'SALEPROHIBITION', 'CLOSE', 'DELETE', 'HIDDEN'].some((value) =>
        normalized.includes(value),
      )
    ) {
      return ProductStatus.HIDDEN;
    }
    if (['OUTOFSTOCK', 'SOLDOUT'].some((value) => normalized.includes(value)))
      return ProductStatus.SOLDOUT;
    if (['WAIT', 'DRAFT'].some((value) => normalized.includes(value))) return ProductStatus.DRAFT;
    return stock === 0 ? ProductStatus.SOLDOUT : ProductStatus.ACTIVE;
  }

  private buildImages(productName: string, urls: string[]): CreateProductDto['images'] {
    if (urls.length === 0) return undefined;
    return urls.map((url, index) => ({
      url,
      alt: productName,
      sortOrder: index,
      isThumbnail: index === 0,
    }));
  }

  private firstString(record: Record<string, unknown>, paths: string[]): string | null {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number' && Number.isFinite(value)) return String(Math.trunc(value));
    }
    return null;
  }

  private firstNumber(record: Record<string, unknown>, paths: string[]): number | null {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(parsed)) return parsed;
      }
    }
    return null;
  }

  private firstNumberLike(record: Record<string, unknown>, paths: string[]): string | null {
    return this.firstString(record, paths);
  }

  private firstExistingValue(record: Record<string, unknown>, paths: string[]): unknown {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (value !== undefined && value !== null) return value;
    }
    return undefined;
  }

  private firstArray(record: Record<string, unknown>, paths: string[]): unknown[] | null {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (Array.isArray(value)) return value;
    }
    return null;
  }

  private firstRecord(record: Record<string, unknown>, paths: string[]): Record<string, unknown> | null {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (this.isRecord(value)) return value;
    }
    return null;
  }

  private stringArray(record: Record<string, unknown>, paths: string[]): string[] {
    return paths.flatMap((path) => {
      if (!path.includes('.*')) {
        const value = this.readPath(record, path);
        return typeof value === 'string' && value.trim() ? [value.trim()] : [];
      }
      const [arrayPath, childPath] = path.split('.*.');
      const value = this.readPath(record, arrayPath.replace(/\.\*$/, ''));
      if (!Array.isArray(value)) return [];
      return value.flatMap((item) => {
        const candidate = childPath ? this.readPath(item, childPath) : item;
        return typeof candidate === 'string' && candidate.trim() ? [candidate.trim()] : [];
      });
    });
  }

  private uniqueStrings(values: Array<string | null>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value)))];
  }

  private readPath(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) return undefined;
      if (/^\d+$/.test(segment) && Array.isArray(current)) return current[Number(segment)];
      if (!this.isRecord(current)) return undefined;
      return current[segment];
    }, value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private slugify(value: string): string {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 240);
    return slug || 'naver-commerce-product';
  }
}
