import { apiClient } from './core';

export interface NavigationItem {
  id: number;
  group: 'gnb' | 'sidebar' | 'footer';
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  parent_id: number | null;
  children: NavigationItem[];
}

export interface AnnouncementBarItem {
  id: number;
  message: string;
  message_en: string | null;
  href: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const navigationApi = {
  getByGroup: (group: 'gnb' | 'sidebar' | 'footer', locale?: string) =>
    apiClient.get<NavigationItem[]>(`/navigation?group=${group}${locale ? `&locale=${locale}` : ''}`),
};

export const announcementBarsApi = {
  getActive: (locale?: string) =>
    apiClient.get<AnnouncementBarItem[]>(locale ? `/announcement-bars?locale=${locale}` : '/announcement-bars'),
};
