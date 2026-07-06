import { describe, expect, it } from 'vitest';
import { toAttributeFilterOptions } from '@/lib/attributeFilterOptions';

describe('toAttributeFilterOptions', () => {
  it('uses attrs values as the filter source and keeps display labels separate', () => {
    expect(toAttributeFilterOptions([
      { value: 'zini', displayValue: '자니' },
      { value: 'duanni', displayValue: '단니' },
    ])).toEqual([
      { value: 'zini', label: '자니' },
      { value: 'duanni', label: '단니' },
    ]);
  });

  it('deduplicates by attrs value and prefers a display label when available', () => {
    expect(toAttributeFilterOptions([
      'zini',
      { value: 'zini', displayValue: '자니' },
      { value: 'duanni', displayValue: '' },
      { value: 'duanni', displayValue: '단니' },
      { value: ' ', displayValue: '빈 값' },
    ])).toEqual([
      { value: 'zini', label: '자니' },
      { value: 'duanni', label: '단니' },
    ]);
  });
});
