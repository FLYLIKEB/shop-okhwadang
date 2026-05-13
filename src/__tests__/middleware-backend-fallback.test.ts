import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('next-intl/middleware', () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en'], defaultLocale: 'ko' },
}));

import { middleware, resetPublicKeyCache, setTestPublicKey } from '@/middleware';

const ORIGINAL_BACKEND_URL = process.env.BACKEND_URL;
const ORIGINAL_JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;

function makeRequest(pathname: string, cookie = 'accessToken=opaque-token'): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: { cookie },
  });
}

describe('middleware backend admin-role fallback', () => {
  beforeEach(() => {
    resetPublicKeyCache();
    setTestPublicKey('');
    process.env.BACKEND_URL = 'http://backend.test';
    delete process.env.JWT_PUBLIC_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPublicKeyCache();
    setTestPublicKey('');
    if (ORIGINAL_BACKEND_URL === undefined) {
      delete process.env.BACKEND_URL;
    } else {
      process.env.BACKEND_URL = ORIGINAL_BACKEND_URL;
    }
    if (ORIGINAL_JWT_PUBLIC_KEY === undefined) {
      delete process.env.JWT_PUBLIC_KEY;
    } else {
      process.env.JWT_PUBLIC_KEY = ORIGINAL_JWT_PUBLIC_KEY;
    }
  });

  it('allows /admin when JWT_PUBLIC_KEY is unavailable but backend /auth/me confirms admin role', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(String(url)).toBe('http://backend.test/api/auth/me');
      expect(init?.headers).toEqual({ cookie: 'accessToken=opaque-token' });
      return new Response(JSON.stringify({ id: 1, role: 'admin' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = await middleware(makeRequest('/ko/admin'));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redirects /admin when backend fallback returns a non-admin role', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ id: 2, role: 'user' }), { status: 200 })),
    );

    const res = await middleware(makeRequest('/ko/admin'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/ko/');
  });

  it('does not fallback to backend when a configured public key rejects the token', async () => {
    process.env.JWT_PUBLIC_KEY = 'configured-but-invalid-key';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await middleware(makeRequest('/ko/admin', 'accessToken=forged.token.value'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/ko/');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
