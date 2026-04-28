import { apiClient } from './core';

export enum CollectionType {
  CLAY = 'clay',
  SHAPE = 'shape',
}

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

export interface CollectionsResponse {
  clay: Collection[];
  shape: Collection[];
}

export const collectionsApi = {
  getAll: (locale?: string) =>
    apiClient.get<CollectionsResponse>(locale ? `/collections?locale=${locale}` : '/collections'),
};
