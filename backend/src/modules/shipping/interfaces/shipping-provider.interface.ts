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

export interface ShippingProvider {
  registerTrackingNumber(orderId: string, trackingNumber: string): Promise<void>;
  getTrackingStatus(trackingNumber: string, carrier: CarrierCode): Promise<TrackingResult>;
}
