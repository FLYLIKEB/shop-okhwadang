import { describe, expect, it } from 'vitest';
import { formatPhone } from '@/utils/phone';

describe('formatPhone', () => {
  it('formats Korean mobile numbers into international display form', () => {
    expect(formatPhone('01012345678')).toBe('+82 10-1234-5678');
    expect(formatPhone('010-1234-5678')).toBe('+82 10-1234-5678');
    expect(formatPhone('010 1234 5678')).toBe('+82 10-1234-5678');
  });

  it('formats Seoul and regional landline numbers', () => {
    expect(formatPhone('0212345678')).toBe('+82 0212345678');
    expect(formatPhone('0311234567')).toBe('+82 031-123-4567');
    expect(formatPhone('05112345678')).toBe('+82 051-1234-5678');
  });

  it('returns empty or original values when input cannot be normalized', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('대표번호')).toBe('대표번호');
  });
});
