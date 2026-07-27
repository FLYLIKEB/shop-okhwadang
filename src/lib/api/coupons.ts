import { apiClient } from './core';

export interface CouponItem {
  id: number;
  couponId: number;
  code: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  maxDiscount: number | null;
  expiresAt: string;
  status: 'available' | 'used' | 'expired';
  issuedAt: string;
  usedAt: string | null;
}

export interface PointsInfo {
  balance: number;
  willExpireSoon: number;
}

export interface CouponListResponse {
  coupons: CouponItem[];
  points: PointsInfo;
}

export interface CalculateDiscountBody {
  orderAmount: number;
  userCouponId?: number;
  pointsToUse?: number;
}

export interface CalculateDiscountResponse {
  originalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  finalAmount: number;
  shippingFee: number;
  totalPayable: number;
}

export type PointHistorySourceKind =
  | 'review_reward_earn'
  | 'review_reward_revoke'
  | 'order_use'
  | 'expiry'
  | 'order_restore'
  | 'manual_grant'
  | 'manual_debit';

export interface PointHistoryItem {
  id: number;
  type: 'earn' | 'spend' | 'expire' | 'admin_adjust';
  amount: number;
  balance: number;
  description: string | null;
  createdAt: string;
  sourceKind: PointHistorySourceKind;
}

export interface PointsResponse {
  balance: number;
  history: PointHistoryItem[];
}

export const couponsApi = {
  getList: (status?: string) =>
    apiClient.get<CouponListResponse>(`/coupons${status ? `?status=${status}` : ''}`),
  calculate: (body: CalculateDiscountBody) =>
    apiClient.post<CalculateDiscountResponse>('/coupons/calculate', body),
  getPoints: () => apiClient.get<PointsResponse>('/coupons/points'),
};
