import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPage } from '../api-server';

describe('fetchPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns null only when the CMS page is actually missing', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: vi.fn().mockResolvedValue({ message: 'not found' }),
    } as unknown as Response);

    await expect(fetchPage('home', 'ko')).resolves.toBeNull();
  });

  it('rethrows non-404 backend failures so route errors can distinguish runtime issues', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ message: 'backend exploded' }),
    } as unknown as Response);

    await expect(fetchPage('home', 'ko')).rejects.toThrow('backend exploded');
  });
});
