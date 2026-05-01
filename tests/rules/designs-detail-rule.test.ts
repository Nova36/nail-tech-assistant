/**
 * d6 TDD — Firestore security rules for DesignDetail read surface.
 *
 * Covers: /designs/{id} read (owner allow, cross-user deny, unauth deny),
 * /references/{id} read (owner allow, cross-user deny), /generations/{id}
 * read (owner allow), and owner-list query coverage.
 *
 * Per feedback_storage_emulator_parallel_race.md: fileParallelism: false
 * is set in vitest.config.rules.ts.
 *
 * Per audit-report.md F: /references/{refId} rule checks reference.userId ==
 * request.auth.uid (the reference's OWN userId field, set at ingest).
 * NOT a cross-doc parent-design lookup.
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, BOB_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

const now = '2026-05-01T00:00:00Z';

const aliceDesignData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  name: null,
  primaryReferenceId: 'ref-1',
  secondaryReferenceIds: [],
  promptText: null,
  nailShape: 'almond',
  latestGenerationId: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

const aliceRefData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  source: 'upload',
  sourceUrl: null,
  storagePath: `users/${ALICE_UID}/references/r1.jpg`,
  pinterestPinId: null,
  createdAt: now,
  ...overrides,
});

const aliceGenData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  designId: 'd1',
  requestJson: {},
  resultStoragePath: null,
  providerResponseMetadata: null,
  status: 'success',
  errorCode: null,
  errorMessage: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-designs-detail',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('d6 — /designs/{id} read rules', () => {
  it('authenticated owner can read their own design', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(getDoc(doc(alice.firestore(), 'designs', 'd1')));
  });

  it('cross-user cannot read another user design', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), 'designs', 'd1')));
  });

  it('unauthenticated cannot read any design', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), 'designs', 'd1')));
  });
});

describe('d6 — /references/{id} read rules', () => {
  it('authenticated owner can read a reference with matching userId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(getDoc(doc(alice.firestore(), 'references', 'r1')));
  });

  it('cross-user cannot read a reference whose userId !== auth uid', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'references', 'r1'), aliceRefData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), 'references', 'r1')));
  });
});

describe('d6 — /generations/{id} read rules', () => {
  it('authenticated owner can read their own generation', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(getDoc(doc(alice.firestore(), 'generations', 'g1')));
  });

  it('cross-user cannot read another user generation', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'generations', 'g1'), aliceGenData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), 'generations', 'g1')));
  });
});

describe('d6/d9 — /designs list query rules', () => {
  it('owner can list designs filtered by userId == auth.uid', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
      await setDoc(doc(ctx.firestore(), 'designs', 'd2'), aliceDesignData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    const q = query(
      collection(alice.firestore(), 'designs'),
      where('userId', '==', ALICE_UID)
    );
    await assertSucceeds(getDocs(q));
  });

  it('cross-user list filtered by alice userId is denied', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    const q = query(
      collection(bob.firestore(), 'designs'),
      where('userId', '==', ALICE_UID)
    );
    await assertFails(getDocs(q));
  });

  it('unauthenticated list is denied', async () => {
    const anon = testEnv.unauthenticatedContext();
    const q = query(
      collection(anon.firestore(), 'designs'),
      where('userId', '==', ALICE_UID)
    );
    await assertFails(getDocs(q));
  });
});
