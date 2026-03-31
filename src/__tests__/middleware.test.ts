import { describe, it, expect, vi } from 'vitest';

// next-intl/middleware imports next/server without .js extension which fails in Vitest ESM.
// Mock it to return a passthrough so auth-guard tests can run in isolation.
vi.mock('next-intl/middleware', () => ({
  default: () => (req: { url: string }) => new Response(null, { status: 200, headers: { location: req.url } }),
}));
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en', 'ja', 'zh'], defaultLocale: 'ko' },
}));

import { middleware } from '@/middleware';
import { NextRequest } from 'next/server';

function makeRequest(pathname: string, hasToken = false): NextRequest {
  const url = `http://localhost${pathname}`;
  const req = new NextRequest(url);
  if (hasToken) {
    req.cookies.set('accessToken', 'test-token');
  }
  return req;
}

describe('middleware', () => {
  it('redirects /admin to /login when no accessToken cookie', () => {
    const req = makeRequest('/admin');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fadmin');
  });

  it('passes through /admin when accessToken cookie is present', () => {
    const req = makeRequest('/admin', true);
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects /my to /login when no accessToken cookie', () => {
    const req = makeRequest('/my');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fmy');
  });

  it('redirects /checkout to /login when no accessToken cookie', () => {
    const req = makeRequest('/checkout');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fcheckout');
  });

  it('redirects sub-paths like /admin/products and /my/orders', () => {
    for (const path of ['/admin/products', '/admin/settings', '/my/orders', '/checkout/success']) {
      const req = makeRequest(path);
      const res = middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
    }
  });

  it('preserves query string in redirect param', () => {
    const req = makeRequest('/checkout?coupon=ABC');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('redirect=%2Fcheckout%3Fcoupon%3DABC');
  });

  it('passes through public routes without cookie', () => {
    for (const path of ['/', '/products', '/login']) {
      const req = makeRequest(path);
      const res = middleware(req);
      expect(res.status).toBe(200);
    }
  });

  it('redirects locale-prefixed /ko/admin to /ko/login with full path in redirect', () => {
    const req = makeRequest('/ko/admin');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ko/login');
    expect(location).toContain('redirect=%2Fko%2Fadmin');
  });

  it('redirects locale-prefixed /en/checkout to /en/login', () => {
    const req = makeRequest('/en/checkout');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/en/login');
    expect(location).toContain('redirect=%2Fen%2Fcheckout');
  });

  it('redirects locale-prefixed /ja/my to /ja/login', () => {
    const req = makeRequest('/ja/my');
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ja/login');
  });

  it('passes through locale-prefixed admin when token present', () => {
    const req = makeRequest('/en/admin', true);
    const res = middleware(req);
    expect(res.status).toBe(200);
  });
});
