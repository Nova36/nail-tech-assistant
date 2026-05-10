/**
 * f5 — tablet (iPad Pro 11 landscape) critical-path re-run.
 *
 * Same flow as core-flow.spec.ts but at the iPad Pro 11 landscape preset
 * (1194×834). Story originally referenced 1366×1024 — that's not a
 * Playwright device preset; using the actual `iPad Pro 11 landscape`
 * preset matches f4 tablet shell breakpoints (≥768px sidebar).
 *
 * Assertions are minimal: each step asserts (a) URL and (b) a primary
 * heading (role: heading) is visible. No pixel snapshots, no overflow
 * measurement, no class assertions. The intent is "the route loads and
 * the primary affordance renders at iPad viewport" — visual fidelity is
 * the visual-qa skill's lane, not this spec's.
 *
 * Project routing: this file uses `test.use({ ...devices['iPad Pro 11
 * landscape'] })` at file scope, so under the default project it runs at
 * iPad viewport. f5 implement adds a separate `ipad-landscape` project
 * with `testMatch` scoped to this file; both project configs share the
 * iPad device preset because it's set inside the file.
 */
import { devices, expect, test } from '@playwright/test';

import { signInViaEmailLink, TEST_EMAIL } from './fixtures/auth';
import { clearAuthEmulatorAccounts } from './fixtures/emulator';

test.use({ ...devices['iPad Pro 11 landscape'] });

const GENERATION_TIMEOUT_MS = 20_000;

test.describe.configure({ mode: 'serial' });

test.describe('f5 critical-path smoke (iPad Pro 11 landscape)', () => {
  test.beforeEach(async () => {
    await clearAuthEmulatorAccounts();
  });

  test('tablet viewport — full critical path renders', async ({ page }) => {
    // Step 1: Login
    await signInViaEmailLink(page, TEST_EMAIL);
    await expect(page).not.toHaveURL(/\/login(\?|\/|$)/);

    // Step 2: Pinterest boards
    await page.goto('/pinterest');
    await expect(page).toHaveURL(/\/pinterest$/);
    await expect(
      page.getByRole('heading', { name: /your\s+boards/i })
    ).toBeVisible();

    // Step 3: Open first board
    await page.getByRole('link', { name: /Spring Pastels/i }).click();
    await expect(page).toHaveURL(/\/pinterest\/mock-board-1/);

    // Step 5: Wizard
    await page.goto('/design/new');
    await expect(page).toHaveURL(/\/design\/new$/);
    await expect(
      page.getByRole('heading', { name: /new workspace/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /^inspiration$/i })
    ).toBeVisible();

    // Step 4 (in-wizard): pick a reference
    const wizardPinButton = page
      .getByRole('button', { name: /select\s+/i })
      .first();
    await wizardPinButton.click();
    await expect(page.getByLabel('Selected references')).toBeVisible({
      timeout: 10_000,
    });

    // Step 6: Direction → generate
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(
      page.getByRole('heading', { name: /^direction$/i })
    ).toBeVisible();
    await page
      .getByRole('button', { name: /make primary|set primary|primary/i })
      .first()
      .click();
    await page.getByRole('button', { name: /generate/i }).click();

    // Step 7: Result loaded
    await page.waitForURL(/\/design\/[^/]+$/, {
      timeout: GENERATION_TIMEOUT_MS,
    });
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: GENERATION_TIMEOUT_MS,
    });

    // Step 8: Shape switch (smoke confirm only)
    const coffinPill = page.getByRole('button', { name: /^coffin$/i });
    await expect(coffinPill).toBeVisible();
    await coffinPill.click();

    // Step 9: Library
    await page.goto('/library');
    await expect(page).toHaveURL(/\/library$/);
    await expect(
      page.getByRole('heading', { name: /^library$/i })
    ).toBeVisible();

    // Step 10: Design detail
    const designLink = page
      .locator('[data-component="DesignLibrary"]')
      .getByRole('link')
      .first();
    await expect(designLink).toBeVisible({ timeout: 10_000 });
    await designLink.click();
    await page.waitForURL(/\/design\/[^/]+$/);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: GENERATION_TIMEOUT_MS,
    });
  });
});
