import { apiClient, type PaginatedResponse } from '../core';

export interface AdminMember {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminMemberListResponse = PaginatedResponse<AdminMember>;

export interface AdminMemberQueryParams {
  q?: string;
  role?: string;
  is_active?: string;
  page?: number;
  limit?: number;
}

export const adminMembersApi = {
  getList: (params?: AdminMemberQueryParams) =>
    apiClient.get<AdminMemberListResponse>('/admin/members', {
      params: params as Record<string, string | number | undefined>,
    }),
  updateRole: (id: number, role: string) =>
    apiClient.patch<AdminMember>(`/admin/members/${id}`, { role }),
};
