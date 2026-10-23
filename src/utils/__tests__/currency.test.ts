import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcDiscount, convertPrice, formatCurrency, productDisplayPricing, productCartPricing } from '@/utils/currency';

describe('calcDiscount', () => {
  it('할인율을 반올림한 정수로 계산', () => {
    expect(calcDiscount(30000, 25000)).toBe(17);
  });

  it('원가가 0 이하이면 0 반환', () => {
    expect(calcDiscount(0, 1000)).toBe(0);
    expect(calcDiscount(-1000, 500)).toBe(0);
  });
});

describe('convertPrice', () => {
  it('KRW는 그대로 반환', () => {
    expect(convertPrice(15000, 'KRW')).toBe(15000);
  });

  it('USD 변환: 15000 KRW / 1350 = 11.111...', () => {
    expect(convertPrice(15000, 'USD')).toBeCloseTo(11.111, 2);
  });
});

describe('formatCurrency', () => {
  it('ko 로케일: ₩15,000', () => {
    expect(formatCurrency(15000, 'ko')).toBe('₩15,000');
  });

  it('en 로케일: $11.11 (KRW 1,350 기준)', () => {
    expect(formatCurrency(15000, 'en')).toBe('$11.11');
  });

  it('기본 로케일은 ko', () => {
    expect(formatCurrency(15000)).toBe('₩15,000');
  });

  it('0원은 ₩0으로 포맷', () => {
    expect(formatCurrency(0, 'ko')).toBe('₩0');
  });

  it('KRW 축약 표기 옵션을 지원', () => {
    expect(formatCurrency(150000, 'ko', { abbreviated: true })).toBe('15만');
    expect(formatCurrency(9500, 'ko', { abbreviated: true })).toBe('9,500');
  });

  it('USD는 축약 옵션이 있어도 통화 포맷 유지', () => {
    expect(formatCurrency(13500, 'en', { abbreviated: true })).toBe('$10.00');
  });
});

describe('NEXT_PUBLIC_EXCHANGE_RATES 환경변수', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('환경변수로 환율 오버라이드 가능', () => {
    vi.stubEnv('NEXT_PUBLIC_EXCHANGE_RATES', JSON.stringify({ USD: 1000 }));
    // 환율 오버라이드: 15000 / 1000 = 15 USD
    expect(convertPrice(15000, 'USD')).toBeCloseTo(15, 2);
  });

  it('환경변수에 USD가 없으면 기본 USD 환율 사용', () => {
    vi.stubEnv('NEXT_PUBLIC_EXCHANGE_RATES', JSON.stringify({}));
    expect(convertPrice(15000, 'USD')).toBeCloseTo(11.111, 2);
  });

  it('잘못된 환경변수는 기본값 사용', () => {
    vi.stubEnv('NEXT_PUBLIC_EXCHANGE_RATES', 'invalid-json');
    expect(convertPrice(15000, 'USD')).toBeCloseTo(11.111, 2);
  });
});

describe('authoritative USD pricing', () => {
  it('formats direct USD without converting it again', () => {
    expect(formatCurrency(12.34, 'en', { currency: 'USD' })).toBe('$12.34');
    expect(formatCurrency(20000, 'en', { exchangeRate: 2000 })).toBe('$10.00');
  });
});

it('uses dedicated USD sale only with USD base, preserving Korean prices', () => {
  const product = { price: 20000, salePrice: 16000, priceUsd: 12.34, salePriceUsd: 10.25, pricingKrwPerUsd: 2000 };
  expect(productDisplayPricing(product, 'en')).toMatchObject({ price: 12.34, salePrice: 10.25, options: { currency: 'USD' } });
  expect(productDisplayPricing(product, 'ko')).toMatchObject({ price: 20000, salePrice: 16000 });
  expect(productDisplayPricing({ ...product, priceUsd: null }, 'en').salePrice).toBe(16000);
  expect(productCartPricing(product, 'en', 2000)).toEqual({ unitPrice: 22500, unitPriceUsd: 11.25, pricingKrwPerUsd: 2000 });
  expect(productCartPricing({ ...product, salePriceUsd: 0 }, 'en')).toMatchObject({ unitPrice: 0, unitPriceUsd: 0 });
});

it('preserves KRW fallback and rounds dedicated base and option independently', () => {
  expect(productCartPricing({ price: 10001, salePrice: null, pricingKrwPerUsd: 2000 }, 'en', 1)).toMatchObject({ unitPrice: 10002, unitPriceUsd: 5 });
  expect(productCartPricing({ price: 10001, salePrice: null, priceUsd: 1.005, pricingKrwPerUsd: 2000 }, 'en', 10)).toMatchObject({ unitPriceUsd: 1.01 });
});
