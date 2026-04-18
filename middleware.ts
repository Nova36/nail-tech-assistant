/**
 * A4 test-spec stub — overwritten in implement phase.
 *
 * Real implementation (edge runtime): checks presence of the 'session' cookie
 * and redirects to /login?from=<pathname> when missing. Pass-through for
 * /login and /api/health as belt-and-suspenders. Matcher excludes public paths.
 */
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(req: NextRequest): NextResponse {
  void req;
  throw new Error('TODO(a4.implement): middleware not yet implemented');
}

export const config = {
  matcher: [],
};
