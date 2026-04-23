import { apiClient } from '../core';
import type { Faq, CreateFaqData } from '../faqs';

export const adminFaqsApi = {
  getAll: () => apiClient.get<Faq[]>('/admin/faqs'),
  create: (data: CreateFaqData) => apiClient.post<Faq>('/admin/faqs', data),
  update: (id: number, data: Partial<CreateFaqData>) => apiClient.patch<Faq>(`/admin/faqs/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/admin/faqs/${id}`),
};
