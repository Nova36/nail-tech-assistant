/**
 * c4-firestore-storage-rules — `references` collection security tests.
 *
 * Quadrants: owner allow / non-owner deny / unauth deny / cross-user UID
 * mismatch deny / owner-immutability of userId.
 *
 * TDD red phase: rules for `references/{refId}` do not exist yet; writes
 * will hit the catchall `if false` and assertSucceeds will fail.
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

const aliceRefData = {
  userId: ALICE_UID,
  source: 'pinterest',
  sourceUrl: 'https://www.pinterest.com/pin/r1/',
  storagePath: `users/${ALICE_UID}/references/r1.jpg`,
  pinterestPinId: 'r1',
  createdAt: '2026-04-29T00:00:00Z',
};

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-references',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('references collection security rules', () => {
  it('allows the owner to CREATE a reference with their own userId', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'references', 'r1');
    await assertSucceeds(setDoc(ref, aliceRefData));
  });

  it('denies CREATE when request userId does not match auth uid (cross-user injection)', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'references', 'r1');
    await assertFails(setDoc(ref, { ...aliceRefData, userId: BOB_UID }));
  });

  it('denies READ by a non-owner', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData);
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    const ref = doc(bob.firestore(), 'references', 'r1');
    await assertFails(getDoc(ref));
  });

  it('denies READ by an unauthenticated client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData);
    });
    const anon = testEnv.unauthenticatedContext();
    const ref = doc(anon.firestore(), 'references', 'r1');
    await assertFails(getDoc(ref));
  });

  it('denies UPDATE that mutates userId (owner-immutability)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData);
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'references', 'r1');
    await assertFails(updateDoc(ref, { userId: BOB_UID }));
  });

  it('allows the owner to UPDATE non-owner fields', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData);
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'references', 'r1');
    await assertSucceeds(
      updateDoc(ref, { sourceUrl: 'https://www.pinterest.com/pin/r1-updated/' })
    );
  });
});
