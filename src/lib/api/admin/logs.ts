import { apiClient } from '../core';

export type AdminLogType = 'normal' | 'error';

export interface AdminLogResponse {
  type: AdminLogType;
  app: string;
  lines: number;
  content: string;
  lineCount: number;
  updatedAt: string | null;
  source: string;
  truncated: boolean;
}

export interface AdminLogQueryParams {
  type?: AdminLogType;
  lines?: number;
}

export const adminLogsApi = {
  get: (params?: AdminLogQueryParams) =>
    apiClient.get<AdminLogResponse>('/admin/logs', {
      params: params as Record<string, string | number | undefined>,
    }),
};
