import { describe, expect, it } from 'vitest';
import { isSafeUrl } from '@/utils/url';

describe('isSafeUrl', () => {
  it('allows relative application paths', () => {
    expect(isSafeUrl('/products')).toBe(true);
    expect(isSafeUrl('/search?q=teapot')).toBe(true);
  });

  it('rejects empty, protocol-relative, and absolute URLs', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('//evil.example/path')).toBe(false);
    expect(isSafeUrl('https://example.com')).toBe(false);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });
});
