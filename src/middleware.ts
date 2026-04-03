import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Compile regex once at module scope; trailing path is optional to match bare /ko
const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/.*)?$`);

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/**
 * Decode JWT payload without signature verification (edge runtime safe).
 * Returns true if the token's role claim is an admin role.
 */
function hasAdminRole(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    // base64url → base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.role === 'string' && ADMIN_ROLES.has(payload.role);
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // Extract locale prefix and stripped path for auth checks
  const localeMatch = pathname.match(localePattern);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
  const pathnameWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;

  // Protect admin routes — require authentication and admin role
  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
    if (!hasAdminRole(token)) {
      return NextResponse.redirect(new URL(`${localePrefix}/`, request.url));
    }
  }

  // Protect user-only routes
  if (pathnameWithoutLocale.startsWith('/my') || pathnameWithoutLocale.startsWith('/checkout')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Skip intl middleware for API routes
  if (pathnameWithoutLocale.startsWith('/api')) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|ttf|woff|woff2|eot|otf)$).*)',
  ],
};
