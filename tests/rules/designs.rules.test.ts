/**
 * c4-firestore-storage-rules — `designs` collection security tests.
 *
 * Mirrors references with one extra concern: rules do NOT validate cross-doc
 * ownership of `primaryReferenceId` / `secondaryReferenceIds[]`. Cross-doc
 * validation belongs at ingest (c8 builder + c9 createDesign), not in rules.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, BOB_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

const aliceDesignData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  name: null,
  primaryReferenceId: 'r1',
  secondaryReferenceIds: [],
  promptText: null,
  nailShape: 'almond',
  latestGenerationId: null,
  createdAt: '2026-04-29T00:00:00Z',
  updatedAt: '2026-04-29T00:00:00Z',
  ...overrides,
});

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-designs',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('designs collection security rules', () => {
  it('allows the owner to CREATE a design with their own userId', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'designs', 'd1');
    await assertSucceeds(setDoc(ref, aliceDesignData()));
  });

  it('denies CREATE when userId is mismatched', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'designs', 'd1');
    await assertFails(setDoc(ref, aliceDesignData({ userId: BOB_UID })));
  });

  it('allows secondaryReferenceIds with 0, 1, or many entries', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    for (const ids of [[], ['r2'], ['r2', 'r3', 'r4', 'r5']]) {
      const id = `d-${ids.length}`;
      const ref = doc(alice.firestore(), 'designs', id);
      await assertSucceeds(
        setDoc(ref, aliceDesignData({ secondaryReferenceIds: ids }))
      );
    }
  });

  it('does NOT validate cross-doc reference ownership (rules-layer scope)', async () => {
    // Rules allow alice to create a design that names primaryReferenceId 'r-bob'
    // even though that hypothetical reference would be owned by someone else.
    // Cross-doc consistency is c8/c9's responsibility; rules only enforce
    // ownership of the row being written.
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'designs', 'd-cross');
    await assertSucceeds(
      setDoc(ref, aliceDesignData({ primaryReferenceId: 'r-bob' }))
    );
  });

  it('denies READ by a non-owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), 'designs', 'd1')));
  });

  it('denies READ by an unauthenticated client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), 'designs', 'd1')));
  });

  it('denies UPDATE that mutates userId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), 'designs', 'd1'), { userId: BOB_UID })
    );
  });
});
