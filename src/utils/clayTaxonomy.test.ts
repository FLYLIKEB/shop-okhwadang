import { describe, expect, it } from 'vitest';
import { CLAY_KEYS, normalizeClayKey, type ClayKey } from '@/utils/clayTaxonomy';

const aliases: Record<ClayKey, string[]> = {
  zuni: ['주니', '朱泥', 'ZUNI', 'premium zhuni clay'],
  danni: ['단니', '段泥', 'DANNI', 'duanni pot'],
  zini: ['자니', '紫泥', 'ZINI', 'zisha ware'],
  heukni: ['흑니', '黑泥', 'HEUKNI', 'heini finish'],
  chunsuni: ['청수니', '靑水泥', '清水泥', 'CHUNSUNI', 'qingshuini'],
  nokni: ['녹니', '綠泥', '绿泥', 'NOKNI', 'luni'],
};

describe('normalizeClayKey', () => {
  it('normalizes Korean, Hanja, and English aliases to stable clay keys', () => {
    expect(CLAYER_KEYS_FOR_TEST()).toEqual(['zuni', 'danni', 'zini', 'heukni', 'chunsuni', 'nokni']);

    for (const [key, values] of Object.entries(aliases) as Array<[ClayKey, string[]]>) {
      for (const value of values) {
        expect(normalizeClayKey(value)).toBe(key);
      }
    }
  });

  it('matches aliases case-insensitively inside category labels', () => {
    expect(normalizeClayKey('Handmade ZUNI teapot')).toBe('zuni');
    expect(normalizeClayKey('  premium 청수니 category  ')).toBe('chunsuni');
  });

  it('returns null for unknown or empty values so callers keep generic fallbacks', () => {
    expect(normalizeClayKey('자사호')).toBeNull();
    expect(normalizeClayKey('')).toBeNull();
    expect(normalizeClayKey(null)).toBeNull();
    expect(normalizeClayKey(undefined)).toBeNull();
  });
});

function CLAYER_KEYS_FOR_TEST(): ClayKey[] {
  return [...CLAY_KEYS];
}
