/**
 * c4-firestore-storage-rules — default-deny baseline for undeclared paths.
 *
 * Probes catchall behavior on collections / paths not named in
 * firestore.rules or storage.rules. Even an authenticated user with a
 * properly-shaped userId field gets denied — the rule never matches.
 */
import {
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-default-deny',
  });
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
    await testEnv.clearStorage();
  }
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('default-deny baseline (Firestore)', () => {
  it('denies write to an undeclared collection (chat_turns/*)', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      setDoc(doc(alice.firestore(), 'chat_turns', 'c1'), {
        userId: ALICE_UID,
        body: 'should be denied',
      })
    );
  });

  it('denies write to a wholly random collection', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      setDoc(doc(alice.firestore(), 'random_collection', 'x'), {
        userId: ALICE_UID,
      })
    );
  });
});

describe('default-deny baseline (Storage)', () => {
  it('denies write outside the users/{uid}/ path family', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(alice.storage(), 'public/x.jpg');
    await assertFails(uploadBytes(objectRef, new Uint8Array([0x00])));
  });

  it('denies write under users/ but missing the uid segment', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const objectRef = ref(alice.storage(), 'users/orphan.jpg');
    await assertFails(uploadBytes(objectRef, new Uint8Array([0x00])));
  });
});
