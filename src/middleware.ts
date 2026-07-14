import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/.*)?$`);
const LOCALE_COOKIE_NAME = 'NEXT_LOCALE';
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function shouldUseSecureLocaleCookie(request: NextRequest): boolean {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  // Service risk: forcing `Secure` on plain HTTP breaks locale persistence in local/dev.
  // Keep this tied to real HTTPS so production is hardened without making localhost fail.
  return request.nextUrl.protocol === 'https:' || forwardedProto === 'https';
}

function withLocaleCookie(
  request: NextRequest,
  response: Response,
  localePrefix: string,
  pathnameWithoutLocale: string,
): Response {
  if (!localePrefix || pathnameWithoutLocale.startsWith('/api')) {
    return response;
  }

  const nextResponse = response instanceof NextResponse
    ? response
    : new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });

  nextResponse.cookies.set(LOCALE_COOKIE_NAME, localePrefix.slice(1), {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: shouldUseSecureLocaleCookie(request),
    httpOnly: true,
  });

  return nextResponse;
}

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

type AdminRoleCheckResult = 'admin' | 'not-admin' | 'unverified';

export function resetPublicKeyCache(): void {
  testPublicKey = null;
}

let testPublicKey: string | null = null;

export function setTestPublicKey(pem: string): void {
  testPublicKey = pem.trim() ? pem : null;
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

function hasConfiguredPublicKey(): boolean {
  return Boolean(testPublicKey ?? process.env.JWT_PUBLIC_KEY);
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

async function hasAdminRoleByJwt(token: string): Promise<AdminRoleCheckResult> {
  const payload = await verifyRS256(token);
  if (!payload) return 'unverified';
  return typeof payload.role === 'string' && ADMIN_ROLES.has(payload.role) ? 'admin' : 'not-admin';
}

function getBackendAuthMeUrl(): string | null {
  const backendUrl = process.env.BACKEND_URL?.trim();
  if (!backendUrl) return null;

  const normalized = backendUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? `${normalized}/auth/me` : `${normalized}/api/auth/me`;
}

async function hasAdminRoleByBackend(cookieHeader: string | null): Promise<boolean> {
  const url = getBackendAuthMeUrl();
  if (!url || !cookieHeader) return false;

  try {
    const response = await fetch(url, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return false;

    const profile = await response.json() as { role?: unknown };
    return typeof profile.role === 'string' && ADMIN_ROLES.has(profile.role);
  } catch {
    return false;
  }
}

async function hasAdminRole(token: string, cookieHeader: string | null): Promise<boolean> {
  const jwtResult = await hasAdminRoleByJwt(token);
  if (jwtResult === 'admin') return true;
  if (jwtResult === 'not-admin' || hasConfiguredPublicKey()) return false;

  // In local/Vercel deployments the Edge middleware may not have JWT_PUBLIC_KEY,
  // while the backend still has the private/public key pair and can validate the
  // httpOnly cookie. Fall back to the backend profile endpoint only when local
  // verification is impossible, not when a configured key rejects the token.
  return hasAdminRoleByBackend(cookieHeader);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const localeMatch = pathname.match(localePattern);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
  const pathnameWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;
  const finalizeResponse = (response: Response) => withLocaleCookie(request, response, localePrefix, pathnameWithoutLocale);

  if (pathnameWithoutLocale === '/sitemap.xml' || pathnameWithoutLocale === '/robots.txt') {
    return finalizeResponse(NextResponse.next());
  }

  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return finalizeResponse(NextResponse.redirect(loginUrl));
    }
    if (!(await hasAdminRole(token, request.headers.get('cookie')))) {
      return finalizeResponse(NextResponse.redirect(new URL(`${localePrefix}/`, request.url)));
    }
  }

  if (pathnameWithoutLocale.startsWith('/my') || pathnameWithoutLocale.startsWith('/checkout')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return finalizeResponse(NextResponse.redirect(loginUrl));
    }
  }

  if (pathnameWithoutLocale.startsWith('/api')) {
    // Proxy to backend using runtime BACKEND_URL
    const backendUrl = process.env.BACKEND_URL;

    if (!backendUrl) {
      return finalizeResponse(NextResponse.json(
        { error: 'BACKEND_URL not configured' },
        { status: 500 }
      ));
    }

    const apiPath = pathname.startsWith('/api')
      ? pathname
      : pathname.replace(/^\/[a-z]{2}\/api/, '/api'); // handle /ko/api -> /api

    const search = new URL(request.url).search || request.nextUrl.search;
    const url = `${backendUrl}${apiPath}${search}`;

    // Forward request to backend
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (!['host', 'connection', 'content-length'].includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    const method = request.method.toUpperCase();

    try {
      const init: RequestInit = {
        method,
        headers,
        redirect: 'follow',
      };

      if (method !== 'GET' && method !== 'HEAD') {
        init.body = await request.arrayBuffer();
      }

      const response = await fetch(url, {
        ...init,
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

      return finalizeResponse(new NextResponse(data, {
        status: response.status,
        headers: responseHeaders,
      }));
    } catch (error) {
      return finalizeResponse(NextResponse.json(
        { error: 'Backend unreachable', details: String(error) },
        { status: 502 }
      ));
    }
  }

  return finalizeResponse(intlMiddleware(request));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|ttf|woff|woff2|eot|otf)$).*)',
  ],
};
