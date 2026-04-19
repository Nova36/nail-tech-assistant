/**
 * Epic A — tests/e2e/auth.spec.ts
 *
 * Canonical auth integration e2e. Complements (does NOT replace)
 * tests/e2e/login.spec.ts — they test different slices:
 *   - login.spec.ts: /login form behavior (sent + rejected UI states).
 *   - auth.spec.ts: middleware redirect, /api/health public access,
 *     and session-rejection behavior on invalid cookies.
 *
 * Emulator wiring: playwright.config.ts webServer wraps `pnpm dev` in
 * `firebase emulators:exec --only auth,firestore`, so the app talks to
 * local Auth + Firestore emulators. The authenticated layout's
 * `verifySessionCookie` call hits the emulator; any invalid cookie
 * (malformed, expired, revoked) rejects identically from the user's POV.
 *
 * Cookie name: A2's session helper reads `'session'` (not `'__session'`).
 */
import { test, expect } from '@playwright/test';

test.describe('auth integration — middleware, health, session-reject', () => {
  test('AC#1: unauthenticated visit to `/` → redirects to /login', async ({
    page,
  }) => {
    await page.goto('/');
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

  test('AC#4: invalid/expired session cookie → authenticated layout rejects, redirect to /login', async ({
    page,
    context,
  }) => {
    // A malformed cookie value is indistinguishable from an expired/revoked
    // one from the app's perspective — both route through
    // verifySessionCookie's catch path in getSessionFromCookieString, which
    // returns null, which triggers redirect('/login') in the layout.
    await context.addCookies([
      {
        name: 'session',
        value: 'invalid-fake-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login(\?|$|\/)/);
  });

  test('AC#3 (DEFERRED): full email-link happy-path through /login/finish to authenticated shell', async () => {
    test.skip(
      true,
      'Requires /login/finish route + /api/auth/session endpoint to exchange ' +
        'the ID token for a session cookie. Those routes are a separate ' +
        'story — not part of A3 (stops at sent-state) or A4 (middleware + ' +
        'shell). Emulator fixture helpers already exist at ' +
        'tests/e2e/fixtures/emulator.ts (clearAuthEmulatorAccounts, ' +
        'getLatestOobLink) — ready to consume once /login/finish ships.'
    );
  });

  test('AC#5 (DEFERRED): direct-POST bypass of the login server action', async () => {
    test.skip(
      true,
      'Next 15 server actions POST to an opaque framework-chosen endpoint ' +
        '(Next-Action header + encrypted action ID). Playwright cannot target ' +
        'it stably. Unit test at tests/unit/auth/login-action.test.ts already ' +
        'asserts the FR-A-2 invariant (sendSignInLinkToEmail NOT called on ' +
        'rejection) by invoking the action export directly — same code gate.'
    );
  });
});
