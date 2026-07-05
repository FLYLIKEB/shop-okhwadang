import { describe, expect, it } from 'vitest';
import { formatDate, formatLongDate } from '@/utils/date';

describe('date formatting', () => {
  it('formats short dates with an explicit UTC timezone for hydration stability', () => {
    expect(formatDate('2026-01-02T23:30:00.000Z', 'ko')).toBe('2026. 1. 2.');
    expect(formatDate('2026-01-02T23:30:00.000Z', 'en')).toBe('1/2/2026');
  });

  it('formats long dates with an explicit UTC timezone for hydration stability', () => {
    expect(formatLongDate('2026-01-02T23:30:00.000Z', 'ko')).toBe('2026년 1월 2일');
    expect(formatLongDate('2026-01-02T23:30:00.000Z', 'en')).toBe('January 2, 2026');
  });
});
