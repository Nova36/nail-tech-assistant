/**
 * c4-firestore-storage-rules — Storage rules for `users/{uid}/generations/`.
 *
 * Same path-derived ownership rule as references; separate test file so
 * each path family gets independent quadrants and the test name reflects
 * the path being exercised.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { ref, getBytes, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, BOB_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

const STUB_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG header

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-storage-generations',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('storage rules — users/{uid}/generations/', () => {
  it('allows the owner to WRITE generation output to their own prefix', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(
      alice.storage(),
      `users/${ALICE_UID}/generations/g1.png`
    );
    await assertSucceeds(uploadBytes(objectRef, STUB_BYTES));
  });

  it('denies WRITE under a different user prefix', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(
      alice.storage(),
      `users/${BOB_UID}/generations/g1.png`
    );
    await assertFails(uploadBytes(objectRef, STUB_BYTES));
  });

  it('denies READ under a different user prefix', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const seed = ref(ctx.storage(), `users/${ALICE_UID}/generations/g1.png`);
      await uploadBytes(seed, STUB_BYTES);
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    const objectRef = ref(
      bob.storage(),
      `users/${ALICE_UID}/generations/g1.png`
    );
    await assertFails(getBytes(objectRef));
  });

  it('denies READ by an unauthenticated client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const seed = ref(ctx.storage(), `users/${ALICE_UID}/generations/g1.png`);
      await uploadBytes(seed, STUB_BYTES);
    });
    const anon = testEnv.unauthenticatedContext();
    const objectRef = ref(
      anon.storage(),
      `users/${ALICE_UID}/generations/g1.png`
    );
    await assertFails(getBytes(objectRef));
  });
});
