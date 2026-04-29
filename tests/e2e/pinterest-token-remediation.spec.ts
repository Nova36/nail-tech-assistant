/**
 * b4-pinterest-token-remediation-views — Playwright e2e smoke tests
 *
 * Both tests are SKIPPED pending mock-mode support for forcing 401/403 from env.
 * Same skip pattern as b3 (tests/e2e/pinterest-board-detail.spec.ts).
 *
 * TODO(b5): enable once mock-mode supports forcing 401/403 from env.
 */
import { test, expect } from '@playwright/test';

test.describe('b4 /pinterest token remediation — e2e smoke', () => {
  test.skip('renders TokenInvalidView when configured token is invalid', async ({
    page,
  }) => {
    // TODO(b5): enable once mock-mode supports forcing 401/403 from env
    // Plan: set PINTEREST_MOCK=force_401 (or equivalent) in env, navigate to /pinterest,
    // assert TokenInvalidView renders.

    await page.goto('/pinterest');

    // Heading for 401 branch
    await expect(page.getByText('Pinterest needs a fresh token')).toBeVisible({
      timeout: 10_000,
    });

    // Portal link must be present
    await expect(
      page.locator('a[href="https://developers.pinterest.com/apps/"]')
    ).toBeVisible();

    // data-component must be present
    await expect(
      page.locator('[data-component="TokenInvalidView"]')
    ).toBeVisible();

    // BoardGrid must NOT render
    await expect(
      page.locator('[data-component="BoardGrid"]')
    ).not.toBeVisible();
  });

  test.skip('renders InsufficientScopeView when configured token lacks scopes', async ({
    page,
  }) => {
    // TODO(b5): enable once mock-mode supports forcing 401/403 from env
    // Plan: set PINTEREST_MOCK=force_403 (or equivalent) in env, navigate to /pinterest,
    // assert InsufficientScopeView renders.

    await page.goto('/pinterest');

    // Heading for 403 branch
    await expect(page.getByText('Pinterest needs broader access')).toBeVisible({
      timeout: 10_000,
    });

    // Portal link must be present
    await expect(
      page.locator('a[href="https://developers.pinterest.com/apps/"]')
    ).toBeVisible();

    // data-component must be present
    await expect(
      page.locator('[data-component="InsufficientScopeView"]')
    ).toBeVisible();

    // TokenInvalidView must NOT render
    await expect(
      page.locator('[data-component="TokenInvalidView"]')
    ).not.toBeVisible();
  });
});
