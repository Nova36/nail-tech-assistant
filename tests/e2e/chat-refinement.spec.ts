/**
 * e6 — chat refinement multi-turn e2e
 *
 * Playwright spec: sign in, open a saved design with a successful current
 * generation, submit a first refinement ("make it more pastel"), watch the
 * iteration update, then submit a second turn ("add gold accents") and
 * assert the panel shows ordered turn history with the second result as
 * Current.
 *
 * AC mapping (story `e6-chat-refinement-e2e.yaml`):
 *   - AC#1 → first refinement persists as a chat-turn row + linked generation
 *     and the visualizer image updates.
 *   - AC#2 → second refinement completes in sequence, ordered turn history
 *     stays tied to the current image.
 *   - AC#3 → existing /design/[designId] success path is not regressed by
 *     the new chat surface (RegenerateButton + Back-to-adjust still reachable).
 *
 * Auth: email-link flow via `tests/e2e/fixtures/emulator.ts`.
 * Seeding: Firestore Admin via emulator REST API (mirror of
 * `tests/e2e/visualizer-shapes.spec.ts:43-102`).
 * Provider isolation: `page.route('**\/api/designs/*\/chat')` returns canned
 * responses + writes the matching chat_turn + generation docs into the
 * Firestore emulator so the next page hydration reflects them. No live
 * Gemini/Vertex calls.
 *
 * NOTE: These tests are RED (skipped) until:
 *   1. Playwright `webServer` boots the Firestore + Storage emulators
 *      alongside Auth (current config: `--only auth`).
 *   2. ChatRefinementPanel.tsx triggers `router.refresh()` on successful
 *      Send so the new turn surfaces without a manual reload (e5 polish).
 *   3. The /login/finish + /api/auth/session routes ship for the email-link
 *      flow (shared blocker with `visualizer-shapes.spec.ts`).
 *
 * Un-skip by removing `test.skip` once all three are satisfied.
 */
import {
  test,
  expect,
  type Page,
  type Request,
  type Route,
} from '@playwright/test';

import {
  EMULATOR_PROJECT_ID,
  clearAuthEmulatorAccounts,
  getLatestOobLink,
} from './fixtures/emulator';

const TEST_EMAIL = 'configured@example.test';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
const PLACEHOLDER_IMAGE = 'https://placehold.co/800x600/png?text=e6-current';
const PLACEHOLDER_TURN_1 = 'https://placehold.co/800x600/png?text=e6-turn-1';
const PLACEHOLDER_TURN_2 = 'https://placehold.co/800x600/png?text=e6-turn-2';

// ── Firestore Admin seed via emulator REST API ─────────────────────────────

async function seedDesignWithCurrentGeneration(
  userId: string
): Promise<{ designId: string; generationId: string }> {
  const projectId = EMULATOR_PROJECT_ID;
  const designId = `e6-design-${Date.now()}`;
  const generationId = `e6-gen-${Date.now()}`;
  const now = new Date().toISOString();

  const designBody = {
    fields: {
      userId: { stringValue: userId },
      name: { stringValue: 'Soft Lavender French' },
      nailShape: { stringValue: 'almond' },
      promptText: { stringValue: 'soft lavender ombré French, almond shape' },
      primaryReferenceId: { nullValue: null },
      secondaryReferenceIds: { arrayValue: { values: [] } },
      latestGenerationId: { stringValue: generationId },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now },
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
      resultStoragePath: { stringValue: 'users/e6/g/current.jpg' },
      imageUrl: { stringValue: PLACEHOLDER_IMAGE },
      promptText: { stringValue: 'soft lavender ombré French, almond shape' },
      errorCode: { nullValue: null },
      errorMessage: { nullValue: null },
      chatTurnId: { nullValue: null },
      createdAt: { stringValue: now },
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

  return { designId, generationId };
}

async function seedChatTurnAndGeneration(input: {
  designId: string;
  userId: string;
  turnId: string;
  generationId: string;
  message: string;
  imageUrl: string;
  storagePath: string;
}): Promise<void> {
  const projectId = EMULATOR_PROJECT_ID;
  const now = new Date().toISOString();

  const turnBody = {
    fields: {
      designId: { stringValue: input.designId },
      userId: { stringValue: input.userId },
      message: { stringValue: input.message },
      status: { stringValue: 'success' },
      generationId: { stringValue: input.generationId },
      createdAt: { stringValue: now },
      updatedAt: { stringValue: now },
    },
  };

  const turnRes = await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/designs/${input.designId}/chat_turns/${input.turnId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turnBody),
    }
  );
  if (!turnRes.ok) {
    throw new Error(`Failed to seed chat_turn: ${turnRes.status}`);
  }

  const genBody = {
    fields: {
      designId: { stringValue: input.designId },
      userId: { stringValue: input.userId },
      status: { stringValue: 'success' },
      resultStoragePath: { stringValue: input.storagePath },
      imageUrl: { stringValue: input.imageUrl },
      chatTurnId: { stringValue: input.turnId },
      promptText: { stringValue: input.message },
      errorCode: { nullValue: null },
      errorMessage: { nullValue: null },
      createdAt: { stringValue: now },
    },
  };

  const genRes = await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/generations/${input.generationId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(genBody),
    }
  );
  if (!genRes.ok) {
    throw new Error(`Failed to seed turn-generation: ${genRes.status}`);
  }
}

async function patchDesignLatestGeneration(input: {
  designId: string;
  userId: string;
  newLatestGenerationId: string;
}): Promise<void> {
  const projectId = EMULATOR_PROJECT_ID;
  const now = new Date().toISOString();
  const body = {
    fields: {
      latestGenerationId: { stringValue: input.newLatestGenerationId },
      updatedAt: { stringValue: now },
    },
  };
  await fetch(
    `http://${FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/designs/${input.designId}?updateMask.fieldPaths=latestGenerationId&updateMask.fieldPaths=updatedAt`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

// ── Provider-isolation route handler ───────────────────────────────────────

type StubbedTurn = {
  message: string;
  turnId: string;
  generationId: string;
  imageUrl: string;
  storagePath: string;
};

function stubChatRoute(
  page: Page,
  designId: string,
  userId: string,
  scriptedTurns: StubbedTurn[]
): { capturedRequests: Request[] } {
  const capturedRequests: Request[] = [];
  let cursor = 0;

  void page.route(
    `**/api/designs/${designId}/chat`,
    async (route: Route, request: Request) => {
      capturedRequests.push(request);
      const next = scriptedTurns[cursor];
      if (!next) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'failure',
            errorCode: 'unknown',
            message: 'Stub exhausted scripted turns.',
          }),
        });
        return;
      }
      cursor += 1;

      // Persist the canned turn + its generation so the next reload hydrates
      // them through the real loader path.
      await seedChatTurnAndGeneration({
        designId,
        userId,
        turnId: next.turnId,
        generationId: next.generationId,
        message: next.message,
        imageUrl: next.imageUrl,
        storagePath: next.storagePath,
      });
      await patchDesignLatestGeneration({
        designId,
        userId,
        newLatestGenerationId: next.generationId,
      });

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          turnId: next.turnId,
          generationId: next.generationId,
        }),
      });
    }
  );

  return { capturedRequests };
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

test.describe('e6 chat refinement multi-turn flow', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      true,
      'Blocked: requires (1) Playwright webServer to boot Firestore + Storage emulators alongside Auth, (2) ChatRefinementPanel router.refresh() on Send success, (3) /login/finish + /api/auth/session shipped (shared blocker with visualizer-shapes.spec.ts). Un-skip when all three land.'
    );
    await clearAuthEmulatorAccounts();
    void page;
  });

  test('AC#1 — first refinement creates a chat turn and updates the visualizer', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const userId = 'e2e-user-e6';
    const { designId } = await seedDesignWithCurrentGeneration(userId);

    const { capturedRequests } = stubChatRoute(page, designId, userId, [
      {
        message: 'make it more pastel',
        turnId: 'e6-turn-1',
        generationId: 'e6-gen-turn-1',
        imageUrl: PLACEHOLDER_TURN_1,
        storagePath: 'users/e6/g/turn-1.jpg',
      },
    ]);

    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('textbox').first().fill('make it more pastel');
    await page.getByRole('button', { name: /^send$/i }).click();

    await expect.poll(() => capturedRequests.length).toBe(1);
    const body = capturedRequests[0]?.postDataJSON() as {
      message?: string;
      retryTurnId?: string;
    };
    expect(body.message).toBe('make it more pastel');
    expect(body.retryTurnId).toBeUndefined();

    // After router.refresh() lands, the new turn surfaces without a manual
    // reload. Until then, the spec asserts the persisted state by reloading.
    await page.reload();
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });
    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(1);
    await expect(items.first()).toHaveText(/make it more pastel/);
    await expect(
      page.locator('[data-testid="nail-visualizer"] img')
    ).toHaveAttribute('src', PLACEHOLDER_TURN_1);
  });

  test('AC#2 — second refinement builds on the first; ordered turn history persists', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const userId = 'e2e-user-e6';
    const { designId } = await seedDesignWithCurrentGeneration(userId);

    const { capturedRequests } = stubChatRoute(page, designId, userId, [
      {
        message: 'make it more pastel',
        turnId: 'e6-turn-1',
        generationId: 'e6-gen-turn-1',
        imageUrl: PLACEHOLDER_TURN_1,
        storagePath: 'users/e6/g/turn-1.jpg',
      },
      {
        message: 'add gold accents',
        turnId: 'e6-turn-2',
        generationId: 'e6-gen-turn-2',
        imageUrl: PLACEHOLDER_TURN_2,
        storagePath: 'users/e6/g/turn-2.jpg',
      },
    ]);

    await page.goto(`/design/${designId}`);

    // Turn 1
    await page.getByRole('textbox').first().fill('make it more pastel');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect.poll(() => capturedRequests.length).toBe(1);
    await page.reload();

    // Turn 2 — submitted while turn 1 is the visible Current.
    await page.getByRole('textbox').first().fill('add gold accents');
    await page.getByRole('button', { name: /^send$/i }).click();
    await expect.poll(() => capturedRequests.length).toBe(2);
    await page.reload();

    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(items.nth(0)).toHaveText(/make it more pastel/);
    await expect(items.nth(1)).toHaveText(/add gold accents/);
    // Turn 2 is the latest successful, so its row carries the Current badge.
    await expect(items.nth(1)).toContainText(/current/i);
    await expect(
      page.locator('[data-testid="nail-visualizer"] img')
    ).toHaveAttribute('src', PLACEHOLDER_TURN_2);
  });

  test('AC#3 — existing design-detail controls remain reachable (no regression)', async ({
    page,
  }) => {
    await signInViaEmailLink(page);
    const userId = 'e2e-user-e6';
    const { designId } = await seedDesignWithCurrentGeneration(userId);

    await page.goto(`/design/${designId}`);
    await expect(page.locator('[data-testid="nail-visualizer"]')).toBeVisible({
      timeout: 10_000,
    });

    // RegenerateButton stays in the left column as the P0 fallback.
    await expect(
      page.getByRole('button', { name: /regenerate/i })
    ).toBeVisible();
    // Back-to-adjust affordance remains reachable.
    await expect(
      page.getByRole('button', { name: /back to adjust/i })
    ).toBeVisible();
    // ChatRefinementPanel surface coexists.
    await expect(page.getByText(/refine with chat/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^send$/i })).toBeVisible();
  });
});
