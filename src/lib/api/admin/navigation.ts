import { apiClient } from '../core';
import type { NavigationItem, AnnouncementBarItem } from '../navigation';

export const adminNavigationApi = {
  getByGroup: (group: 'gnb' | 'sidebar' | 'footer') =>
    apiClient.get<NavigationItem[]>(`/admin/navigation?group=${group}`),
  create: (data: { group: string; label: string; url: string; sort_order?: number; is_active?: boolean; parent_id?: number | null }) =>
    apiClient.post<NavigationItem>('/navigation', data),
  update: (id: number, data: { label?: string; url?: string; sort_order?: number; is_active?: boolean; parent_id?: number | null }) =>
    apiClient.patch<NavigationItem>(`/navigation/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/navigation/${id}`),
  reorder: (orders: Array<{ id: number; sort_order: number }>) =>
    apiClient.patch<void>('/navigation/reorder', { orders }),
};

export interface CreateAnnouncementBarData {
  message: string;
  message_en?: string | null;
  href?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export const adminAnnouncementBarsApi = {
  getAll: () => apiClient.get<AnnouncementBarItem[]>('/admin/announcement-bars'),
  create: (data: CreateAnnouncementBarData) =>
    apiClient.post<AnnouncementBarItem>('/admin/announcement-bars', data),
  update: (id: number, data: Partial<CreateAnnouncementBarData>) =>
    apiClient.patch<AnnouncementBarItem>(`/admin/announcement-bars/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/admin/announcement-bars/${id}`),
  reorder: (orders: Array<{ id: number; sort_order: number }>) =>
    apiClient.patch<void>('/admin/announcement-bars/reorder', { orders }),
};
