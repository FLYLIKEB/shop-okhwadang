import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Compile regex once at module scope; trailing path is optional to match bare /ko
const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/.*)?$`);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // Extract locale prefix and stripped path for auth checks
  const localeMatch = pathname.match(localePattern);
  const localePrefix = localeMatch ? `/${localeMatch[1]}` : '';
  const pathnameWithoutLocale = localeMatch ? (localeMatch[2] || '/') : pathname;

  // Protect admin routes — require authentication
  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL(`${localePrefix}/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
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

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
