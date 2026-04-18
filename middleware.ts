/**
 * A4 test-spec stub — overwritten in implement phase.
 *
 * Real implementation (edge runtime): checks presence of the 'session' cookie
 * and redirects to /login?from=<pathname> when missing. Pass-through for
 * /login and /api/health as belt-and-suspenders. Matcher excludes public paths.
 */
import { NextResponse, type NextRequest } from 'next/server';

import { hasSessionCookie } from './lib/auth/session-guard';

const PUBLIC_EXACT = new Set(['/login', '/api/health']);

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt') return true;
  return false;
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  if (hasSessionCookie(req)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', pathname);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!login$|login/|api/health$|_next/|favicon\\.ico$|robots\\.txt$).*)',
  ],
};
