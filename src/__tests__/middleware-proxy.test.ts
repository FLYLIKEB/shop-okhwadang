import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en'], defaultLocale: 'ko' },
}));

import { middleware } from '@/middleware';

const ORIGINAL_BACKEND_URL = process.env.BACKEND_URL;

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(`https://ockhwadang.com${pathname}`, {
    headers: { cookie: 'accessToken=opaque-token; refreshToken=refresh-token' },
  });
}

describe('middleware /api proxy contract', () => {
  beforeEach(() => {
    process.env.BACKEND_URL = 'https://backend.example/api/';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (ORIGINAL_BACKEND_URL === undefined) {
      delete process.env.BACKEND_URL;
    } else {
      process.env.BACKEND_URL = ORIGINAL_BACKEND_URL;
    }
  });

  it('proxies locale-prefixed /api requests through the canonical backend origin', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('https://backend.example/api/health?full=1');
      expect(init?.method).toBe('GET');
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await middleware(makeRequest('/ko/api/health?full=1'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-proxy-by')).toBe('Next.js Middleware');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
