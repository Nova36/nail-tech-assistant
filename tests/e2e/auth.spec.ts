/**
 * A4 — tests/e2e/auth.spec.ts
 *
 * Canonical Epic A auth integration e2e. Complements (does NOT replace)
 * tests/e2e/login.spec.ts from A3 — they test different slices:
 *   - login.spec.ts: /login form behavior (UI sent/rejected states).
 *   - auth.spec.ts: middleware redirect, /api/health public access, and
 *     the placeholder for the full email-link round-trip + session-expiry
 *     + direct-POST bypass tests (gated on the Firebase Auth emulator,
 *     which is NOT wired into playwright.config.ts yet).
 *
 * Cookie name adaptation: A2's session helper uses `'session'` (not
 * `'__session'`). Scenarios that set a cookie use `'session'`.
 *
 * In CI without a running dev server + Firebase emulator, scenarios 3/4/5
 * are SKIPPED via `test.skip(...)` with TODO markers. Scenarios 1 + 2 are
 * the realistic red-phase signals; they assert the middleware redirect
 * and the public /api/health endpoint, both of which only need A4's
 * middleware + health route to exist.
 */
import { test, expect } from '@playwright/test';

test.describe('auth integration — middleware, health, deferred emulator cases', () => {
  test('AC#1: unauthenticated visit to `/` → redirects to /login', async ({
    page,
  }) => {
    await page.goto('/');
    // URL should become /login, optionally with `?from=/`. Both forms
    // are acceptable because the tester does not constrain the exact
    // query-string contract beyond the unit-level middleware test.
    await expect(page).toHaveURL(/\/login(\?|$|\/)/);
  });

  test('AC#2: `/api/health` is public → returns 200 with { ok: true } (no cookies)', async ({
    request,
  }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);

    const body = (await res.json()) as { ok: unknown; ts: unknown };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
  });

  test('AC#3 (DEFERRED): email-link happy-path round-trip lands on authenticated shell', async () => {
    test.skip(
      true,
      'TODO(a4.e2e): requires Firebase Auth emulator for sign-in-link round-trip. ' +
        'A4 does not yet wire the emulator into playwright.config.ts webServer. ' +
        'Unskip this test in the epic that adds emulator support.'
    );
  });

  test('AC#4 (DEFERRED): session-expiry → stale `session` cookie redirected back to /login', async () => {
    test.skip(
      true,
      'TODO(a4.e2e): the app/(authenticated)/layout.tsx verification calls ' +
        'firebase-admin `verifySessionCookie`, which requires a real Firebase ' +
        'project (or emulator) to produce a predictable "expired/revoked" ' +
        'rejection. Out of scope for A4 CI; unskip with the emulator.'
    );
    // When implemented, this test should:
    //   await page.context().addCookies([{
    //     name: 'session', value: 'expired-fake-token',
    //     domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax',
    //   }]);
    //   await page.goto('/');
    //   await expect(page).toHaveURL(/\/login/);
  });

  test('AC#5 (DEFERRED): direct-POST bypass against the login server action is rejected', async () => {
    test.skip(
      true,
      'TODO(a4.e2e): Next 15 server actions are POSTed to an opaque ' +
        'endpoint chosen by the framework, so asserting a direct POST ' +
        'bypass from Playwright requires either (a) emulator-gated ' +
        'plumbing or (b) a dedicated API route wrapper. Unit test at ' +
        'tests/unit/auth/login-action.test.ts already covers the ' +
        'invariant (FR-A-2: sendSignInLinkToEmail never called on reject); ' +
        'this e2e placeholder is retained for the eventual emulator setup.'
    );
  });
});
