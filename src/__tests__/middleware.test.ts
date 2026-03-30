import { describe, it, expect } from 'vitest';
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
});
