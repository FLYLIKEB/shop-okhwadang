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

/** Build a minimal JWT-shaped token with the given payload (no real signature). */
function makeToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  return `${header}.${body}.fakesig`;
}

const ADMIN_TOKEN = makeToken({ sub: '1', role: 'admin' });
const SUPER_ADMIN_TOKEN = makeToken({ sub: '2', role: 'super_admin' });
const USER_TOKEN = makeToken({ sub: '3', role: 'user' });

function makeRequest(pathname: string, token?: string): NextRequest {
  const url = `http://localhost${pathname}`;
  const req = new NextRequest(url);
  if (token) {
    req.cookies.set('accessToken', token);
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

  it('passes through /admin when accessToken cookie has admin role', () => {
    const req = makeRequest('/admin', ADMIN_TOKEN);
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('passes through /admin when accessToken cookie has super_admin role', () => {
    const req = makeRequest('/admin', SUPER_ADMIN_TOKEN);
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects /admin to / when accessToken cookie has non-admin role', () => {
    const req = makeRequest('/admin', USER_TOKEN);
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/');
    expect(location).not.toContain('/login');
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

  it('passes through locale-prefixed admin when token has admin role', () => {
    const req = makeRequest('/en/admin', ADMIN_TOKEN);
    const res = middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects locale-prefixed /ko/admin to /ko/ when token has non-admin role', () => {
    const req = makeRequest('/ko/admin', USER_TOKEN);
    const res = middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ko/');
    expect(location).not.toContain('/login');
  });
});
