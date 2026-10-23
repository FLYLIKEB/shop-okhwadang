import { BadRequestException } from '@nestjs/common';
import { createPaymentConfig } from '../../config/payment.config';

export function getPricingKrwPerUsd(): number {
  const rate = createPaymentConfig().paypal.krwPerUsd;
  if (!Number.isFinite(rate) || rate < 100 || rate > 10000) {
    throw new BadRequestException('상품 환율 설정이 유효하지 않습니다.');
  }
  return rate;
}

export function usdCents(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function resolveProductPricing(
  product: { price: number; salePrice?: number | null; priceUsd?: number | null; salePriceUsd?: number | null },
  locale?: string,
  adjustment = 0,
  rate = locale === 'en' ? getPricingKrwPerUsd() : undefined,
): { unitPrice: number; unitPriceUsd?: number; pricingKrwPerUsd?: number } {
  const krw = Number(product.salePrice ?? product.price);
  if (locale !== 'en' || rate === undefined) {
    if (krw + adjustment < 0) throw new BadRequestException('상품 옵션 가격이 유효하지 않습니다.');
    return { unitPrice: krw + adjustment };
  }
  const usd = product.priceUsd == null ? null : Number(product.salePriceUsd ?? product.priceUsd);
  const cents = usd == null ? usdCents((krw + adjustment) / rate) : usdCents(usd) + usdCents(adjustment / rate);
  if (cents < 0 || krw + adjustment < 0 && usd == null) throw new BadRequestException('상품 옵션 가격이 유효하지 않습니다.');
  const unitPrice = usd == null ? krw + adjustment : Math.round(cents * rate / 100);
  if (!Number.isSafeInteger(cents) || !Number.isFinite(unitPrice)
    || (usd != null && (!Number.isSafeInteger(unitPrice) || unitPrice > 9999999999.99))) {
    throw new BadRequestException('상품 가격이 지원 범위를 초과했습니다.');
  }
  return {
    unitPrice,
    unitPriceUsd: cents / 100,
    pricingKrwPerUsd: rate,
  };
}
