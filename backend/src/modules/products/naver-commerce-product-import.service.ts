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
      unmatchedAction: 'skip' as const,
      unmatchedSkipMessage: (identifier: string | null) =>
        identifier
          ? `SKU가 ${identifier}인 자사몰 상품이 없어 업데이트 대상에서 제외했습니다.`
          : '네이버 상품 식별자를 찾지 못해 업데이트 대상에서 제외했습니다.',
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
    const stock = this.firstNumber(product, [
      'originProduct.stockQuantity',
      'stockQuantity',
      'originProduct.optionInfo.stockQuantity',
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
    const options = this.buildOptions(product);

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
            noticeInfo,
            images: this.buildImages(productName, galleryUrls),
            detailImages: detailUrls.map((url, index) => ({
              url,
              alt: productName,
              sortOrder: index,
            })),
            options,
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
      asContact: [asPhone, asGuide].filter(Boolean).join(' / ') || undefined,
      warrantyPolicy: asGuide ?? undefined,
    };
  }

  private buildOptions(product: Record<string, unknown>): ProductOptionInputDto[] | undefined {
    const combinations = this.firstArray(product, [
      'originProduct.optionInfo.optionCombinations',
      'optionInfo.optionCombinations',
      'optionCombinations',
    ]);
    if (!combinations || combinations.length === 0) return undefined;

    const options: ProductOptionInputDto[] = [];
    for (const item of combinations) {
      if (!this.isRecord(item)) continue;
      const usable = this.firstString(item, ['usable', 'isUsable', 'useYn']);
      if (usable && ['N', 'NO', 'FALSE', '사용안함'].includes(usable.toUpperCase())) continue;
      const optionName = this.firstString(item, ['optionName', 'name']) ?? '옵션';
      const optionValue = this.firstString(item, [
        'optionValue',
        'value',
        'optionValue1',
        'optionName1',
      ]);
      if (!optionValue) continue;
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

  private firstArray(record: Record<string, unknown>, paths: string[]): unknown[] | null {
    for (const path of paths) {
      const value = this.readPath(record, path);
      if (Array.isArray(value)) return value;
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
