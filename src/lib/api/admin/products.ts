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
  categoryId?: number | null;
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
  options?: Array<{
    name: string;
    value: string;
    priceAdjustment?: number;
    stock?: number;
    sortOrder?: number;
  }>;
  attributes?: Array<{
    attributeTypeId: number;
    value: string;
    displayValue?: string;
    sortOrder?: number;
  }>;
}

export type UpdateProductData = Partial<CreateProductData>;

export type SmartStoreImportAction = 'create' | 'update' | 'skip';
export type SmartStoreImportStatus = 'valid' | 'failed' | 'success';

export interface SmartStoreAutomaticMappingResult {
  status: 'none' | 'mapped' | 'needs_review';
  category?: { slug: string; displayName: string; categoryId?: number };
  attributes: Array<{
    code: string;
    value: string;
    displayValue: string;
    attributeTypeId?: number;
  }>;
  options: Array<{ name: string; value: string }>;
  noticeInfoType?: 'teaware' | 'tea';
}

export type SmartStoreImportStockSource = 'product_stock' | 'option_stock_total' | 'default_zero';

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
  stock: number | null;
  optionStockTotal: number | null;
  stockSource: SmartStoreImportStockSource;
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

export interface NaverCommerceImportJob {
  id: string;
  type: 'preview' | 'commit';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: SmartStoreProductImportResult;
  error?: string;
}

const NAVER_COMMERCE_IMPORT_POLL_INTERVAL_MS = 2_000;
const NAVER_COMMERCE_IMPORT_MAX_POLLS = 900;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function pollNaverCommerceImportJob(
  job: NaverCommerceImportJob,
): Promise<SmartStoreProductImportResult> {
  let currentJob = job;

  for (let attempt = 0; attempt < NAVER_COMMERCE_IMPORT_MAX_POLLS; attempt += 1) {
    if (currentJob.status === 'completed' && currentJob.result) {
      return currentJob.result;
    }
    if (currentJob.status === 'failed') {
      throw new Error(currentJob.error || '네이버 커머스API 작업에 실패했습니다.');
    }

    await wait(NAVER_COMMERCE_IMPORT_POLL_INTERVAL_MS);
    currentJob = await apiClient.get<NaverCommerceImportJob>(
      `/products/imports/naver-commerce/jobs/${currentJob.id}`,
    );
  }

  throw new Error('네이버 커머스API 작업 시간이 길어지고 있습니다. 잠시 후 다시 확인해 주세요.');
}

async function startNaverCommerceImportJob(
  endpoint: string,
): Promise<SmartStoreProductImportResult> {
  const job = await apiClient.post<NaverCommerceImportJob>(endpoint);
  return pollNaverCommerceImportJob(job);
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
  create: (data: CreateProductData) => apiClient.post<ProductDetail>('/products', data),
  update: (id: number, data: UpdateProductData) =>
    apiClient.patch<ProductDetail>(`/products/${id}`, data),
  remove: (id: number) => apiClient.delete<{ message: string }>(`/products/${id}`),
  previewSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreProductImportResult>(
      '/products/imports/smartstore/preview',
      file,
    ),
  commitSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreProductImportResult>(
      '/products/imports/smartstore/commit',
      file,
    ),
  previewNaverCommerceImport: () =>
    startNaverCommerceImportJob('/products/imports/naver-commerce/preview'),
  commitNaverCommerceImport: () =>
    startNaverCommerceImportJob('/products/imports/naver-commerce/commit'),
};
