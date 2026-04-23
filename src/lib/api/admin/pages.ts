import { apiClient } from '../core';
import type { Page, PageBlock } from '../pages';

export interface CreatePageData {
  title: string;
  slug: string;
  is_published?: boolean;
}

export interface CreateBlockData {
  type: PageBlock['type'];
  content: Record<string, unknown>;
  sort_order: number;
  is_visible?: boolean;
}

export const adminPagesApi = {
  getAll: () => apiClient.get<Page[]>('/admin/pages'),
  create: (data: CreatePageData) => apiClient.post<Page>('/pages', data),
  update: (id: number, data: Partial<Page>) =>
    apiClient.patch<Page>(`/pages/${id}`, data),
  remove: (id: number) => apiClient.delete<void>(`/pages/${id}`),
  addBlock: (pageId: number, data: CreateBlockData) =>
    apiClient.post<PageBlock>(`/pages/${pageId}/blocks`, data),
  updateBlock: (pageId: number, blockId: number, data: Partial<PageBlock>) =>
    apiClient.patch<PageBlock>(`/pages/${pageId}/blocks/${blockId}`, data),
  deleteBlock: (pageId: number, blockId: number) =>
    apiClient.delete<void>(`/pages/${pageId}/blocks/${blockId}`),
  reorderBlocks: (pageId: number, orders: { id: number; sort_order: number }[]) =>
    apiClient.patch<void>(`/pages/${pageId}/blocks/reorder`, { orders }),
};
