import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/.*)?$`);

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

export function resetPublicKeyCache(): void {
  // No-op for backwards compatibility
}

let testPublicKey: string | null = null;

export function setTestPublicKey(pem: string): void {
  testPublicKey = pem;
}

async function getPublicKey(): Promise<CryptoKey | null> {
  const publicKeyPem = testPublicKey ?? process.env.JWT_PUBLIC_KEY;
  if (!publicKeyPem) return null;

  const keyType = publicKeyPem.includes('BEGIN PUBLIC KEY') ? 'spki' : 'raw';

  let binaryKey: ArrayBuffer;
  if (keyType === 'spki') {
    const pemBody = publicKeyPem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    const binaryStr = atob(pemBody);
    const keyBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      keyBytes[i] = binaryStr.charCodeAt(i);
    }
    binaryKey = keyBytes.buffer;
  } else {
    const binaryStr = atob(publicKeyPem);
    const keyBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      keyBytes[i] = binaryStr.charCodeAt(i);
    }
    binaryKey = keyBytes.buffer;
  }

  return crypto.subtle.importKey(
    'spki',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

async function verifyRS256(token: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    if (header.alg !== 'RS256' || header.typ !== 'JWT') return null;

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    const key = await getPublicKey();
    if (!key) return null;

    const signature = Uint8Array.from(
      atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    ).buffer;

    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

    const valid = await crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      key,
      signature,
      data,
    );

    if (!valid) return null;
    return payload;
  } catch {
    return null;
  }
}

async function hasAdminRole(token: string): Promise<boolean> {
  const payload = await verifyRS256(token);
  if (!payload) return false;
  return typeof payload.role === 'string' && ADMIN_ROLES.has(payload.role);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const localeMatch = pathname.match(localePattern);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
  const pathnameWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;

  if (pathnameWithoutLocale === '/sitemap.xml' || pathnameWithoutLocale === '/robots.txt') {
    return NextResponse.next();
  }

  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    if (!(await hasAdminRole(token))) {
      return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
    }
  }

  if (pathnameWithoutLocale.startsWith('/my') || pathnameWithoutLocale.startsWith('/checkout')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (pathnameWithoutLocale.startsWith('/api')) {
    // Proxy to backend using runtime BACKEND_URL
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return NextResponse.json(
        { error: 'BACKEND_URL not configured' },
        { status: 500 }
      );
    }

    const apiPath = pathname.startsWith('/api')
      ? pathname
      : pathname.replace(/^\/[a-z]{2}\/api/, '/api'); // handle /ko/api -> /api

    const search = new URL(request.url).search || request.nextUrl.search;
    const url = `${backendUrl}${apiPath}${search}`;

    // Forward request to backend
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    try {
      const response = await fetch(url, {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'follow',
      });

      const data = await response.arrayBuffer();

      const responseHeaders = new Headers();
      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        responseHeaders.set(key, value);
      });
      const setCookies = response.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        responseHeaders.append('set-cookie', cookie);
      }
      responseHeaders.set('X-Proxy-By', 'Next.js Middleware');

      return new NextResponse(data, {
        status: response.status,
        headers: responseHeaders,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Backend unreachable', details: String(error) },
        { status: 502 }
      );
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|ttf|woff|woff2|eot|otf)$).*)',
  ],
};
