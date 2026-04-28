import { apiClient } from './core';

export interface Notice {
  id: number;
  title: string;
  titleEn: string | null;
  content: string;
  contentEn: string | null;
  isPinned: boolean;
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export const noticesApi = {
  getList: (locale?: string) =>
    apiClient.get<Notice[]>(`/notices${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
  getOne: (id: number, locale?: string) =>
    apiClient.get<Notice>(`/notices/${id}${locale ? `?locale=${encodeURIComponent(locale)}` : ''}`),
};
