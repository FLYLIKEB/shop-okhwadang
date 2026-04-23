import { apiClient } from '../core';
import type { ProductDetail, ProductListResponse } from '../products';

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
  nameEn?: string;
  nameJa?: string;
  nameZh?: string;
  descriptionEn?: string;
  descriptionJa?: string;
  descriptionZh?: string;
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

export const adminProductsApi = {
  getList: (params?: AdminProductsParams) =>
    apiClient.get<ProductListResponse>('/products', {
      params: {
        ...params,
        // admin calls include all statuses
      } as Record<string, string | number | undefined>,
    }),
  create: (data: CreateProductData) =>
    apiClient.post<ProductDetail>('/products', data),
  update: (id: number, data: UpdateProductData) =>
    apiClient.patch<ProductDetail>(`/products/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<{ message: string }>(`/products/${id}`),
};
