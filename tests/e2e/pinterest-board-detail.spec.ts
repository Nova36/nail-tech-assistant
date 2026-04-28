/**
 * b3-pinterest-pin-grid — Playwright e2e smoke test
 *
 * Minimal smoke: navigate to /pinterest/[boardId] after auth,
 * assert skeleton then pin grid render, assert infinite scroll append,
 * assert notFound branch for invalid boardId.
 *
 * IMPORTANT — SKIPPED: The full email-link auth flow requires /login/finish +
 * /api/auth/session (exchange ID token → session cookie). Those routes are not
 * yet implemented (deferred from Epic A). The emulator fixture helpers exist at
 * tests/e2e/fixtures/emulator.ts (clearAuthEmulatorAccounts, getLatestOobLink)
 * and are ready to consume once /login/finish ships. This spec should be
 * un-skipped when Epic A's login/finish route lands.
 *
 * Same auth blocker as b2 (tests/e2e/pinterest-boards.spec.ts).
 * See that file for the established skip pattern.
 */
import { test, expect } from '@playwright/test';

const BOARD_ID = 'e2e-board-pin-test';
const BOGUS_BOARD_ID = 'bogus-invalid-board-id-12345';

test.describe('b3 /pinterest/[boardId] board detail — e2e smoke', () => {
  test('AC-skeleton+grid: PinGridSkeleton renders then resolves to PinGrid with at least one PinCard', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish + /api/auth/session routes to complete the ' +
        'email-link auth flow and obtain a session cookie (Epic A story not yet ' +
        'implemented). Re-enable once those routes ship. Auth emulator fixture ' +
        'helpers are ready at tests/e2e/fixtures/emulator.ts.'
    );

    // ── Intercept Pinterest API for deterministic response ─────────────
    await page.route(
      `https://api.pinterest.com/v5/boards/${BOARD_ID}/pins*`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [
              {
                id: 'e2e-pin-1',
                title: 'E2E Pin One',
                media: {
                  images: {
                    '600x': {
                      url: 'https://i.pinimg.com/600x/e2e-pin-1.jpg',
                      width: 600,
                      height: 900,
                    },
                  },
                },
              },
              {
                id: 'e2e-pin-2',
                title: 'E2E Pin Two',
                media: {
                  images: {
                    '600x': {
                      url: 'https://i.pinimg.com/600x/e2e-pin-2.jpg',
                      width: 600,
                      height: 900,
                    },
                  },
                },
              },
            ],
            bookmark: null,
          }),
        });
      }
    );

    await page.goto(`/pinterest/${BOARD_ID}`);

    // Assert skeleton renders first
    await expect(
      page.locator('[data-component="PinGridSkeleton"]')
    ).toBeVisible();

    // Assert skeleton resolves to PinGrid
    await expect(page.locator('[data-component="PinGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    // Assert at least one PinCard rendered
    const cards = page.locator('[data-component="PinCard"]');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('AC-infinite-scroll: scrolling sentinel triggers loadMorePins and appends additional pins', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish route for auth setup (same blocker as above). ' +
        'Re-enable once Epic A login/finish ships.'
    );

    await page.route(
      `https://api.pinterest.com/v5/boards/${BOARD_ID}/pins*`,
      async (route) => {
        const url = new URL(route.request().url());
        const bookmark = url.searchParams.get('bookmark');
        if (!bookmark) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [{ id: 'e2e-pin-page1', title: 'Page 1 Pin' }],
              bookmark: 'e2e-next-bookmark',
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              items: [{ id: 'e2e-pin-page2', title: 'Page 2 Pin' }],
              bookmark: null,
            }),
          });
        }
      }
    );

    await page.goto(`/pinterest/${BOARD_ID}`);

    // Wait for initial grid
    await expect(page.locator('[data-component="PinGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    // Scroll to sentinel
    const sentinel = page.locator('[data-component="InfiniteScrollSentinel"]');
    await sentinel.scrollIntoViewIfNeeded();

    // Assert second page appended
    await expect(page.locator('text=Page 2 Pin')).toBeVisible({
      timeout: 10_000,
    });

    // Page 1 pin still present (append, not replace)
    await expect(page.locator('text=Page 1 Pin')).toBeVisible();
  });

  test('AC-not-found: navigating to invalid boardId renders not-found.tsx', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires /login/finish route for auth setup. Also requires ' +
        'Pinterest API to return 404 for bogus board IDs. ' +
        'Re-enable once auth flow is wired.'
    );

    await page.route(
      `https://api.pinterest.com/v5/boards/${BOGUS_BOARD_ID}/pins*`,
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ code: 4180, message: 'Board not found' }),
        });
      }
    );

    await page.goto(`/pinterest/${BOGUS_BOARD_ID}`);

    // Assert not-found.tsx heading renders (not error.tsx)
    await expect(
      page.getByText(/Board not found|doesn't exist|no longer accessible/i)
    ).toBeVisible({ timeout: 10_000 });

    // Back link to /pinterest must be present
    await expect(page.locator('a[href="/pinterest"]')).toBeVisible();

    // Pin grid must NOT render
    await expect(page.locator('[data-component="PinGrid"]')).not.toBeVisible();
  });

  test('AC-image-host: no image-host config errors on pin card render', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires auth flow + i.pinimg.com image URLs in pin media fields. ' +
        'next.config.ts remote patterns from b1 should cover all pinimg.com ' +
        'subdomains. Re-enable once auth flow is wired.'
    );

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`/pinterest/${BOARD_ID}`);
    await expect(page.locator('[data-component="PinGrid"]')).toBeVisible({
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

  test('AC-touch-targets: pin card touch targets meet 44×44px minimum on tablet viewport', async ({
    page,
  }) => {
    test.skip(
      true,
      'TODO: Requires auth flow + visual breakpoint check at 768px. ' +
        'PinCard full-card <a> links far exceed 44×44px per design brief. ' +
        'Re-enable once auth flow is wired.'
    );

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`/pinterest/${BOARD_ID}`);
    await expect(page.locator('[data-component="PinGrid"]')).toBeVisible({
      timeout: 10_000,
    });

    const firstCard = page.locator('[data-component="PinCard"]').first();
    const box = await firstCard.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
