/**
 * d5 — per-shape visualizer screenshot snapshots
 *
 * FIRST Playwright snapshot harness in this project.
 *
 * Implement step MUST:
 *   1. Add `snapshotDir` + `toHaveScreenshot` defaults to playwright.config.ts
 *   2. Run `pnpm exec playwright test --update-snapshots tests/e2e/visualizer-snapshots.spec.ts`
 *      to populate the 6 baseline PNGs under
 *      tests/e2e/visualizer-snapshots.spec.ts-snapshots/
 *   3. Commit the baseline images.
 *
 * These tests are RED on first run (no baselines) — that is correct TDD-red
 * state. After baselines are committed they become green regression guards.
 *
 * Snapshot tolerance: maxDiffPixelRatio 0.02 (2%) to absorb font-AA jitter
 * between CI and local. Tune down once baselines stabilise.
 *
 * All shapes are skipped until d5 implement ships Confirm.tsx + auth route.
 */
import { test, expect } from '@playwright/test';

import {
  clearAuthEmulatorAccounts,
  getLatestOobLink,
  EMULATOR_PROJECT_ID,
} from './fixtures/emulator';

const TEST_EMAIL = 'configured@example.test';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const ALL_SHAPES = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
] as const;

// ── Seed helper ────────────────────────────────────────────────────────────

async function seedDesign(userId: string): Promise<string> {
  const projectId = EMULATOR_PROJECT_ID;
  const designId = `d5-snap-design-${Date.now()}`;
  const generationId = `d5-snap-gen-${Date.now()}`;

  const designBody = {
    fields: {
      userId: { stringValue: userId },
      name: { nullValue: null },
      nailShape: { stringValue: 'almond' },
      promptText: { stringValue: 'snapshot baseline test' },
      primaryReferenceId: { nullValue: null },
      secondaryReferenceIds: { arrayValue: { values: [] } },
      latestGenerationId: { stringValue: generationId },
      createdAt: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  };

  await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/designs/${designId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(designBody),
    }
  );

  const generationBody = {
    fields: {
      designId: { stringValue: designId },
      userId: { stringValue: userId },
      status: { stringValue: 'success' },
      imageUrl: {
        stringValue: 'https://placehold.co/800x600/png?text=snapshot-baseline',
      },
      promptText: { stringValue: 'snapshot baseline test' },
      errorCode: { nullValue: null },
      errorMessage: { nullValue: null },
      createdAt: { stringValue: new Date().toISOString() },
    },
  };

  await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/generations/${generationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generationBody),
    }
  );

  return designId;
}

// ── Shared state ───────────────────────────────────────────────────────────

let designId: string;

test.describe('d5 per-shape visualizer snapshots', () => {
  test.beforeAll(async () => {
    // Seed once for the whole describe block — all shapes share the same design
    await clearAuthEmulatorAccounts();
    designId = await seedDesign('e2e-snap-user-d5');
  });

  // Sign in once per worker via storage state (shared context) — Playwright
  // handles this automatically when tests run in the same describe block with
  // a shared browser context (default: one context per describe).

  for (const shape of ALL_SHAPES) {
    test(`snapshot — ${shape}`, async ({ page }) => {
      test.skip(
        true,
        `Blocked: requires d5 implement (Confirm.tsx NailVisualizer + ShapeSelector + data-active-shape) + auth route + snapshot baselines. Run --update-snapshots after implement to seed baselines.`
      );

      // Auth
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(TEST_EMAIL);
      await page.getByRole('button', { name: /sign in|send link/i }).click();
      await page.waitForSelector('[data-testid="email-sent"]');
      const oobLink = await getLatestOobLink(TEST_EMAIL);
      await page.goto(oobLink);
      await page.waitForURL(/\/(?!login)/);

      // Navigate to design
      await page.goto(`/design/${designId}`);
      await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible(
        {
          timeout: 15_000,
        }
      );

      // Switch to shape
      if (shape !== 'almond') {
        await page
          .getByRole('button', { name: new RegExp(`^${shape}$`, 'i') })
          .click();
        await expect(page.locator('[data-active-shape]')).toHaveAttribute(
          'data-active-shape',
          shape,
          { timeout: 5_000 }
        );
      }

      // Let the visualizer settle (SVG clip paths, possible image load)
      await page.waitForTimeout(500);

      // Capture snapshot scoped to the visualizer element
      const visualizer = page.locator('[data-testid="nail-visualizer"]');
      await expect(visualizer).toHaveScreenshot(`visualizer-${shape}.png`, {
        maxDiffPixelRatio: 0.02,
        // Mask any dynamic text to avoid timestamp/label jitter
        mask: [page.locator('[data-snapshot-mask]')],
      });
    });
  }
});
