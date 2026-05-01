/**
 * c4-firestore-storage-rules — Storage rules for `users/{uid}/references/`.
 *
 * Path-derived ownership: the second segment of the object path IS the
 * owner uid. Storage objects are not documents; only the path provides
 * ownership context, which is why c5's helper centralizes path construction.
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
    projectId: 'nail-tech-assistant-rules-storage-references',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearStorage();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('storage rules — users/{uid}/references/', () => {
  it('allows the owner to WRITE under their own prefix', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(
      alice.storage(),
      `users/${ALICE_UID}/references/r1.jpg`
    );
    await assertSucceeds(uploadBytes(objectRef, STUB_BYTES));
  });

  it('allows the owner to READ from their own prefix', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const seed = ref(ctx.storage(), `users/${ALICE_UID}/references/r1.jpg`);
      await uploadBytes(seed, STUB_BYTES);
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(
      alice.storage(),
      `users/${ALICE_UID}/references/r1.jpg`
    );
    await assertSucceeds(getBytes(objectRef));
  });

  it('denies WRITE under a different user prefix (cross-user injection)', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(
      alice.storage(),
      `users/${BOB_UID}/references/r1.jpg`
    );
    await assertFails(uploadBytes(objectRef, STUB_BYTES));
  });

  it('denies READ under a different user prefix', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const seed = ref(ctx.storage(), `users/${ALICE_UID}/references/r1.jpg`);
      await uploadBytes(seed, STUB_BYTES);
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    const objectRef = ref(
      bob.storage(),
      `users/${ALICE_UID}/references/r1.jpg`
    );
    await assertFails(getBytes(objectRef));
  });

  it('denies READ by an unauthenticated client', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const seed = ref(ctx.storage(), `users/${ALICE_UID}/references/r1.jpg`);
      await uploadBytes(seed, STUB_BYTES);
    });
    const anon = testEnv.unauthenticatedContext();
    const objectRef = ref(
      anon.storage(),
      `users/${ALICE_UID}/references/r1.jpg`
    );
    await assertFails(getBytes(objectRef));
  });
});
