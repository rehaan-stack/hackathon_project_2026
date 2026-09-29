import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth-constants';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/incidents',
  '/investigation',
  '/memory',
  '/analytics',
  '/reports',
  '/settings',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // This is an optimistic redirect only; every server handler verifies the session cookie.
  if (isProtected && !sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && sessionToken) {
    const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/incidents/:path*',
    '/investigation/:path*',
    '/memory/:path*',
    '/analytics/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/login',
  ],
};
