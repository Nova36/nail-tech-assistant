/**
 * A4 — tests/unit/middleware.test.ts
 *
 * Unit tests for the edge-runtime auth middleware at `middleware.ts`.
 *
 * Contract (per A4 research brief + story):
 *   - If the 'session' cookie is absent (or empty string) on a protected
 *     path, redirect to /login?from=<pathname>.
 *   - If the 'session' cookie is present and non-empty, pass through.
 *     (Full verification happens in app/(authenticated)/layout.tsx.)
 *   - Belt-and-suspenders: /login and /api/health always pass through,
 *     even when the matcher would have let them through to middleware.
 *   - _next/* static assets pass through even if they reach middleware.
 *
 * ADAPTATION from the task brief: the A2 session helper at
 * lib/firebase/session.ts uses the cookie name `'session'` (NOT `'__session'`).
 * Tests set `'session'` accordingly.
 *
 * These tests are RED by design — middleware.ts currently throws a
 * `TODO(a4.implement)` error for every call; the developer overwrites it.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

import { middleware } from '../../middleware';

function makeReq(path: string, cookies?: Record<string, string>): NextRequest {
  const url = new URL(`http://localhost${path}`);
  const req = new NextRequest(url);
  if (cookies) {
    for (const [k, v] of Object.entries(cookies)) {
      req.cookies.set(k, v);
    }
  }
  return req;
}

// Extracts the Location header from a redirect response, if present.
function locationOf(res: NextResponse | Response | undefined): string | null {
  if (!res) return null;
  return res.headers.get('location');
}

describe('middleware — protected-route redirect contract (A4)', () => {
  it('absent session + `/` (protected root) → redirects to /login?from=/', () => {
    const req = makeReq('/');
    const res = middleware(req) as NextResponse;
    const loc = locationOf(res);

    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(loc).not.toBeNull();
    const locUrl = new URL(loc as string);
    expect(locUrl.pathname).toBe('/login');
    expect(locUrl.searchParams.get('from')).toBe('/');
  });

  it('absent session + `/dashboard` → redirects to /login?from=/dashboard', () => {
    const req = makeReq('/dashboard');
    const res = middleware(req) as NextResponse;
    const loc = locationOf(res);

    expect(loc).not.toBeNull();
    const locUrl = new URL(loc as string);
    expect(locUrl.pathname).toBe('/login');
    expect(locUrl.searchParams.get('from')).toBe('/dashboard');
  });

  it('absent session + `/settings` → redirects to /login?from=/settings', () => {
    const req = makeReq('/settings');
    const res = middleware(req) as NextResponse;
    const loc = locationOf(res);

    expect(loc).not.toBeNull();
    const locUrl = new URL(loc as string);
    expect(locUrl.pathname).toBe('/login');
    expect(locUrl.searchParams.get('from')).toBe('/settings');
  });

  it('absent session + `/login` → passes through (belt-and-suspenders, no redirect)', () => {
    const req = makeReq('/login');
    const res = middleware(req) as NextResponse;
    const loc = locationOf(res);

    // Either 200-range (NextResponse.next) or no Location header signals
    // a pass-through. We assert NO redirect to /login (would be a loop anyway).
    expect(
      loc === null ||
        !new URL(loc, 'http://localhost').pathname.match(/^\/login$/)
    ).toBe(true);
    // Strong form: status should not be a 3xx redirect.
    expect(res.status).toBeLessThan(300);
  });

  it('absent session + `/api/health` → passes through (public health endpoint)', () => {
    const req = makeReq('/api/health');
    const res = middleware(req) as NextResponse;

    expect(res.status).toBeLessThan(300);
    expect(locationOf(res)).toBeNull();
  });

  it('absent session + `/_next/static/foo.js` → passes through (static asset)', () => {
    const req = makeReq('/_next/static/foo.js');
    const res = middleware(req) as NextResponse;

    expect(res.status).toBeLessThan(300);
    expect(locationOf(res)).toBeNull();
  });

  it('present session cookie + protected path → passes through (no redirect)', () => {
    const req = makeReq('/dashboard', { session: 'fake-session-token-abc' });
    const res = middleware(req) as NextResponse;

    expect(res.status).toBeLessThan(300);
    expect(locationOf(res)).toBeNull();
  });

  it('empty session cookie value + protected path → treated as absent → redirects to /login', () => {
    const req = makeReq('/dashboard', { session: '' });
    const res = middleware(req) as NextResponse;
    const loc = locationOf(res);

    expect(loc).not.toBeNull();
    const locUrl = new URL(loc as string);
    expect(locUrl.pathname).toBe('/login');
    expect(locUrl.searchParams.get('from')).toBe('/dashboard');
  });
});

describe('middleware — config.matcher (A4)', () => {
  it('exports a `config` with a non-empty `matcher` array', async () => {
    const mod = await import('../../middleware');
    expect(mod.config).toBeDefined();
    expect(Array.isArray(mod.config.matcher)).toBe(true);
    expect((mod.config.matcher as string[]).length).toBeGreaterThan(0);
  });

  it('matcher excludes /login, /api/health, and _next static paths', async () => {
    const mod = await import('../../middleware');
    const patterns = mod.config.matcher as string[];
    // The matcher should be a single negative-lookahead regex that excludes
    // these public paths. Rather than re-implementing the regex, we sanity
    // check that the literal exclusion tokens appear in the pattern string.
    const combined = patterns.join(' ');
    expect(combined).toMatch(/login/);
    expect(combined).toMatch(/api\/health/);
    expect(combined).toMatch(/_next/);
  });
});
