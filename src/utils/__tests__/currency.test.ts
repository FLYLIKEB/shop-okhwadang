import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertPrice, formatCurrency } from '@/utils/currency';

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

  it('잘못된 환경변수는 기본값 사용', () => {
    vi.stubEnv('NEXT_PUBLIC_EXCHANGE_RATES', 'invalid-json');
    expect(convertPrice(15000, 'USD')).toBeCloseTo(11.111, 2);
  });
});
