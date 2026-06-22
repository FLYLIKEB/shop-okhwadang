import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import enMessages from '@/i18n/messages/en.json';
import { handleApiError } from '@/utils/error';

const HANGUL_PATTERN = /[가-힣]/;

function collectHangulStrings(value: unknown, path = ''): string[] {
  if (typeof value === 'string') {
    return HANGUL_PATTERN.test(value) ? [`${path}: ${value}`] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectHangulStrings(item, `${path}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) =>
      collectHangulStrings(nested, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

describe('English locale Korean text guard', () => {
  const originalPathname = window.location.pathname;
  const originalLang = document.documentElement.lang;

  beforeEach(() => {
    document.documentElement.lang = 'en';
    window.history.replaceState(null, '', '/en/products');
  });

  afterEach(() => {
    document.documentElement.lang = originalLang;
    window.history.replaceState(null, '', originalPathname);
  });

  it('keeps en.json free of Hangul strings', () => {
    expect(collectHangulStrings(enMessages)).toEqual([]);
  });

  it('does not expose Korean backend/API errors on English pages', () => {
    expect(handleApiError(new Error('접근 권한이 없습니다.'), 'Failed to load data.')).toBe(
      'You do not have permission to access this.',
    );
    expect(handleApiError(new Error('서버에서 발생한 한국어 오류'), 'Failed to load data.')).toBe(
      'Failed to load data.',
    );
    expect(handleApiError(new Error('서버에서 발생한 한국어 오류'))).toBe('An error occurred.');
  });
});
