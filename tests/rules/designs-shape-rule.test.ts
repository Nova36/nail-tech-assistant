/**
 * d2-shape-rule — Firestore rules tests for the nail_shape field-scoped update.
 *
 * Runs in the rules lane (vitest.config.rules.ts). Uses @firebase/rules-unit-testing
 * client SDK against the Firestore emulator — does NOT import any server-only helpers,
 * so no `server-only` alias needed beyond what vitest.config.rules.ts already provides.
 *
 * Covers:
 *  - Authenticated owner update {nail_shape, updatedAt} → ALLOWED
 *  - Authenticated owner update {name, updatedAt} → ALLOWED (d7 clause also landed by d2)
 *  - Authenticated owner update {nail_shape, prompt_text} (3+ keys, no clause matches) → DENIED
 *  - Authenticated non-owner update → DENIED
 *  - Unauthenticated update → DENIED
 *  - Permissive-baseline-removed: {prompt_text} only → DENIED (was ALLOWED under old baseline)
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, BOB_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

const aliceDesignData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  name: null,
  primaryReferenceId: 'r1',
  secondaryReferenceIds: [],
  promptText: 'matte rose',
  nail_shape: 'almond',
  nailShape: 'almond',
  latestGenerationId: null,
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
  ...overrides,
});

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-d2-shape',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('designs/{designId} — d2 field-scoped update rules', () => {
  it('ALLOWS authenticated owner update with {nail_shape, updatedAt}', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), 'designs', 'd1'), {
        nail_shape: 'coffin',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });

  it('ALLOWS authenticated owner update with {name, updatedAt} (d7 clause)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), 'designs', 'd1'), {
        name: 'My Design',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });

  it('DENIES authenticated owner update with {nail_shape, prompt_text} (3-key diff, no clause matches)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), 'designs', 'd1'), {
        nail_shape: 'square',
        prompt_text: 'new prompt',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });

  it('DENIES authenticated non-owner update with valid diff', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(
      updateDoc(doc(bob.firestore(), 'designs', 'd1'), {
        nail_shape: 'round',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });

  it('DENIES unauthenticated update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      updateDoc(doc(anon.firestore(), 'designs', 'd1'), {
        nail_shape: 'oval',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });

  it('DENIES {prompt_text} only — permissive baseline removed', async () => {
    // Under the old permissive `allow update` baseline, any-field owner update was ALLOWED.
    // After the REPLACE with field-scoped clauses, prompt_text alone is DENIED.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), 'designs', 'd1'), {
        prompt_text: 'hacked prompt',
        updatedAt: '2026-05-01T01:00:00Z',
      })
    );
  });
});
