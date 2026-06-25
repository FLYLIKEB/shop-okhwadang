import { apiClient, type PaginatedResponse } from '../core';
import type { Inquiry } from '../inquiries';

export type AdminInquiryStatusFilter = 'pending' | 'answered';

export interface AdminInquiryQueryParams {
  page?: number;
  limit?: number;
  status?: AdminInquiryStatusFilter;
  unread?: boolean;
}

export interface AdminInquiryCounts {
  pending: number;
  answered: number;
}

export type AdminInquiryListResponse = PaginatedResponse<Inquiry> & {
  counts: AdminInquiryCounts;
};

export const adminInquiriesApi = {
  getAll: (params: AdminInquiryQueryParams = {}) => {
    const { unread, ...rest } = params;

    return apiClient.get<AdminInquiryListResponse>('/admin/inquiries', {
      params: {
        ...rest,
        unread: unread === undefined ? undefined : String(unread),
      },
    });
  },
  answer: (id: number, answer: string) =>
    apiClient.post<Inquiry>(`/admin/inquiries/${id}/answer`, { answer }),
};
