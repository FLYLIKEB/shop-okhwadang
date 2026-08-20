import { describe, expect, it } from 'vitest';
import { formatCount, formatDate, formatDateTime, formatLongDate } from '@/utils/date';

describe('date and count formatting', () => {
  it('formats short dates with an explicit UTC timezone for hydration stability', () => {
    expect(formatDate('2026-01-02T23:30:00.000Z', 'ko')).toBe('2026. 1. 2.');
    expect(formatDate('2026-01-02T23:30:00.000Z', 'en')).toBe('1/2/2026');
  });

  it('formats long dates with an explicit UTC timezone for hydration stability', () => {
    expect(formatLongDate('2026-01-02T23:30:00.000Z', 'ko')).toBe('2026년 1월 2일');
    expect(formatLongDate('2026-01-02T23:30:00.000Z', 'en')).toBe('January 2, 2026');
  });

  it('formats date-time values with explicit locale and UTC policies', () => {
    expect(formatDateTime('2026-01-02T23:30:00.000Z', 'ko')).toBe('2026. 1. 2. 23:30');
    expect(formatDateTime('2026-01-02T23:30:00.000Z', 'en')).toBe('1/2/2026, 23:30');
  });

  it('supports date-time option overrides while keeping UTC fixed', () => {
    expect(formatDateTime('2026-01-02T23:30:00.000Z', 'en', {
      month: 'short',
      hour: undefined,
      minute: undefined,
    })).toBe('Jan 2, 2026');
  });

  it('returns a stable fallback for invalid dates', () => {
    expect(formatDate('not-a-date', 'ko')).toBe('—');
    expect(formatLongDate('not-a-date', 'en')).toBe('—');
    expect(formatDateTime('not-a-date', 'ko')).toBe('—');
  });

  it('formats zero and large counts by locale', () => {
    expect(formatCount(0, 'ko')).toBe('0');
    expect(formatCount(1234567, 'ko')).toBe('1,234,567');
    expect(formatCount(1234567, 'en')).toBe('1,234,567');
  });
});
