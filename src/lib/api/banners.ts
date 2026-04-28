import { apiClient } from './core';

export interface Banner {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

export const bannersApi = {
  getList: (locale?: string) =>
    apiClient.get<Banner[]>(locale ? `/banners?locale=${locale}` : '/banners'),
};
