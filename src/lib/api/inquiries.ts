import { apiClient, type ListResponse } from './core';

export interface Inquiry {
  id: number;
  type: string;
  title: string;
  content: string;
  status: 'pending' | 'answered';
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export type InquiryListResponse = ListResponse<Inquiry>;

export interface CreateInquiryBody {
  type: string;
  title: string;
  content: string;
}

export const inquiriesApi = {
  getList: () => apiClient.get<InquiryListResponse>('/inquiries'),
  getOne: (id: number) => apiClient.get<Inquiry>(`/inquiries/${id}`),
  create: (body: CreateInquiryBody) => apiClient.post<Inquiry>('/inquiries', body),
};
