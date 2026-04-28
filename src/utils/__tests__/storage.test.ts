import { afterEach, describe, expect, it, vi } from 'vitest';
import { getStorageItem, removeStorageItem, setStorageItem } from '@/utils/storage';

describe('storage utils', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('reads and writes JSON values through localStorage', () => {
    setStorageItem('view-mode', { mode: 'grid' });

    expect(localStorage.getItem('view-mode')).toBe('{"mode":"grid"}');
    expect(getStorageItem('view-mode', { mode: 'list' })).toEqual({ mode: 'grid' });
  });

  it('returns the default value for missing or malformed entries', () => {
    localStorage.setItem('broken', '{not-json');

    expect(getStorageItem('missing', 'fallback')).toBe('fallback');
    expect(getStorageItem('broken', 'fallback')).toBe('fallback');
  });

  it('ignores storage access failures', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getStorageItem('key', 123)).toBe(123);
    expect(() => setStorageItem('key', 456)).not.toThrow();
    expect(() => removeStorageItem('key')).not.toThrow();
  });

  it('removes stored values', () => {
    setStorageItem('dismissed', true);
    removeStorageItem('dismissed');

    expect(getStorageItem('dismissed', false)).toBe(false);
  });
});
