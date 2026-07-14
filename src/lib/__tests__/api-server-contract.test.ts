import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPage, fetchSettingsMap } from '@/lib/api-server';

const ORIGINAL_BACKEND_URL = process.env.BACKEND_URL;
const ORIGINAL_CI = process.env.CI;

describe('api-server backend URL contract', () => {
  beforeEach(() => {
    process.env.BACKEND_URL = 'https://backend.example/api/';
    delete process.env.CI;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_BACKEND_URL === undefined) {
      delete process.env.BACKEND_URL;
    } else {
      process.env.BACKEND_URL = ORIGINAL_BACKEND_URL;
    }
    if (ORIGINAL_CI === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = ORIGINAL_CI;
    }
  });

  it('builds the settings map SSR URL from the canonical backend origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ mobile_bottom_nav_visible: 'true' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchSettingsMap('en');

    expect(result).toEqual({ mobile_bottom_nav_visible: 'true' });
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example/api/settings/map?locale=en', {
      next: { revalidate: 300, tags: ['settings', 'theme'] },
    });
  });

  it('builds CMS page SSR URLs from the same backend contract', async () => {
    const page = { id: 1, slug: 'home', title: 'Home', blocks: [] };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(page), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchPage('home', 'en');

    expect(fetchMock).toHaveBeenCalledWith('https://backend.example/api/pages/home?locale=en', {
      next: { revalidate: 300, tags: ['cms', 'page:home'] },
    });
  });
});
