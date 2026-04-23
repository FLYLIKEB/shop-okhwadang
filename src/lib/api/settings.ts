import { apiClient } from './core';

export interface SiteSetting {
  id: number;
  key: string;
  value: string;
  valueEn?: string | null;
  valueJa?: string | null;
  valueZh?: string | null;
  group: string;
  label: string;
  inputType: string;
  options: string | null;
  defaultValue: string;
  sortOrder: number;
}

export const settingsApi = {
  getAll: (group?: string) =>
    apiClient.get<SiteSetting[]>(`/settings${group ? `?group=${group}` : ''}`),
  getMap: () => apiClient.get<Record<string, string>>('/settings/map'),
};
