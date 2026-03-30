import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  // Protect admin routes — require authentication
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Note: We can't fully verify JWT or role at the edge without the secret,
    // but blocking unauthenticated users prevents HTML exposure.
    // Role-based checks remain server-side in the backend API.
  }

  // Protect user-only routes
  if (pathname.startsWith('/my') || pathname.startsWith('/checkout')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/my/:path*', '/checkout/:path*'],
};
