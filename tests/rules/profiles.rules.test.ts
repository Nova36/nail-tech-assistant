/**
 * Firestore security rules tests for the `profiles` collection.
 *
 * Runs against the Firestore emulator via `pnpm test:rules`, which wraps the
 * Vitest invocation in `firebase emulators:exec`. The emulator owns lifecycle;
 * `@firebase/rules-unit-testing` only connects, loads rules, and provides
 * scoped SDK instances.
 *
 * TDD red phase: `firestore.rules` does not exist yet. `beforeAll` will throw
 * ENOENT when it tries to read the file, which is the intended failure mode.
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const PROJECT_ID = 'nail-tech-assistant-rules-test';
const ALICE_UID = 'alice-uid';
const BOB_UID = 'bob-uid';
const EMULATOR_HOST_ENV = 'FIRESTORE_EMULATOR_HOST';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Sanity guard: fail loud if the emulator host is not advertised. The
  // `firebase emulators:exec` wrapper sets this env var for the child process.
  const emulatorHost = process.env[EMULATOR_HOST_ENV];
  if (!emulatorHost) {
    throw new Error(
      `${EMULATOR_HOST_ENV} is not set. Run rules tests via \`pnpm test:rules\` ` +
        `so the Firestore emulator is started by firebase-tools.`
    );
  }

  const [host, portStr] = emulatorHost.split(':');
  const port = Number.parseInt(portStr ?? '8080', 10);

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host,
      port,
    },
  });
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('profiles collection security rules', () => {
  it('allows an authenticated user to READ their own profile', async () => {
    // Seed /profiles/alice with rules disabled so the read has something to find.
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', ALICE_UID), {
        displayName: 'Alice',
      });
    });

    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'profiles', ALICE_UID);
    await assertSucceeds(getDoc(ref));
  });

  it('allows an authenticated user to WRITE their own profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'profiles', ALICE_UID);
    await assertSucceeds(setDoc(ref, { displayName: 'Alice' }));
  });

  it('prevents an authenticated user from READING another user profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', BOB_UID), {
        displayName: 'Bob',
      });
    });

    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'profiles', BOB_UID);
    await assertFails(getDoc(ref));
  });

  it('prevents an authenticated user from WRITING another user profile', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'profiles', BOB_UID);
    await assertFails(setDoc(ref, { displayName: 'Alice-as-Bob' }));
  });

  it('prevents an unauthenticated client from READING any profile', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', ALICE_UID), {
        displayName: 'Alice',
      });
    });

    const anon = testEnv.unauthenticatedContext();
    const ref = doc(anon.firestore(), 'profiles', ALICE_UID);
    await assertFails(getDoc(ref));
  });

  it('prevents an unauthenticated client from WRITING any profile', async () => {
    const anon = testEnv.unauthenticatedContext();
    const ref = doc(anon.firestore(), 'profiles', ALICE_UID);
    await assertFails(setDoc(ref, { displayName: 'anon-tampered' }));
  });
});

describe('default-deny baseline', () => {
  it('prevents an authenticated user from writing outside /profiles (designs/* probe)', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const ref = doc(alice.firestore(), 'designs', 'any-id');
    await assertFails(setDoc(ref, { title: 'should-be-denied' }));
  });
});

// Satisfy TypeScript when the file is imported for typechecking without an
// actual emulator; `expect` is re-exported so Vitest's globals resolve cleanly.
void expect;
