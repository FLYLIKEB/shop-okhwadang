import { apiClient } from '../core';

export type AdminPointHistoryType = 'earn' | 'spend' | 'expire' | 'admin_adjust';
export type AdminPointSourceKind =
  | 'review_reward_earn'
  | 'review_reward_revoke'
  | 'order_use'
  | 'expiry'
  | 'order_restore'
  | 'manual_grant'
  | 'manual_debit';

export interface AdminPointsUserSummary {
  userId: number;
  balance: number;
}

export interface AdminPointHistoryItem {
  id: number;
  userId: number;
  type: AdminPointHistoryType;
  amount: number;
  balance: number;
  description: string | null;
  createdAt: string;
  sourceKind: AdminPointSourceKind;
}

export interface AdminPointHistoryResponse {
  items: AdminPointHistoryItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminPointAdjustmentInput {
  userId: number;
  delta: number;
  reason: string;
}

export interface AdminPointAdjustmentResponse {
  pointHistoryId: number;
  auditLogId: number;
  userId: number;
  delta: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export const adminPointsApi = {
  getUserSummary: (userId: number): Promise<AdminPointsUserSummary> =>
    apiClient.get<AdminPointsUserSummary>(`/admin/points/users/${userId}`),
  getUserHistory: (
    userId: number,
    params?: { page?: number; limit?: number },
  ): Promise<AdminPointHistoryResponse> =>
    apiClient.get<AdminPointHistoryResponse>(`/admin/points/users/${userId}/history`, {
      params: params as Record<string, number | undefined> | undefined,
    }),
  createAdjustment: (input: AdminPointAdjustmentInput): Promise<AdminPointAdjustmentResponse> =>
    apiClient.post<AdminPointAdjustmentResponse>('/admin/points/adjustments', input),
};
