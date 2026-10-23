import { apiClient } from './core';

export interface Popup {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreatePopupData = Omit<Popup, 'id' | 'createdAt' | 'updatedAt'>;

export const popupsApi = {
  getList: () => apiClient.get<Popup[]>('/popups'),
};

export const adminPopupsApi = {
  getAll: () => apiClient.get<Popup[]>('/admin/popups'),
  create: (data: CreatePopupData) => apiClient.post<Popup>('/admin/popups', data),
  update: (id: number, data: Partial<CreatePopupData>) => apiClient.patch<Popup>(`/admin/popups/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/admin/popups/${id}`),
};
