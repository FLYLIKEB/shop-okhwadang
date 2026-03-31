import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // Strip locale prefix for auth checks (e.g. /ko/admin → /admin)
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/.*)$`);
  const pathnameWithoutLocale = pathname.replace(localePattern, '$2') || pathname;

  // Protect admin routes — require authentication
  if (pathnameWithoutLocale.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathnameWithoutLocale + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect user-only routes
  if (pathnameWithoutLocale.startsWith('/my') || pathnameWithoutLocale.startsWith('/checkout')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathnameWithoutLocale + request.nextUrl.search);
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
