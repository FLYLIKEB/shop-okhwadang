import { apiClient } from './core';

export type ShippingStatus =
  | 'payment_confirmed'
  | 'preparing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'failed';

export type CarrierCode = 'mock' | 'cj' | 'hanjin' | 'lotte';

export interface TrackingStep {
  status: string;
  description: string;
  timestamp: string;
}

export interface TrackingResult {
  trackingNumber: string;
  status: 'shipped' | 'in_transit' | 'delivered';
  steps: TrackingStep[];
  estimatedDelivery?: string;
}

export interface ShippingResponse {
  id: number;
  order_id: number;
  carrier: CarrierCode;
  tracking_number: string | null;
  status: ShippingStatus;
  shipped_at: string | null;
  delivered_at: string | null;
  tracking: TrackingResult | null;
}

export const shippingApi = {
  getByOrderId: (orderId: number) =>
    apiClient.get<ShippingResponse>(`/shipping/${orderId}`),
  track: (carrier: CarrierCode, trackingNumber: string) =>
    apiClient.post<{ carrier: CarrierCode; trackingNumber: string; status: string; steps: TrackingStep[] }>(
      '/shipping/track',
      { carrier, trackingNumber },
    ),
};
