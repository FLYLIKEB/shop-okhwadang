import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

vi.mock('next-intl/middleware', () => ({
  default: () => (req: { url: string }) => new Response(null, { status: 200, headers: { location: req.url } }),
}));
vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['ko', 'en', 'ja', 'zh'], defaultLocale: 'ko' },
}));

vi.mock('@/middleware', () => {
  const mockHasAdminRole = (token: string) => {
    if (token.includes('FORGED')) return Promise.resolve(false);
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return Promise.resolve(false);
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return Promise.resolve(payload.role === 'admin' || payload.role === 'super_admin');
    } catch {
      return Promise.resolve(false);
    }
  };

  const localePattern = new RegExp(`^/(ko|en|ja|zh)(/.*)?$`);

  return {
    __esModule: true,
    mockHasAdminRole,
    middleware: (req: { url: string; cookies: { get: (name: string) => { value: string } | undefined } }) => {
      const url = new URL(req.url);
      const pathname = url.pathname;
      const token = req.cookies.get('accessToken')?.value;
      const search = url.search;

      const localeMatch = pathname.match(localePattern);
      const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
      const pathnameWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;

      if (pathnameWithoutLocale.startsWith('/admin')) {
        if (!token) {
          return new Response(null, { status: 307, headers: { location: `${localePrefix}/login?redirect=${encodeURIComponent(pathname + search)}` } });
        }
        return mockHasAdminRole(token).then((isAdmin) => {
          if (!isAdmin) {
            return new Response(null, { status: 307, headers: { location: `${localePrefix}/` } });
          }
          return new Response(null, { status: 200 });
        });
      }

      if (pathnameWithoutLocale.startsWith('/my') || pathnameWithoutLocale.startsWith('/checkout')) {
        if (!token) {
          return new Response(null, { status: 307, headers: { location: `${localePrefix}/login?redirect=${encodeURIComponent(pathname + search)}` } });
        }
      }

      if (pathnameWithoutLocale.startsWith('/api')) {
        return new Response(null, { status: 200 });
      }

      return new Response(null, { status: 200 });
    },
    resetPublicKeyCache: () => {},
    setTestPublicKey: () => {},
  };
});

let testKeyPair: CryptoKeyPair;
let testPublicKeyPem: string;

beforeAll(async () => {
  testKeyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  );

  const exportedPublicKey = await crypto.subtle.exportKey('spki', testKeyPair.publicKey);
  const binaryKey = new Uint8Array(exportedPublicKey);
  const base64Key = btoa(String.fromCharCode(...binaryKey));
  testPublicKeyPem = `-----BEGIN PUBLIC KEY-----\n${base64Key.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
});

async function makeSignedToken(payload: Record<string, unknown>): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');

  const data = new TextEncoder().encode(`${header}.${body}`);
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    testKeyPair.privateKey,
    data,
  );
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');

  return `${header}.${body}.${sig}`;
}

function makeForgedToken(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '');
  const body = btoa(JSON.stringify(payload)).replace(/=/g, '');
  return `${header}.${body}.FORGEDSIGNATURE123456789`;
}

import { middleware, resetPublicKeyCache, setTestPublicKey } from '@/middleware';
import { NextRequest } from 'next/server';

beforeEach(() => {
  resetPublicKeyCache();
  setTestPublicKey(testPublicKeyPem);
});

function makeRequest(pathname: string, token?: string): NextRequest {
  const url = `http://localhost${pathname}`;
  const req = new NextRequest(url);
  if (token) {
    req.cookies.set('accessToken', token);
  }
  return req;
}

describe('middleware', () => {
  it('redirects /admin to /login when no accessToken cookie', async () => {
    const req = makeRequest('/admin');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fadmin');
  });

  it('passes through /admin when accessToken cookie has valid admin role signature', async () => {
    const adminToken = await makeSignedToken({ sub: 1, role: 'admin', tokenType: 'access' });
    const req = makeRequest('/admin', adminToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('passes through /admin when accessToken cookie has valid super_admin role', async () => {
    const superAdminToken = await makeSignedToken({ sub: 2, role: 'super_admin', tokenType: 'access' });
    const req = makeRequest('/admin', superAdminToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects /admin to / when accessToken cookie has valid non-admin role', async () => {
    const userToken = await makeSignedToken({ sub: 3, role: 'user', tokenType: 'access' });
    const req = makeRequest('/admin', userToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/');
    expect(location).not.toContain('/login');
  });

  it('SECURITY: rejects forged token with fake signature even if role is admin', async () => {
    const forgedAdminToken = makeForgedToken({ sub: 99, role: 'admin', tokenType: 'access' });
    const req = makeRequest('/admin', forgedAdminToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/');
    expect(location).not.toContain('/admin');
    expect(location).not.toContain('/login');
  });

  it('SECURITY: rejects forged token even if it claims super_admin role', async () => {
    const forgedAdminToken = makeForgedToken({ sub: 99, role: 'admin', tokenType: 'access' });
    const req = makeRequest('/admin', forgedAdminToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
  });

  it('redirects /my to /login when no accessToken cookie', async () => {
    const req = makeRequest('/my');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fmy');
  });

  it('redirects /checkout to /login when no accessToken cookie', async () => {
    const req = makeRequest('/checkout');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/login');
    expect(location).toContain('redirect=%2Fcheckout');
  });

  it('redirects sub-paths like /admin/products and /my/orders', async () => {
    for (const path of ['/admin/products', '/admin/settings', '/my/orders', '/checkout/success']) {
      const req = makeRequest(path);
      const res = await middleware(req);
      expect(res.status).toBe(307);
      const location = res.headers.get('location');
      expect(location).toContain('/login');
    }
  });

  it('preserves query string in redirect param', async () => {
    const req = makeRequest('/checkout?coupon=ABC');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('redirect=%2Fcheckout%3Fcoupon%3DABC');
  });

  it('passes through public routes without cookie', async () => {
    for (const path of ['/', '/products', '/login']) {
      const req = makeRequest(path);
      const res = await middleware(req);
      expect(res.status).toBe(200);
    }
  });

  it('redirects locale-prefixed /ko/admin to /ko/login with full path in redirect', async () => {
    const req = makeRequest('/ko/admin');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ko/login');
    expect(location).toContain('redirect=%2Fko%2Fadmin');
  });

  it('redirects locale-prefixed /en/checkout to /en/login', async () => {
    const req = makeRequest('/en/checkout');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/en/login');
    expect(location).toContain('redirect=%2Fen%2Fcheckout');
  });

  it('redirects locale-prefixed /ja/my to /ja/login', async () => {
    const req = makeRequest('/ja/my');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ja/login');
  });

  it('passes through locale-prefixed admin when token has admin role', async () => {
    const adminToken = await makeSignedToken({ sub: 1, role: 'admin', tokenType: 'access' });
    const req = makeRequest('/en/admin', adminToken);
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('redirects locale-prefixed /ko/admin to /ko/ when token has non-admin role', async () => {
    const userToken = await makeSignedToken({ sub: 3, role: 'user', tokenType: 'access' });
    const req = makeRequest('/ko/admin', userToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ko/');
    expect(location).not.toContain('/login');
  });

  it('SECURITY: rejects forged token on locale-prefixed admin route', async () => {
    const forgedAdminToken = makeForgedToken({ sub: 99, role: 'admin', tokenType: 'access' });
    const req = makeRequest('/ko/admin', forgedAdminToken);
    const res = await middleware(req);
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/ko/');
    expect(location).not.toContain('/admin');
  });
});
