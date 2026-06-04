import { apiClient } from '../core';

export const CollectionType = {
  CLAY: 'clay',
  SHAPE: 'shape',
} as const;

export type CollectionType = (typeof CollectionType)[keyof typeof CollectionType];

export interface Collection {
  id: number;
  type: CollectionType;
  name: string;
  nameKo: string | null;
  color: string | null;
  description: string | null;
  imageUrl: string | null;
  productUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateCollectionData {
  type: 'clay' | 'shape';
  name: string;
  nameKo?: string;
  color?: string;
  description?: string;
  imageUrl?: string;
  productUrl: string;
  sortOrder?: number;
  isActive?: boolean;
}

export const adminCollectionsApi = {
  getAll: () => apiClient.get<Collection[]>('/admin/collections'),
  create: (data: CreateCollectionData) =>
    apiClient.post<Collection>('/admin/collections', data),
  update: (id: number, data: Partial<CreateCollectionData>) =>
    apiClient.patch<Collection>(`/admin/collections/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/admin/collections/${id}`),
  reorder: (orders: Array<{ id: number; sortOrder: number }>) =>
    apiClient.patch<void>('/admin/collections/reorder', orders),
};
