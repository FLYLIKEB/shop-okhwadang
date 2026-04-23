import { apiClient, type PaginatedResponse } from '../core';
import type { Inquiry } from '../inquiries';

export const adminInquiriesApi = {
  getAll: async (page = 1, limit = 50) => {
    const response = await apiClient.get<PaginatedResponse<Inquiry>>('/admin/inquiries', {
      params: { page, limit },
    });
    return response.items;
  },
  answer: (id: number, answer: string) =>
    apiClient.post<Inquiry>(`/admin/inquiries/${id}/answer`, { answer }),
};
