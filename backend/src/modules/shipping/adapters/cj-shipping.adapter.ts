import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { CarrierCode, ShippingProvider, TrackingResult } from '../interfaces/shipping-provider.interface';

@Injectable()
export class CjShippingAdapter implements ShippingProvider {
  private readonly logger = new Logger(CjShippingAdapter.name);

  private resolveConfig(): { baseUrl: string; apiKey: string } {
    const baseUrl = process.env.CJ_TRACKING_API_URL?.trim();
    const apiKey = process.env.CJ_TRACKING_API_KEY?.trim();

    if (!baseUrl || !apiKey) {
      throw new BadRequestException('CJ 택배 API 연동 설정이 누락되었습니다.');
    }

    return { baseUrl, apiKey };
  }

  async registerTrackingNumber(_orderId: string, _trackingNumber: string): Promise<void> {
    // CJ API는 별도 등록 절차 없이 운송장 조회만 수행합니다.
  }

  async getTrackingStatus(trackingNumber: string, _carrier: CarrierCode): Promise<TrackingResult> {
    const { baseUrl, apiKey } = this.resolveConfig();

    try {
      const response = await axios.get(baseUrl, {
        params: { trackingNumber },
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 5000,
      });

      const data = response.data as {
        status?: string;
        estimatedDelivery?: string;
        steps?: Array<{ status?: string; description?: string; timestamp?: string }>;
      };

      return {
        trackingNumber,
        status: this.mapStatus(data.status),
        estimatedDelivery: data.estimatedDelivery,
        steps: (data.steps ?? []).map((step) => ({
          status: step.status ?? 'in_transit',
          description: step.description ?? '',
          timestamp: step.timestamp ?? new Date().toISOString(),
        })),
      };
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 429) {
        throw new BadRequestException('CJ API 요청 한도를 초과했습니다.');
      }

      this.logger.warn(`CJ tracking lookup failed: ${String(err)}`);
      throw new BadRequestException('CJ 배송 추적 조회에 실패했습니다.');
    }
  }

  private mapStatus(status?: string): 'shipped' | 'in_transit' | 'delivered' {
    const normalized = (status ?? '').toLowerCase();
    if (normalized.includes('deliver')) return 'delivered';
    if (normalized.includes('transit') || normalized.includes('move')) return 'in_transit';
    return 'shipped';
  }
}
