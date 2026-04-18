/**
 * A4 — tests/unit/session-guard.test.ts
 *
 * Unit tests for `hasSessionCookie(req)` at `lib/auth/session-guard.ts`.
 *
 * Contract (per A4 research brief):
 *   - Returns `true` when the 'session' cookie is present and non-empty.
 *   - Returns `false` when the cookie is absent, empty, or the request
 *     has unrelated cookies only.
 *   - Must not import firebase-admin (edge bundle cleanliness) — asserted
 *     in the middleware module-shape test elsewhere; this file focuses on
 *     pure behavior.
 *
 * ADAPTATION from the task brief: A2 uses cookie name `'session'`
 * (NOT `'__session'`). Tests use `'session'` to match the A2 helper.
 *
 * These tests are RED by design — the helper currently throws a
 * `TODO(a4.implement)` error for every call.
 */
import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { hasSessionCookie } from '../../lib/auth/session-guard';

function makeReq(cookies?: Record<string, string>): NextRequest {
  const req = new NextRequest(new URL('http://localhost/'));
  if (cookies) {
    for (const [k, v] of Object.entries(cookies)) {
      req.cookies.set(k, v);
    }
  }
  return req;
}

describe('lib/auth/session-guard — hasSessionCookie', () => {
  it('returns true when `session=tokenvalue` cookie is present', () => {
    const req = makeReq({ session: 'tokenvalue' });
    expect(hasSessionCookie(req)).toBe(true);
  });

  it('returns false when `session` cookie is empty string', () => {
    const req = makeReq({ session: '' });
    expect(hasSessionCookie(req)).toBe(false);
  });

  it('returns false when no `session` cookie is set at all', () => {
    const req = makeReq();
    expect(hasSessionCookie(req)).toBe(false);
  });

  it('returns false when only unrelated cookies are present', () => {
    const req = makeReq({
      'theme-pref': 'dark',
      analytics_id: 'abc123',
    });
    expect(hasSessionCookie(req)).toBe(false);
  });
});
