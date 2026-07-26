import { apiClient, type PaginatedResponse } from '../core';

export type CouponRuleTrigger = 'signup' | 'first_purchase' | 'birthday' | 'tier_up';

export interface AdminCouponRule {
  id: number;
  trigger: CouponRuleTrigger;
  couponTemplateId: number;
  couponTemplate: { id: number; code: string; name: string } | null;
  conditionsJson: Record<string, unknown> | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponRuleInput {
  trigger: CouponRuleTrigger;
  couponTemplateId: number;
  conditionsJson?: Record<string, unknown> | null;
  active?: boolean;
}

export type AdminCouponRuleListResponse = PaginatedResponse<AdminCouponRule>;

export const adminCouponRulesApi = {
  getList: (params?: { page?: number; limit?: number }) =>
    apiClient.get<AdminCouponRuleListResponse>('/admin/coupon-rules', {
      params: params as Record<string, number | undefined> | undefined,
    }),
  getById: (id: number) => apiClient.get<AdminCouponRule>(`/admin/coupon-rules/${id}`),
  create: (input: AdminCouponRuleInput) =>
    apiClient.post<AdminCouponRule>('/admin/coupon-rules', input),
  update: (id: number, input: Partial<AdminCouponRuleInput>) =>
    apiClient.patch<AdminCouponRule>(`/admin/coupon-rules/${id}`, input),
  remove: (id: number) => apiClient.delete<{ message: string }>(`/admin/coupon-rules/${id}`),
};
