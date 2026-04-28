import { apiClient, type UploadedFile } from './core';

export interface ReviewItem {
  id: number;
  source?: 'internal' | 'smartstore';
  externalReviewId?: string | null;
  externalProductId?: string | null;
  userId: number;
  userName: string;
  productId: number;
  orderItemId: number | null;
  rating: number;
  content: string | null;
  imageUrls: string[] | null;
  isVisible: boolean;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalCount: number;
  distribution: Record<string, number>;
  internalCount?: number;
  externalCount?: number;
}

export interface ReviewListResponse {
  data: ReviewItem[];
  stats: ReviewStats;
  pagination: { page: number; limit: number; total: number };
}

export type ReviewSort = 'recent' | 'rating_high' | 'rating_low';

export interface ReviewQueryParams {
  productId?: number;
  sort?: ReviewSort;
  page?: number;
  limit?: number;
}

export interface CreateReviewData {
  productId: number;
  orderItemId: number | null;
  rating: number;
  content?: string | null;
  imageUrls?: string[];
}

export interface UpdateReviewData {
  rating?: number;
  content?: string | null;
  imageUrls?: string[];
}

export const reviewsApi = {
  getByProduct: (productId: number, params?: Omit<ReviewQueryParams, 'productId'>) =>
    apiClient.get<ReviewListResponse>('/reviews', {
      params: { productId, ...params } as Record<string, string | number | undefined>,
    }),
  create: (data: CreateReviewData) =>
    apiClient.post<ReviewItem>('/reviews', data),
  update: (id: number, data: UpdateReviewData) =>
    apiClient.patch<ReviewItem>(`/reviews/${id}`, data),
  delete: (id: number) =>
    apiClient.delete<void>(`/reviews/${id}`),
  uploadImage: (file: File) => apiClient.uploadFile<UploadedFile>('/reviews/upload-image', file),
};

export const uploadApi = {
  uploadImage: (file: File) => apiClient.uploadFile<UploadedFile>('/upload/image', file),
};
