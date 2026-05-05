/**
 * e1-chat-turns-persistence — Firestore rules tests for the nested
 * `designs/{designId}/chat_turns/{turnId}` subcollection.
 *
 * Mirrors d2/d6/d7 precedent (`tests/rules/designs-shape-rule.test.ts`):
 * owner allow, cross-user deny, anonymous deny, update field-scope, plus a
 * default-deny fallback assertion that proves the nested rule does not
 * silently re-permit unknown paths.
 *
 * Storage shape (locked by e1; consumed by e3/e4 downstream):
 *   { userId, designId, message, status, generationId|null, createdAt, updatedAt }
 *
 * Update field-scope: only the lifecycle progression {status, generationId,
 * updatedAt} may change after creation. userId and designId are immutable
 * and message is frozen once persisted (the message is the user's input).
 */
import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

import { ALICE_UID, BOB_UID, setupRulesEnv } from './_setup';

let testEnv: RulesTestEnvironment;

const CHAT_TURN_PATH = 'designs/d1/chat_turns/t1';
const PARENT_DESIGN_PATH = 'designs/d1';

const aliceParentDesign = (overrides: Record<string, unknown> = {}) => ({
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

const aliceChatTurnData = (overrides: Record<string, unknown> = {}) => ({
  userId: ALICE_UID,
  designId: 'd1',
  message: 'make it more pastel',
  status: 'pending',
  generationId: null,
  createdAt: '2026-05-01T00:01:00Z',
  updatedAt: '2026-05-01T00:01:00Z',
  ...overrides,
});

beforeAll(async () => {
  testEnv = await setupRulesEnv({
    projectId: 'nail-tech-assistant-rules-e1-chat-turns',
  });
});

beforeEach(async () => {
  if (testEnv) await testEnv.clearFirestore();
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe('designs/{designId}/chat_turns/{turnId} — e1 ownership rules', () => {
  it('ALLOWS authenticated owner read of their chat turn', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(getDoc(doc(alice.firestore(), CHAT_TURN_PATH)));
  });

  it('DENIES authenticated non-owner read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(getDoc(doc(bob.firestore(), CHAT_TURN_PATH)));
  });

  it('DENIES unauthenticated read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), CHAT_TURN_PATH)));
  });

  it('ALLOWS authenticated owner create with full chat-turn shape', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      setDoc(doc(alice.firestore(), CHAT_TURN_PATH), aliceChatTurnData())
    );
  });

  it('DENIES create when request.resource.data.userId mismatches request.auth.uid', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      setDoc(
        doc(alice.firestore(), CHAT_TURN_PATH),
        aliceChatTurnData({ userId: BOB_UID })
      )
    );
  });

  it('DENIES create when request.resource.data.designId mismatches the parent path designId', async () => {
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      setDoc(
        doc(alice.firestore(), CHAT_TURN_PATH),
        aliceChatTurnData({ designId: 'd-other' })
      )
    );
  });

  it('DENIES anonymous create', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(anon.firestore(), CHAT_TURN_PATH), aliceChatTurnData())
    );
  });
});

describe('designs/{designId}/chat_turns/{turnId} — e1 update field-scope', () => {
  it('ALLOWS authenticated owner update with {status, generationId, updatedAt} (lifecycle progression)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(
      updateDoc(doc(alice.firestore(), CHAT_TURN_PATH), {
        status: 'success',
        generationId: 'g1',
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });

  it('DENIES update changing userId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), CHAT_TURN_PATH), {
        userId: BOB_UID,
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });

  it('DENIES update changing designId', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), CHAT_TURN_PATH), {
        designId: 'd-other',
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });

  it('DENIES update touching message (frozen after create)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), CHAT_TURN_PATH), {
        message: 'edited prompt',
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });

  it('DENIES update with arbitrary field outside lifecycle whitelist', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      updateDoc(doc(alice.firestore(), CHAT_TURN_PATH), {
        rogueField: 'pwned',
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });

  it('DENIES authenticated non-owner update', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(
      updateDoc(doc(bob.firestore(), CHAT_TURN_PATH), {
        status: 'success',
        updatedAt: '2026-05-01T00:02:00Z',
      })
    );
  });
});

describe('designs/{designId}/chat_turns/{turnId} — e1 delete + default-deny', () => {
  it('ALLOWS authenticated owner delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertSucceeds(deleteDoc(doc(alice.firestore(), CHAT_TURN_PATH)));
  });

  it('DENIES authenticated non-owner delete', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), CHAT_TURN_PATH), aliceChatTurnData());
    });
    const bob = testEnv.authenticatedContext(BOB_UID);
    await assertFails(deleteDoc(doc(bob.firestore(), CHAT_TURN_PATH)));
  });

  it('DENIES read on a sibling unknown subcollection (default-deny still catches unknown paths)', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(
        doc(ctx.firestore(), PARENT_DESIGN_PATH),
        aliceParentDesign()
      );
      await setDoc(doc(ctx.firestore(), 'designs/d1/unknown_sub/x1'), {
        userId: ALICE_UID,
      });
    });
    const alice = testEnv.authenticatedContext(ALICE_UID);
    await assertFails(
      getDoc(doc(alice.firestore(), 'designs/d1/unknown_sub/x1'))
    );
  });
});
