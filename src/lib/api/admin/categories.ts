import { apiClient } from '../core';

export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  children?: AdminCategory[];
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  parentId?: number | null;
  sortOrder?: number;
  isActive?: boolean;
  imageUrl?: string | null;
}

export interface CategoryOrderItem {
  id: number;
  sortOrder: number;
}

export const adminCategoriesApi = {
  getAll: () => apiClient.get<AdminCategory[]>('/categories/all'),
  create: (data: CreateCategoryData) => apiClient.post<AdminCategory>('/categories', data),
  update: (id: number, data: Partial<CreateCategoryData>) =>
    apiClient.patch<AdminCategory>(`/categories/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/categories/${id}`),
  reorder: (orders: CategoryOrderItem[]) =>
    apiClient.patch<void>('/categories/reorder', { orders }),
};
