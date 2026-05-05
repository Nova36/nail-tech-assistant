/**
 * d5 — visualizer shape-switch e2e
 *
 * Playwright spec: sign in, open a seeded design with a successful generation,
 * switch through all 6 NailShapes, assert:
 *   - visualizer DOM reflects each shape (data-active-shape attribute)
 *   - no /regenerate POST fires at any point
 *   - last shape persists across a full page reload
 *
 * Auth: uses the email-link emulator flow from tests/e2e/fixtures/emulator.ts.
 * Seeding: Firestore Admin SDK via emulator REST API, seeded per-test.
 *
 * NOTE: These tests are RED (skipped) until:
 *   1. d5 implement wires NailVisualizer + ShapeSelector into Confirm.tsx
 *   2. NailVisualizer exposes data-active-shape on its root element
 *   3. The /login/finish + /api/auth/session routes ship (auth emulator flow)
 *
 * Un-skip by removing `test.skip` once all three are satisfied.
 */
import { test, expect, type Page, type Request } from '@playwright/test';

import {
  clearAuthEmulatorAccounts,
  getLatestOobLink,
  EMULATOR_PROJECT_ID,
} from './fixtures/emulator';

const TEST_EMAIL = 'configured@example.test';

const ALL_SHAPES = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
] as const;

// ── Firestore Admin seed via emulator REST API ─────────────────────────────

const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

async function seedDesignWithGeneration(userId: string): Promise<string> {
  const projectId = EMULATOR_PROJECT_ID;
  const designId = `d5-e2e-design-${Date.now()}`;
  const generationId = `d5-e2e-gen-${Date.now()}`;

  const designBody = {
    fields: {
      userId: { stringValue: userId },
      name: { nullValue: null },
      nailShape: { stringValue: 'almond' },
      promptText: { stringValue: 'red glitter e2e test' },
      primaryReferenceId: { nullValue: null },
      secondaryReferenceIds: { arrayValue: { values: [] } },
      latestGenerationId: { stringValue: generationId },
      createdAt: { stringValue: new Date().toISOString() },
      updatedAt: { stringValue: new Date().toISOString() },
    },
  };

  const designRes = await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/designs/${designId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(designBody),
    }
  );
  if (!designRes.ok) {
    throw new Error(`Failed to seed design: ${designRes.status}`);
  }

  const generationBody = {
    fields: {
      designId: { stringValue: designId },
      userId: { stringValue: userId },
      status: { stringValue: 'success' },
      imageUrl: {
        stringValue: 'https://placehold.co/800x600/png?text=e2e-test',
      },
      promptText: { stringValue: 'red glitter e2e test' },
      errorCode: { nullValue: null },
      errorMessage: { nullValue: null },
      createdAt: { stringValue: new Date().toISOString() },
    },
  };

  const genRes = await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/generations/${generationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(generationBody),
    }
  );
  if (!genRes.ok) {
    throw new Error(`Failed to seed generation: ${genRes.status}`);
  }

  return designId;
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function signInViaEmailLink(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByRole('button', { name: /sign in|send link/i }).click();
  await page.waitForSelector('[data-testid="email-sent"]');
  const oobLink = await getLatestOobLink(TEST_EMAIL);
  await page.goto(oobLink);
  await page.waitForURL(/\/(?!login)/);
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe('d5 visualizer shape-switch', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      true,
      'Blocked: requires d5 implement (NailVisualizer in Confirm.tsx + data-active-shape) + /login/finish auth route. Un-skip once both ship.'
    );
    await clearAuthEmulatorAccounts();
    // suppress unused var warning — skip above prevents execution
    void page;
  });

  test('AC#1 — NailVisualizer renders on success design page', async ({
    page,
  }) => {
    await signInViaEmailLink(page);

    // Get the signed-in user id from cookie/session — use a known test uid
    const designId = await seedDesignWithGeneration('e2e-user-d5');
    await page.goto(`/design/${designId}`);

    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('AC#2 — switching all 6 shapes updates data-active-shape, no regenerate call', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const designId = await seedDesignWithGeneration('e2e-user-d5');
    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    const regenerateRequests: Request[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/regenerate')) {
        regenerateRequests.push(req);
      }
    });

    for (const shape of ALL_SHAPES) {
      await page
        .getByRole('button', { name: new RegExp(`^${shape}$`, 'i') })
        .click();

      await expect(page.locator('[data-active-shape]')).toHaveAttribute(
        'data-active-shape',
        shape,
        { timeout: 5_000 }
      );
    }

    expect(regenerateRequests).toHaveLength(0);
  });

  test('AC#3 — last selected shape persists after page reload', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const designId = await seedDesignWithGeneration('e2e-user-d5');
    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    // Pick stiletto as the final shape
    await page.getByRole('button', { name: /^stiletto$/i }).click();
    await expect(page.locator('[data-active-shape]')).toHaveAttribute(
      'data-active-shape',
      'stiletto',
      { timeout: 5_000 }
    );

    // Reload and verify shape persisted
    await page.reload();
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('[data-active-shape]')).toHaveAttribute(
      'data-active-shape',
      'stiletto',
      { timeout: 5_000 }
    );
  });

  test('AC#4 — PATCH failure reverts shape, shows error message', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const designId = await seedDesignWithGeneration('e2e-user-d5');
    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    // Intercept PATCH /shape and return 500 to force revert
    await page.route(`**/api/designs/${designId}/shape`, (route) => {
      void route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'server_error' }),
      });
    });

    // Initial shape is almond; click coffin
    await page.getByRole('button', { name: /^coffin$/i }).click();

    // Shape should revert to almond
    await expect(page.locator('[data-active-shape]')).toHaveAttribute(
      'data-active-shape',
      'almond',
      { timeout: 5_000 }
    );

    // Error message must surface
    await expect(page.getByText(/shape update failed/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('AC#5 — no /regenerate call fires during any shape switch', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const designId = await seedDesignWithGeneration('e2e-user-d5');
    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    const regenerateRequests: Request[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/regenerate')) {
        regenerateRequests.push(req);
      }
    });

    for (const shape of ALL_SHAPES) {
      await page
        .getByRole('button', { name: new RegExp(`^${shape}$`, 'i') })
        .click();
      await page.waitForTimeout(300);
    }

    expect(regenerateRequests).toHaveLength(0);
  });
});

// ── Per-shape PATCH persistence (headless, no auth) ──────────────────────

test.describe('d5 PATCH /api/designs/[id]/shape — network contract', () => {
  test('shape pill click sends PATCH with correct body (intercepted)', async ({
    page,
  }) => {
    test.skip(
      true,
      'Requires d5 implement + auth. Un-skip once Confirm.tsx ships NailVisualizer + ShapeSelector.'
    );

    const patchBodies: unknown[] = [];
    await page.route('**/api/designs/**/shape', async (route) => {
      const body = route.request().postDataJSON() as unknown;
      patchBodies.push(body);
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ status: 'updated', nailShape: 'coffin' }),
      });
    });

    // Would navigate and click coffin pill here after auth
    expect(patchBodies).toHaveLength(1);
    expect(patchBodies[0]).toMatchObject({ nailShape: 'coffin' });
  });
});
