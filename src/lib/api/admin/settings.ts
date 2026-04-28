import { apiClient } from '../core';
import type { SiteSetting } from '../settings';

export const adminSettingsApi = {
  getAll: (group?: string) =>
    apiClient.get<SiteSetting[]>(`/admin/settings${group ? `?group=${group}` : ''}`),
  bulkUpdate: (settings: Array<{ key: string; value?: string; valueEn?: string }>) =>
    apiClient.put<SiteSetting[]>('/admin/settings', { settings }),
  reset: () =>
    apiClient.post<{ message: string }>('/admin/settings/reset'),
};
