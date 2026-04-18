/**
 * A4 test-spec stub — overwritten in implement phase.
 *
 * Real implementation (per research brief) will read the 'session' cookie
 * off the incoming request and return a simple presence boolean, so that
 * edge-runtime middleware can decide whether to redirect to /login.
 *
 * Kept firebase-admin-free so middleware's edge bundle stays clean.
 */
import type { NextRequest } from 'next/server';

export function hasSessionCookie(req: NextRequest): boolean {
  const value = req.cookies.get('session')?.value;
  return typeof value === 'string' && value.length > 0;
}
