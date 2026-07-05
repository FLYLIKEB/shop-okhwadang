import { apiClient } from '../core';

export type AdminReviewVisibility = 'all' | 'visible' | 'hidden';
export type AdminReviewSort = 'reviewedAt' | 'rating' | 'helpful' | 'importedAt';
export type SmartStoreReviewImportAction = 'create' | 'update' | 'skip';
export type SmartStoreReviewImportStatus = 'valid' | 'failed' | 'success';

export interface AdminReviewsParams {
  page?: number;
  limit?: number;
  search?: string;
  visibility?: AdminReviewVisibility;
  rating?: number;
  reviewType?: string;
  hasMedia?: boolean;
  importBatchId?: string;
  sort?: AdminReviewSort;
  order?: 'ASC' | 'DESC';
}

export interface AdminReviewProductSummary {
  id: number;
  name: string;
  sku: string | null;
}

export interface AdminReviewItem {
  id: number;
  source: string;
  externalReviewId: string;
  externalProductId: string | null;
  product: AdminReviewProductSummary | null;
  reviewType: string | null;
  rating: number;
  content: string | null;
  reviewerNameMasked: string;
  helpfulCount: number;
  imageUrls: string[] | null;
  mediaCount: number;
  mediaFailureCount: number;
  sourceDisplayStatus: string | null;
  isVisible: boolean;
  isBest: boolean;
  reviewedAt: string;
  sourceUpdatedAt: string | null;
  lastSyncedAt: string;
  importBatchId: string | null;
  orderNo: string | null;
  relatedReviewExternalId: string | null;
  relatedReviewContent: string | null;
  adminReplyContent: string | null;
  adminReplyAuthor: string | null;
  adminRepliedAt: string | null;
}

export interface AdminReviewListResponse {
  items: AdminReviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SmartStoreReviewImportRow {
  rowNumber: number;
  externalReviewId: string | null;
  externalProductId: string | null;
  externalProductKey: string | null;
  productName: string | null;
  matchedProductId?: number;
  action: SmartStoreReviewImportAction;
  status: SmartStoreReviewImportStatus;
  rating: number | null;
  reviewType: string | null;
  reviewedAt: string | null;
  mediaCount: number;
  mediaSuccessCount: number;
  mediaFailureCount: number;
  isVisible: boolean | null;
  errors: string[];
  warnings: string[];
}

export interface SmartStoreReviewImportResult {
  importBatchId: string | null;
  summary: {
    totalRows: number;
    createCount: number;
    updateCount: number;
    skipCount: number;
    successCount: number;
    failureCount: number;
    unmatchedProductCount: number;
    mediaFailureCount: number;
  };
  rows: SmartStoreReviewImportRow[];
}

function toParams(
  params?: AdminReviewsParams,
): Record<string, string | number | undefined> | undefined {
  if (!params) return undefined;
  return {
    ...params,
    hasMedia: params.hasMedia === undefined ? undefined : String(params.hasMedia),
  } as Record<string, string | number | undefined>;
}

export const adminReviewsApi = {
  getList: (params?: AdminReviewsParams) =>
    apiClient.get<AdminReviewListResponse>('/admin/reviews', { params: toParams(params) }),
  getById: (id: number) => apiClient.get<AdminReviewItem>(`/admin/reviews/${id}`),
  setVisibility: (id: number, isVisible: boolean, source?: string) =>
    apiClient.patch<AdminReviewItem>(`/admin/reviews/${id}/visibility`, { isVisible, source }),
  setReply: (id: number, content: string | null, author?: string, source?: string) =>
    apiClient.patch<AdminReviewItem>(`/admin/reviews/${id}/reply`, { content, author, source }),
  bulkSetVisibility: (items: Array<{ id: number; source: string }> | number[], isVisible: boolean) => {
    const body =
      typeof items[0] === 'number'
        ? { ids: items as number[], isVisible }
        : { items: items as Array<{ id: number; source: string }>, isVisible };
    return apiClient.post<{ updated: number }>('/admin/reviews/bulk-visibility', body);
  },
  previewSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreReviewImportResult>(
      '/admin/reviews/imports/smartstore/preview',
      file,
    ),
  commitSmartStoreImport: (file: File) =>
    apiClient.uploadFile<SmartStoreReviewImportResult>(
      '/admin/reviews/imports/smartstore/commit',
      file,
    ),
};
