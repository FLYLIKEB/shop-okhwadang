import { getPricingKrwPerUsd, resolveProductPricing } from './product-pricing.util';

describe('English product pricing', () => {
  const product = { price: 20000, salePrice: 15000, priceUsd: 20.99, salePriceUsd: 12.34 };
  it('keeps Korean prices and ignores an orphan USD sale price after clearing the base', () => {
    expect(resolveProductPricing(product, 'ko', 100)).toEqual({ unitPrice: 15100 });
    expect(resolveProductPricing({ ...product, priceUsd: null }, 'en', 100, 1400)).toEqual({ unitPrice: 15100, unitPriceUsd: 10.79, pricingKrwPerUsd: 1400 });
  });
  it('uses exact dedicated cents with the supplied authoritative server rate', () => {
    expect(resolveProductPricing(product, 'en', 1000, 1400)).toEqual({ unitPrice: 18270, unitPriceUsd: 13.05, pricingKrwPerUsd: 1400 });
  });
  it('rounds fallback base plus option together and retains the old KRW ledger', () => {
    expect(resolveProductPricing({ price: 100 }, 'en', 100, 1350)).toEqual({ unitPrice: 200, unitPriceUsd: 0.15, pricingKrwPerUsd: 1350 });
  });
  it('rejects option adjustments that make a dedicated unit negative', () => {
    expect(() => resolveProductPricing({ price: 10000, priceUsd: 1 }, 'en', -2000, 1350)).toThrow();
  });
  it.each([10000000, Number.MAX_SAFE_INTEGER, Infinity])('rejects a dedicated USD price outside the KRW ledger range (%s)', (priceUsd) => {
    expect(() => resolveProductPricing({ price: 10000, priceUsd }, 'en', 0, 1350)).toThrow('상품 가격이 지원 범위를 초과했습니다.');
  });
  it('reads the canonical configured rate rather than a frontend default', () => {
    const previous = process.env.PAYPAL_KRW_PER_USD;
    try {
      process.env.PAYPAL_KRW_PER_USD = '1475.25';
      expect(getPricingKrwPerUsd()).toBe(1475.25);
      process.env.PAYPAL_KRW_PER_USD = '1';
      expect(() => getPricingKrwPerUsd()).toThrow();
    } finally {
      if (previous === undefined) delete process.env.PAYPAL_KRW_PER_USD;
      else process.env.PAYPAL_KRW_PER_USD = previous;
    }
  });
});
