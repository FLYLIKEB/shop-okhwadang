import { apiClient } from './core';

export enum JournalCategory {
  CULTURE = 'CULTURE',
  USAGE = 'USAGE',
  TABLE_SETTING = 'TABLE_SETTING',
  NEWS = 'NEWS',
}

export interface Journal {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  category: JournalCategory;
  date: string;
  readTime: string | null;
  summary: string | null;
  content: string | null;
  coverImageUrl: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalData {
  slug: string;
  title: string;
  subtitle?: string;
  category: JournalCategory;
  date: string;
  readTime?: string;
  summary?: string;
  content?: string;
  coverImageUrl?: string;
  isPublished?: boolean;
}

export const journalsApi = {
  getAll: (category?: JournalCategory) =>
    apiClient.get<Journal[]>('/journals', category ? { params: { category } } : undefined),
  getBySlug: (slug: string) => apiClient.get<Journal>(`/journals/${slug}`),
};
