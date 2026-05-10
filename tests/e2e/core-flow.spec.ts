/**
 * f5 — unified critical-path smoke (desktop Chrome).
 *
 * One signed-in session walks end-to-end across the product:
 *   login → dashboard → /pinterest → board → pin → /design/new →
 *   submit generation → result → shape switch → /library → design detail.
 *
 * Provider isolation (no page.route mocks needed):
 *   - PINTEREST_MOCK=ok  → lib/pinterest/client.ts returns the local fixtures
 *     in lib/pinterest/__fixtures__/{boards,pins}.ts.
 *   - VERTEX_MOCK=ok     → lib/ai/provider.ts returns canned image bytes
 *     synchronously (developer step in f5 implement).
 *   - Firebase Auth + Firestore emulators are wrapped via
 *     `firebase emulators:exec` in playwright.config.ts webServer.
 *
 * Assertions are role/text only. The single exception is
 * `[data-testid="nail-visualizer"]` for the visualizer image — that test-id
 * is the only stable hook on the rendered <img> wrapper (confirmed via grep
 * at app/(authenticated)/design/[designId]/Confirm.tsx:218).
 *
 * Spec extension is `.spec.ts` (not `.spec.tsx`) per the rules-lane glob
 * convention, even though Playwright doesn't share that constraint.
 */
import { expect, test } from '@playwright/test';

import { signInViaEmailLink, TEST_EMAIL } from './fixtures/auth';
import { clearAuthEmulatorAccounts } from './fixtures/emulator';

// Allow the generation roundtrip a generous ceiling — VERTEX_MOCK should
// return promptly but the createDesign server action still hits Firestore
// emulators and resolves a storage URL.
const GENERATION_TIMEOUT_MS = 20_000;

test.describe.configure({ mode: 'serial' });

test.describe('f5 critical-path smoke (desktop)', () => {
  test.beforeEach(async () => {
    await clearAuthEmulatorAccounts();
  });

  test('login → pinterest → pin select → wizard → generate → library → design', async ({
    page,
  }) => {
    // ── Step 1: Login ─────────────────────────────────────────────────────
    await signInViaEmailLink(page, TEST_EMAIL);
    await expect(page).not.toHaveURL(/\/login(\?|\/|$)/);

    // ── Step 2: Pinterest boards grid ─────────────────────────────────────
    await page.goto('/pinterest');
    await expect(
      page.getByRole('heading', { name: /your\s+boards/i })
    ).toBeVisible();

    // BoardCard is a Link with aria-label="<name> (<count> pins)".
    // PINTEREST_MOCK=ok serves mockBoardsPage1; first entry is "Spring Pastels".
    const firstBoardLink = page.getByRole('link', {
      name: /Spring Pastels/i,
    });
    await expect(firstBoardLink).toBeVisible();
    await expect(page.getByRole('link', { name: /Gel Inspo/i })).toBeVisible();

    // ── Step 3: Open first board, pin grid visible ────────────────────────
    await firstBoardLink.click();
    await expect(page).toHaveURL(/\/pinterest\/mock-board-1/);

    // PINS_BY_BOARD['mock-board-1'].page1[0].title = "Soft Bloom"
    // SelectablePinCard renders aria-label="Select <title>" — but the
    // /pinterest/[boardId] route uses PinCard (anchor variant) so the
    // pin appears as a Link, not a button.
    const firstPin = page
      .getByRole('link', { name: /Soft Bloom/i })
      .or(page.getByRole('button', { name: /Soft Bloom/i }))
      .first();
    await expect(firstPin).toBeVisible();

    // ── Step 5: Navigate to /design/new wizard ────────────────────────────
    await page.goto('/design/new');
    await expect(
      page.getByRole('heading', { name: /new workspace/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /^inspiration$/i })
    ).toBeVisible();

    // ── Step 4 (re-routed): Pick a reference inside the wizard ───────────
    // The wizard's Step 1 inspiration grid renders SelectablePinCard
    // instances seeded from the same Pinterest fixtures. Selecting a card
    // calls selectPinterestPin (server action) and adds it to the
    // working set — surfaced by the "Selected references" container.
    const wizardPinButton = page
      .getByRole('button', { name: /select\s+/i })
      .first();
    await expect(wizardPinButton).toBeVisible();
    await wizardPinButton.click();
    await expect(page.getByLabel('Selected references')).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 6: Continue to Direction step, pick shape, generate ─────────
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(
      page.getByRole('heading', { name: /^direction$/i })
    ).toBeVisible();

    // Mark the only working-set reference as primary so the Generate
    // button enables. ReferenceCard exposes a "Make primary" / "Primary"
    // affordance — match either label.
    await page
      .getByRole('button', { name: /make primary|set primary|primary/i })
      .first()
      .click();

    // Pick a non-default nail shape so step 8's switch still has somewhere
    // distinct to go (default is "almond" per Wizard initial state).
    await page.getByRole('button', { name: /^almond$/i }).click();

    await page.getByRole('button', { name: /generate/i }).click();

    // ── Step 6→7: Wizard navigates to /design/[designId]; pending or success.
    await page.waitForURL(/\/design\/[^/]+$/, {
      timeout: GENERATION_TIMEOUT_MS,
    });

    // ── Step 7: Generation result image renders (visualizer) ─────────────
    const visualizer = page.locator('[data-testid="nail-visualizer"]');
    await expect(visualizer).toBeVisible({ timeout: GENERATION_TIMEOUT_MS });

    // ── Step 8: Shape selector visible — switch to a different shape ─────
    const coffinPill = page.getByRole('button', { name: /^coffin$/i });
    await expect(coffinPill).toBeVisible();
    await coffinPill.click();
    await expect(coffinPill).toHaveAttribute('aria-pressed', 'true', {
      timeout: 5_000,
    });

    // ── Step 9: Library — seeded design card visible ──────────────────────
    await page.goto('/library');
    await expect(
      page.getByRole('heading', { name: /^library$/i })
    ).toBeVisible();

    // The freshly-generated design persists via createDesign +
    // persistGenerationResult; DesignLibrary renders one DesignCard per
    // design. Card link aria-label is the design name (default: empty
    // → falls back to design id), so match the article role + the
    // /design/<id> link inside it.
    const designLink = page
      .locator('[data-component="DesignLibrary"]')
      .getByRole('link')
      .first();
    await expect(designLink).toBeVisible({ timeout: 10_000 });

    // ── Step 10: Click design card → design detail loads ──────────────────
    await designLink.click();
    await page.waitForURL(/\/design\/[^/]+$/);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: GENERATION_TIMEOUT_MS,
    });
  });
});
