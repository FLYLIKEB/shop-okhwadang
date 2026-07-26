import { apiClient } from '../core';

export type AdminCouponType = 'percentage' | 'fixed';

export interface AdminCoupon {
  id: number;
  code: string;
  name: string;
  type: AdminCouponType;
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  totalQuantity: number | null;
  issuedCount: number;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminCouponListResponse {
  items: AdminCoupon[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminCouponInput {
  code: string;
  name: string;
  type: AdminCouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number | null;
  totalQuantity?: number | null;
  startsAt: string;
  expiresAt: string;
  isActive?: boolean;
}

export interface AdminCouponIssueInput {
  couponId: number;
  userId: number;
}

export const adminCouponsApi = {
  getList: (params?: { page?: number; limit?: number; q?: string; status?: 'active' | 'inactive' }): Promise<AdminCouponListResponse> =>
    apiClient.get<AdminCouponListResponse>('/admin/coupons', {
      params: params as Record<string, string | number | undefined> | undefined,
    }),
  getById: (id: number): Promise<AdminCoupon> => apiClient.get<AdminCoupon>(`/admin/coupons/${id}`),
  create: (input: AdminCouponInput): Promise<AdminCoupon> => apiClient.post<AdminCoupon>('/admin/coupons', input),
  update: (id: number, input: Partial<AdminCouponInput>): Promise<AdminCoupon> =>
    apiClient.patch<AdminCoupon>(`/admin/coupons/${id}`, input),
  remove: (id: number): Promise<{ message: string }> => apiClient.delete<{ message: string }>(`/admin/coupons/${id}`),
  issue: (input: AdminCouponIssueInput): Promise<{ id: number; userId: number; couponId: number; status: string }> =>
    apiClient.post<{ id: number; userId: number; couponId: number; status: string }>(
      '/admin/coupons/issue',
      input,
    ),
};
