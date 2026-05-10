/**
 * f5 — shared auth fixture for e2e specs.
 *
 * Wraps the email-link sign-in flow against the Firebase Auth emulator:
 *   1. POST email to /login (server action triggers sendSignInLinkToEmail).
 *   2. Wait for the sent-state heading ("Check your inbox").
 *   3. Pull the captured oob link from the emulator.
 *   4. Pre-seed `emailForSignIn` in localStorage so /login/finish has the
 *      email it expects (sendSignInLinkToEmail normally writes it on
 *      submit, but server-action submission may run before localStorage
 *      is touched in some browser/timing combos — explicit seed is
 *      cheaper than racing the assertion).
 *   5. Navigate to the oob link → /login/finish exchanges with
 *      /api/auth/session → window.location.replace('/').
 *   6. Wait until URL is no longer under /login (authenticated layout
 *      will redirect / to a dashboard route via middleware).
 *
 * Mirrors the inline helper that previously lived in
 * tests/e2e/visualizer-shapes.spec.ts but uses a stable role-based
 * selector for the sent state instead of the non-existent
 * `data-testid="email-sent"` attribute.
 */
import type { Page } from '@playwright/test';

import { getLatestOobLink } from './emulator';

export const TEST_EMAIL = 'configured@example.test';

const STORAGE_KEY = 'emailForSignIn';

export async function signInViaEmailLink(
  page: Page,
  email: string = TEST_EMAIL
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page
    .getByRole('button', { name: /sign in|send.*link|continue/i })
    .click();

  // Sent-state UI swap — URL stays on /login, heading becomes "Check your inbox".
  await page
    .getByRole('heading', { name: /check your (inbox|email)/i })
    .waitFor({ state: 'visible', timeout: 15_000 });

  // Seed the email into localStorage so /login/finish doesn't fall into the
  // `awaiting_email` confirm-form branch when the oob link is opened in a
  // fresh navigation.
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [STORAGE_KEY, email] as const
  );

  const oobLink = await getLatestOobLink(email);
  await page.goto(oobLink);

  // /login/finish exchanges the credential then window.location.replace('/').
  // Authenticated landing route (dashboard) lives outside /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 15_000,
  });
}
