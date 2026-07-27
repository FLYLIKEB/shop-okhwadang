import { apiClient, type RequestOptions } from './core';

export interface CheckoutPricingPreviewDto {
  items: Array<{
    productId: number;
    productOptionId?: number | null;
    quantity: number;
  }>;
  zipcode: string;
  userCouponId?: number;
  pointsToUse?: number;
  locale?: 'ko' | 'en';
}

export interface CheckoutPricingPreviewResponse {
  subtotalAmount: number;
  couponDiscount: number;
  pointsDiscount: number;
  shippingFee: number;
  isFreeShipping: boolean;
  isRemoteArea: boolean;
  remoteAreaSurcharge: number;
  totalPayable: number;
  appliedUserCouponId?: number;
  appliedPointsUsed: number;
  freeShippingThreshold: number;
}

export const checkoutPricingApi = {
  preview: (body: CheckoutPricingPreviewDto, options?: RequestOptions) =>
    apiClient.post<CheckoutPricingPreviewResponse>('/checkout/pricing/preview', body, options),
};
