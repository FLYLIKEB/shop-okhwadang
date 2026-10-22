import { apiClient } from '../core';
import type { SiteSetting } from '../settings';

export const adminSettingsApi = {
  getAll: (group?: string) =>
    apiClient.get<SiteSetting[]>('/admin/settings', { params: group ? { group } : undefined }),
  bulkUpdate: (settings: Array<{ key: string; value?: string; valueEn?: string }>) =>
    apiClient.put<void>('/admin/settings', { settings }),
  reset: () =>
    apiClient.post<void>('/admin/settings/reset'),
};
