/**
 * middleware unit tests — pass-through contract.
 *
 * Auth enforcement moved into app/(authenticated)/layout.tsx where
 * verifySessionCookie checks the Firebase signature server-side.
 * Middleware is now a pure pass-through that attaches two diagnostic
 * headers (x-mw-saw, x-mw-cookie-len) so we can confirm it ran from
 * the response without depending on log streaming.
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

describe('middleware — pass-through contract', () => {
  it('returns a non-redirect response for protected paths regardless of cookie', () => {
    const cases = ['/', '/dashboard', '/settings', '/api/auth/session'];
    for (const path of cases) {
      const res = middleware(makeReq(path)) as NextResponse;
      expect(res.status).toBeLessThan(300);
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('attaches x-mw-saw with the request pathname', () => {
    const res = middleware(makeReq('/dashboard')) as NextResponse;
    expect(res.headers.get('x-mw-saw')).toBe('/dashboard');
  });

  it('reports cookie length 0 when session cookie absent', () => {
    const res = middleware(makeReq('/')) as NextResponse;
    expect(res.headers.get('x-mw-cookie-len')).toBe('0');
  });

  it('reports cookie length matching the session value when present', () => {
    const res = middleware(
      makeReq('/', { session: 'abcdefghij' })
    ) as NextResponse;
    expect(res.headers.get('x-mw-cookie-len')).toBe('10');
  });

  it('passes through public paths the same way as protected ones', () => {
    const res = middleware(makeReq('/login')) as NextResponse;
    expect(res.status).toBeLessThan(300);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('x-mw-saw')).toBe('/login');
  });
});

describe('middleware — config.matcher', () => {
  it('exports a non-empty matcher array', async () => {
    const mod = await import('../../middleware');
    expect(mod.config).toBeDefined();
    expect(Array.isArray(mod.config.matcher)).toBe(true);
    expect((mod.config.matcher as string[]).length).toBeGreaterThan(0);
  });

  it('matcher excludes _next, favicon, and robots from middleware', async () => {
    const mod = await import('../../middleware');
    const combined = (mod.config.matcher as string[]).join(' ');
    expect(combined).toMatch(/_next/);
    expect(combined).toMatch(/favicon/);
    expect(combined).toMatch(/robots/);
  });
});
