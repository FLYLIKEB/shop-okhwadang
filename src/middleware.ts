import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { buildConfiguredBackendApiUrl } from '@/lib/backend-url';

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

  const nextResponse =
    response instanceof NextResponse
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
const MEMBER_PROTECTED_PREFIXES = ['/my'] as const;

type JwtSessionCheckResult =
  { status: 'valid'; role: string | null } | { status: 'invalid' | 'unverified' };

function isMemberProtectedPath(pathnameWithoutLocale: string): boolean {
  return MEMBER_PROTECTED_PREFIXES.some((prefix) => pathnameWithoutLocale.startsWith(prefix));
}

function redirectToLogin(
  request: NextRequest,
  localePrefix: string,
  redirectTarget: string,
): NextResponse {
  const loginUrl = new URL(`${localePrefix}/login`, request.url);
  loginUrl.searchParams.set('redirect', redirectTarget);
  return NextResponse.redirect(loginUrl);
}

function redirectToLocaleHome(request: NextRequest, localePrefix: string): NextResponse {
  return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
}

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
function isExpiredJwtPayload(payload: Record<string, unknown>): boolean {
  const exp = payload.exp;
  return typeof exp === 'number' && exp * 1000 <= Date.now();
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

    const signature = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), (c) =>
      c.charCodeAt(0),
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

async function getJwtSessionCheck(token: string): Promise<JwtSessionCheckResult> {
  const payload = await verifyRS256(token);
  if (!payload) return { status: 'unverified' };

  if (
    (typeof payload.tokenType === 'string' && payload.tokenType !== 'access') ||
    isExpiredJwtPayload(payload)
  ) {
    return { status: 'invalid' };
  }

  return {
    status: 'valid',
    role: typeof payload.role === 'string' ? payload.role : null,
  };
}

function getBackendAuthMeUrl(): string | null {
  return buildConfiguredBackendApiUrl('/auth/me');
}

async function fetchAuthenticatedProfile(
  cookieHeader: string | null,
): Promise<{ role?: unknown } | null> {
  const url = getBackendAuthMeUrl();
  if (!url || !cookieHeader) return null;

  try {
    const response = await fetch(url, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return null;
    return (await response.json()) as { role?: unknown };
  } catch {
    return null;
  }
}

async function hasAuthenticatedSession(
  token: string,
  cookieHeader: string | null,
): Promise<boolean> {
  const jwtResult = await getJwtSessionCheck(token);
  if (jwtResult.status === 'valid') return true;
  if (jwtResult.status === 'invalid' || hasConfiguredPublicKey()) return false;

  // In local/Vercel deployments the Edge middleware may not have JWT_PUBLIC_KEY,
  // while the backend still has the private/public key pair and can validate the
  // httpOnly cookie. Fall back to the backend profile endpoint only when local
  // verification is impossible, not when a configured key rejects the token.
  return Boolean(await fetchAuthenticatedProfile(cookieHeader));
}

async function hasAdminRole(token: string, cookieHeader: string | null): Promise<boolean> {
  const jwtResult = await getJwtSessionCheck(token);
  if (jwtResult.status === 'valid') {
    return Boolean(jwtResult.role && ADMIN_ROLES.has(jwtResult.role));
  }
  if (jwtResult.status === 'invalid' || hasConfiguredPublicKey()) return false;

  const profile = await fetchAuthenticatedProfile(cookieHeader);
  return typeof profile?.role === 'string' && ADMIN_ROLES.has(profile.role);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const localeMatch = pathname.match(localePattern);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
  const pathnameWithoutLocale = localeMatch ? localeMatch[2] || '/' : pathname;
  const redirectTarget = pathname + request.nextUrl.search;
  const cookieHeader = request.headers.get('cookie');
  const finalizeResponse = (response: Response) =>
    withLocaleCookie(request, response, localePrefix, pathnameWithoutLocale);

  if (pathnameWithoutLocale === '/sitemap.xml' || pathnameWithoutLocale === '/robots.txt') {
    return finalizeResponse(NextResponse.next());
  }

  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      return finalizeResponse(redirectToLogin(request, localePrefix, redirectTarget));
    }
    if (!(await hasAdminRole(token, cookieHeader))) {
      return finalizeResponse(redirectToLocaleHome(request, localePrefix));
    }
  }

  if (isMemberProtectedPath(pathnameWithoutLocale)) {
    if (!token || !(await hasAuthenticatedSession(token, cookieHeader))) {
      return finalizeResponse(redirectToLogin(request, localePrefix, redirectTarget));
    }
  }

  if (pathnameWithoutLocale.startsWith('/api')) {
    // Proxy to backend using the canonical BACKEND_URL origin + /api/* contract.

    const search = new URL(request.url).search || request.nextUrl.search;
    const url = buildConfiguredBackendApiUrl(pathnameWithoutLocale, search);
    if (!url) {
      return finalizeResponse(
        NextResponse.json({ error: 'BACKEND_URL not configured' }, { status: 500 }),
      );
    }

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

      const hasNoBody = response.status === 204 || response.status === 205 || response.status === 304;
      const data = hasNoBody ? null : await response.arrayBuffer();

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

      return finalizeResponse(
        new NextResponse(data, {
          status: response.status,
          headers: responseHeaders,
        }),
      );
    } catch (error) {
      return finalizeResponse(
        NextResponse.json(
          { error: 'Backend unreachable', details: String(error) },
          { status: 502 },
        ),
      );
    }
  }

  return finalizeResponse(intlMiddleware(request));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|ttf|woff|woff2|eot|otf)$).*)',
  ],
};
