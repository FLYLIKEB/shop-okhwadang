import { apiClient } from '../core';
import type { Journal, CreateJournalData } from '../journals';

export const adminJournalsApi = {
  getAll: () => apiClient.get<Journal[]>('/admin/journals'),
  getById: (id: number) => apiClient.get<Journal>(`/admin/journals/${id}`),
  create: (data: CreateJournalData) =>
    apiClient.post<Journal>('/admin/journals', data),
  update: (id: number, data: Partial<CreateJournalData>) =>
    apiClient.patch<Journal>(`/admin/journals/${id}`, data),
  remove: (id: number) =>
    apiClient.delete<void>(`/admin/journals/${id}`),
};
