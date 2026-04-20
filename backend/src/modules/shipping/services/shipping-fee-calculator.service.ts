import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../settings/settings.service';
import { isRemoteAreaZipcode } from '../utils/remote-area.util';

const DEFAULT_FREE_SHIPPING_THRESHOLD = 50000;
const DEFAULT_BASE_SHIPPING_FEE = 3000;
const DEFAULT_REMOTE_AREA_SURCHARGE = 3000;

export interface ShippingFeeQuote {
  subtotal: number;
  zipcode: string;
  shippingFee: number;
  isFreeShipping: boolean;
  isRemoteArea: boolean;
  threshold: number;
  baseFee: number;
  remoteAreaSurcharge: number;
}

@Injectable()
export class ShippingFeeCalculatorService {
  constructor(private readonly settingsService: SettingsService) {}

  async calculate(subtotal: number, zipcode: string): Promise<ShippingFeeQuote> {
    const safeSubtotal = Math.max(0, Math.floor(subtotal));

    const [threshold, baseFee, remoteAreaSurcharge] = await Promise.all([
      this.settingsService.getNumber('free_shipping_threshold', DEFAULT_FREE_SHIPPING_THRESHOLD),
      this.settingsService.getNumber('shipping_base_fee', DEFAULT_BASE_SHIPPING_FEE),
      this.settingsService.getNumber('remote_area_surcharge', DEFAULT_REMOTE_AREA_SURCHARGE),
    ]);

    const isFreeShipping = safeSubtotal >= threshold;
    const isRemoteArea = isRemoteAreaZipcode(zipcode);

    const shippingFee = (isFreeShipping ? 0 : baseFee) + (isRemoteArea ? remoteAreaSurcharge : 0);

    return {
      subtotal: safeSubtotal,
      zipcode,
      shippingFee,
      isFreeShipping,
      isRemoteArea,
      threshold,
      baseFee,
      remoteAreaSurcharge,
    };
  }
}
