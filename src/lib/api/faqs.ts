import { apiClient, type ListResponse } from './core';

export interface Faq {
  id: number;
  category: string;
  question: string;
  questionEn: string | null;
  questionJa: string | null;
  questionZh: string | null;
  answer: string;
  answerEn: string | null;
  answerJa: string | null;
  answerZh: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export type FaqListResponse = ListResponse<Faq>;

export interface CreateFaqData {
  category: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export const faqsApi = {
  getList: (category?: string, locale?: string) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (locale) params.set('locale', locale);
    const qs = params.toString();
    return apiClient.get<FaqListResponse>(`/faqs${qs ? `?${qs}` : ''}`);
  },
};
