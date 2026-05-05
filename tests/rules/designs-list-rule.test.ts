/**
 * d9 TDD — Firestore rules tests for the /designs owner-scoped list query.
 *
 * Mirrors the harness shape of tests/rules/designs-shape-rule.test.ts.
 *
 * Note for integrator: equivalent list-query coverage already exists in
 * tests/rules/designs-detail-rule.test.ts:150-184 ("d6/d9 — /designs list
 * query rules" describe block). This file is authored per d9 spec; if
 * confirmed duplicate at integrate time, prefer deleting one or the other.
 *
 * Owner field is `userId` (NOT ownerUid) — per security audit hard blocker.
 *
 * Covers:
 *  - Authenticated owner list `where userId == self.uid` → ALLOWED
 *  - Authenticated user list `where userId == otherUid` → DENIED
 *  - Unauthenticated list → DENIED
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

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-d9-list',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('designs collection — d9 owner-scoped list query rules', () => {
  it('ALLOWS authenticated owner list `where userId == self.uid`', async () => {
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

  it('DENIES authenticated user list `where userId == otherUid`', async () => {
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

  it('DENIES unauthenticated list', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'designs', 'd1'), aliceDesignData());
    });
    const anon = testEnv.unauthenticatedContext();
    const q = query(
      collection(anon.firestore(), 'designs'),
      where('userId', '==', ALICE_UID)
    );
    await assertFails(getDocs(q));
  });
});
