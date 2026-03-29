import { Injectable } from '@nestjs/common';
import { ShippingProvider, CarrierCode, TrackingResult } from '../interfaces/shipping-provider.interface';

@Injectable()
export class MockShippingAdapter implements ShippingProvider {
  async registerTrackingNumber(_orderId: string, _trackingNumber: string): Promise<void> {
    // Mock: no-op
  }

  async getTrackingStatus(trackingNumber: string, _carrier: CarrierCode): Promise<TrackingResult> {
    return {
      trackingNumber,
      status: 'in_transit',
      steps: [
        { status: 'shipped', description: '발송 완료', timestamp: new Date().toISOString() },
        { status: 'in_transit', description: '배송 중', timestamp: new Date().toISOString() },
      ],
    };
  }
}
