/**
 * c4-firestore-storage-rules — `generations` collection security tests.
 *
 * Generation rows carry a denormalized `userId` so rules can enforce
 * ownership without a get() lookup to the parent Design. Lifecycle status
 * transitions (pending → success | failure) are NOT enforced by rules in
 * v1; c15 lifecycle code owns that. Rules only enforce ownership.
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

const aliceGenData = (overrides: Record<string, unknown> = {}) => ({
  designId: 'd1',
  userId: ALICE_UID,
  requestJson: { contents: [] },
  resultStoragePath: null,
  providerResponseMetadata: null,
  status: 'pending',
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-04-29T00:00:00Z',
  updatedAt: '2026-04-29T00:00:00Z',
  ...overrides,
});

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-generations',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('generations collection security rules', () => {
  it('allows the owner to CREATE a pending generation', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'generations', 'g1');
    await assertSucceeds(setDoc(ref, aliceGenData()));
  });

  it('denies CREATE with mismatched userId', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'generations', 'g1');
    await assertFails(setDoc(ref, aliceGenData({ userId: BOB_UID })));
  });

  it('allows the owner to TRANSITION pending → success', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), 'generations', 'g1'), {
        status: 'success',
        resultStoragePath: `users/${ALICE_UID}/generations/g1.png`,
        updatedAt: '2026-04-29T00:01:00Z',
      })
    );
  });

  it('allows the owner to TRANSITION pending → failure with errorCode', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), 'generations', 'g1'), {
        status: 'failure',
        errorCode: 'rate_limit',
        errorMessage: '429',
        updatedAt: '2026-04-29T00:01:00Z',
      })
    );
  });

  it('denies READ by a non-owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), 'generations', 'g1')));
  });

  it('denies READ by an unauthenticated client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), 'generations', 'g1')));
  });

  it('denies UPDATE that mutates userId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), 'generations', 'g1'), {
        userId: BOB_UID,
      })
    );
  });
});
