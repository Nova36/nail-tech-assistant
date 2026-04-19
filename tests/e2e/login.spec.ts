/**
 * A3 — tests/e2e/login.spec.ts
 *
 * E2E acceptance for /login:
 *   - Happy path (AC#1): allowed email → sent-state UI visible, URL still /login.
 *   - Reject path (AC#2): disallowed email → inline error visible, URL still /login.
 *
 * Assertions target BEHAVIOR (role/text queries), not markup/CSS classes, so
 * the developer can refactor the HTML without breaking the suite.
 *
 * NOTE: The direct-POST bypass test (AC#3) is DEFERRED to A4, when middleware
 * and the full route surface are in place. See story a3 test-spec step and
 * a4-middleware scope. Do not add it here.
 *
 * The dev server and required env (including ALLOWED_EMAIL) are wired via
 * playwright.config.ts webServer (inherits shell env). In the CI test env,
 * ALLOWED_EMAIL must be set to the value used below.
 */
import { test, expect } from '@playwright/test';

// Matches the ALLOWED_EMAIL used by the test env / fixtures.
const ALLOWED = process.env.ALLOWED_EMAIL ?? 'configured@example.test';

test.describe('/login — email-link sign-in form', () => {
  test('AC#1 happy path: allowed email submits → sent-state UI appears, URL stays /login', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill(ALLOWED);
    await page
      .getByRole('button', { name: /sign in|send.*link|continue/i })
      .click();

    // Sent state is a UI swap, not a navigation — URL should still be /login.
    await expect(page).toHaveURL(/\/login(\/|$|\?)/);

    // Target the sent-state heading specifically — "Check your email for a
    // secure sign-in link..." also matches the regex as a body paragraph,
    // which would be a strict-mode-violation for getByText.
    await expect(
      page.getByRole('heading', { name: /check your (inbox|email)/i })
    ).toBeVisible();
  });

  test('AC#2 reject path: disallowed email → inline error visible, URL stays /login, no success text', async ({
    page,
  }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('attacker@example.com');
    await page
      .getByRole('button', { name: /sign in|send.*link|continue/i })
      .click();

    await expect(page).toHaveURL(/\/login(\/|$|\?)/);

    // AC#2 verbatim rejection message must be visible to the user.
    await expect(
      page.getByText(/only the configured email can sign in\./i)
    ).toBeVisible();

    // Make sure the sent-state heading didn't render.
    await expect(
      page.getByRole('heading', { name: /check your (inbox|email)/i })
    ).toHaveCount(0);
  });
});
