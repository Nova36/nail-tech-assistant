/**
 * b5 — Real-token smoke against the production alias.
 *
 * Default-skipped. To run:
 *   RUN_REAL_TOKEN_SMOKE=1 pnpm exec playwright test tests/e2e/pinterest-real-token-smoke.spec.ts
 *
 * Targets `https://nail-tech-assistant.vercel.app` (the production alias)
 * because preview scope has no env vars per app-infra-gotchas #4. Override
 * the target via SMOKE_BASE_URL if a future preview-with-token environment
 * exists.
 *
 * AC covered:
 *   AC-5 (b5) — end-to-end real-token smoke completes login → /pinterest →
 *               click board → see pins
 */
import { test, expect } from '@playwright/test';

const SMOKE_BASE_URL =
  process.env.SMOKE_BASE_URL ?? 'https://nail-tech-assistant.vercel.app';

test.describe.configure({ mode: 'serial' });

test.describe('Pinterest real-token smoke (gated)', () => {
  test.skip(
    !process.env.RUN_REAL_TOKEN_SMOKE,
    'Real-token smoke is gated. Set RUN_REAL_TOKEN_SMOKE=1 to run.'
  );

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[browser console error] ${msg.text()}`);
      }
    });
  });

  test('login → /pinterest → board → pins (real token)', async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto(`${SMOKE_BASE_URL}/login`);
    await expect(page).toHaveURL(/\/login/);

    // The smoke run depends on a session being already established (cookie
    // injection or manual login pre-step). Real-token smoke is operator-run,
    // not unattended; this spec asserts the post-login flow when a session
    // exists. If unauthenticated, the test surfaces the redirect for
    // diagnostic clarity rather than attempting magic-link automation
    // against the real Firebase project.
    const response = await page.goto(`${SMOKE_BASE_URL}/pinterest`);
    if (response && response.status() >= 400) {
      throw new Error(
        `/pinterest returned ${response.status()} — confirm session cookie before running.`
      );
    }

    if (page.url().includes('/login')) {
      test.skip(
        true,
        'Smoke requires an authenticated session. Pre-establish via the production magic-link flow before running.'
      );
    }

    await expect(page).toHaveURL(/\/pinterest$/);

    // Wait for at least one BoardCard to render.
    const firstBoard = page.locator('[data-component="BoardCard"] a').first();
    await firstBoard.waitFor({ state: 'visible', timeout: 30_000 });

    const boardHref = await firstBoard.getAttribute('href');
    expect(boardHref).toMatch(/^\/pinterest\//);

    await firstBoard.click();
    await expect(page).toHaveURL(/^.*\/pinterest\/[^/]+$/);

    // Wait for at least one pin or the empty state — both are acceptable
    // (the chosen board may have zero pins).
    const pinOrEmpty = page.locator(
      '[data-component="PinCard"], [data-component="EmptyPinsState"]'
    );
    await pinOrEmpty.first().waitFor({ state: 'visible', timeout: 30_000 });

    // If pins rendered, scroll once to confirm append doesn't error.
    const hasPins =
      (await page.locator('[data-component="PinCard"]').count()) > 0;
    if (hasPins) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2_000);
      // Either appended (more cards), reached end (no more), or remained
      // stable. Any of these is success — we just need to confirm the
      // sentinel didn't blow up.
      const errorAfterScroll = page.locator(
        '[data-component="InlineBrowseError"]'
      );
      await expect(errorAfterScroll).toHaveCount(0);
    }
  });
});
