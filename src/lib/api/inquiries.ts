import { apiClient, type ListResponse } from './core';

export interface Inquiry {
  id: number;
  type: string;
  productId?: number;
  title: string;
  content: string;
  isSecret: boolean;
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
  productId?: number;
  title: string;
  content: string;
  isSecret?: boolean;
}

export const inquiriesApi = {
  getList: (params?: { productId?: number }) => apiClient.get<InquiryListResponse>('/inquiries', { params }),
  getOne: (id: number) => apiClient.get<Inquiry>(`/inquiries/${id}`),
  create: (body: CreateInquiryBody) => apiClient.post<Inquiry>('/inquiries', body),
};
