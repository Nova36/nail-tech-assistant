/**
 * b2-pinterest-boards-grid — Playwright e2e smoke test
 *
 * Minimal smoke: navigate to /pinterest after auth, assert skeleton then
 * board grid render, assert BoardCard click navigates to /pinterest/[boardId].
 *
 * IMPORTANT — SKIPPED: The full email-link auth flow requires /login/finish +
 * /api/auth/session (exchange ID token → session cookie). Those routes are not
 * yet implemented (deferred from Epic A). The emulator fixture helpers exist at
 * tests/e2e/fixtures/emulator.ts (clearAuthEmulatorAccounts, getLatestOobLink)
 * and are ready to consume once /login/finish ships. This spec should be
 * un-skipped when Epic A's login/finish route lands.
 *
 * Full token-mocked e2e (Playwright page.route() interception) is planned
 * for b5 real-token Vercel smoke.
 */
import { test, expect } from '@playwright/test';

test.describe('b2 /pinterest boards grid — e2e smoke', () => {
  test('AC-skeleton+grid: skeleton renders then resolves to BoardGrid with at least one BoardCard', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish + /api/auth/session routes to complete the ' +
        'email-link auth flow and obtain a session cookie (Epic A story not yet ' +
        'implemented). Re-enable once those routes ship. Auth emulator fixture ' +
        'helpers are ready at tests/e2e/fixtures/emulator.ts.'
    );

    // ── Auth setup (when un-skipping) ──────────────────────────────────
    // const { clearAuthEmulatorAccounts, getLatestOobLink } =
    //   await import('./fixtures/emulator');
    // await clearAuthEmulatorAccounts();
    // await page.goto('/login');
    // await page.getByLabel(/email/i).fill('configured@example.test');
    // await page.getByRole('button', { name: /sign in|send link/i }).click();
    // await page.waitForSelector('[data-testid="email-sent"]');
    // const oobLink = await getLatestOobLink('configured@example.test');
    // await page.goto(oobLink);
    // await page.waitForURL(/\/(?!login)/);

    // ── Intercept Pinterest API for deterministic response ─────────────
    await page.route('https://api.pinterest.com/v5/boards*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'e2e-board-1', name: 'E2E Board One', pin_count: 5 },
            { id: 'e2e-board-2', name: 'E2E Board Two', pin_count: 3 },
          ],
          bookmark: null,
        }),
      });
    });

    await page.goto('/pinterest');

    // Assert skeleton renders first
    await expect(
      page.locator('[data-component="BoardGridSkeleton"]')
    ).toBeVisible();

    // Assert skeleton resolves to BoardGrid
    await expect(page.locator('[data-component="BoardGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    // Assert at least one BoardCard rendered
    const cards = page.locator('[data-component="BoardCard"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('AC-card-link: clicking a BoardCard navigates to /pinterest/[boardId]', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish route for auth setup (same blocker as above). ' +
        'Re-enable once Epic A login/finish ships.'
    );

    await page.route('https://api.pinterest.com/v5/boards*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { id: 'e2e-board-click', name: 'Click Target Board', pin_count: 7 },
          ],
          bookmark: null,
        }),
      });
    });

    await page.goto('/pinterest');
    await expect(page.locator('[data-component="BoardGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    // Click the first BoardCard link
    const firstCard = page.locator('[data-component="BoardCard"]').first();
    await firstCard.click();

    // Assert navigation to /pinterest/[boardId]
    await expect(page).toHaveURL(/\/pinterest\/e2e-board-click/);
  });

  test('AC-image-host: no image-host config errors on board render', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish route for auth setup. Also requires ' +
        'real or mocked i.pinimg.com image URLs in board media fields. ' +
        'Re-enable once auth flow + image mocking are wired.'
    );

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/pinterest');
    await expect(page.locator('[data-component="BoardGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    // No console errors relating to image host config
    const imageHostErrors = consoleErrors.filter(
      (e) =>
        e.toLowerCase().includes('hostname') ||
        e.toLowerCase().includes('remotepatterns')
    );
    expect(imageHostErrors).toHaveLength(0);
  });

  test('AC-touch-targets: board card touch targets meet 44×44px minimum on tablet viewport', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires auth flow + visual breakpoint check at 768px. ' +
        'Cards are full-card <a> links far exceeding 44×44px per design brief. ' +
        'Re-enable once auth flow is wired.'
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/pinterest');
    await expect(page.locator('[data-component="BoardGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    const firstCard = page.locator('[data-component="BoardCard"]').first();
    const box = await firstCard.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
