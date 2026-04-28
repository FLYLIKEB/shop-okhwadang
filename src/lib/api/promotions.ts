import { apiClient, type ListResponse } from './core';

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  type: 'timesale' | 'exhibition' | 'event';
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  discountRate: number | null;
  imageUrl: string | null;
  createdAt: string;
}

export type PromotionListResponse = ListResponse<Promotion>;

export const promotionsApi = {
  getList: (locale?: string) =>
    apiClient.get<Promotion[]>(locale ? `/promotions?locale=${locale}` : '/promotions'),
  getOne: (id: number, locale?: string) =>
    apiClient.get<Promotion>(locale ? `/promotions/${id}?locale=${locale}` : `/promotions/${id}`),
};
