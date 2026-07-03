import { apiClient } from '../core';
import type { ProductDetail, ProductListResponse, ProductNoticeInfo } from '../products';

export interface AdminProductsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export interface CreateProductData {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: number;
  salePrice?: number;
  stock?: number;
  sku?: string;
  status?: string;
  isFeatured?: boolean;
  isFreeShipping?: boolean;
  nameEn?: string;
  descriptionEn?: string;
  noticeInfo?: ProductNoticeInfo | null;
  images?: Array<{
    url: string;
    alt?: string;
    sortOrder?: number;
    isThumbnail?: boolean;
  }>;
  detailImages?: Array<{
    url: string;
    alt?: string;
    sortOrder?: number;
  }>;
}

export type UpdateProductData = Partial<CreateProductData>;

export type SmartStoreImportAction = 'create' | 'update' | 'skip';
export type SmartStoreImportStatus = 'valid' | 'failed' | 'success';

export interface SmartStoreAutomaticMappingResult {
  status: 'none' | 'mapped' | 'needs_review';
  category?: { slug: string; displayName: string; categoryId?: number };
  attributes: Array<{ code: string; value: string; displayValue: string; attributeTypeId?: number }>;
  options: Array<{ name: string; value: string }>;
  noticeInfoType?: 'teaware' | 'tea';
}

export interface SmartStoreProductImportRow {
  rowNumber: number;
  identifier: string | null;
  productName: string | null;
  action: SmartStoreImportAction;
  status: SmartStoreImportStatus;
  productId?: number;
  optionCount: number;
  galleryImageCount: number;
  detailImageCount: number;
  price: number | null;
  salePrice: number | null;
  hasDiscount: boolean;
  isFreeShipping: boolean | null;
  hasNoticeInfo: boolean;
  automaticMapping: SmartStoreAutomaticMappingResult;
  mappingWarnings: string[];
  errors: string[];
}

export interface SmartStoreProductImportResult {
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    successCount: number;
    failureCount: number;
  };
  rows: SmartStoreProductImportRow[];
}

export const adminProductsApi = {
  getList: (params?: AdminProductsParams) =>
    apiClient.get<ProductListResponse>('/admin/products', {
      params: params as Record<string, string | number | undefined>,
    }),
  getById: (id: number, locale?: string) =>
    apiClient.get<ProductDetail>(`/admin/products/${id}`, {
      params: locale ? { locale } : undefined,
    }),
  create: (data: CreateProductData) =>
    apiClient.post<ProductDetail>('/products', data),
  update: (id: number, data: UpdateProductData) =>
    apiClient.patch<ProductDetail>(`/products/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<{ message: string }>(`/products/${id}`),
  previewSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreProductImportResult>('/products/imports/smartstore/preview', file),
  commitSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreProductImportResult>('/products/imports/smartstore/commit', file),
  previewNaverCommerceImport: () =>
    apiClient.post<SmartStoreProductImportResult>('/products/imports/naver-commerce/preview'),
  commitNaverCommerceImport: () =>
    apiClient.post<SmartStoreProductImportResult>('/products/imports/naver-commerce/commit'),
};
