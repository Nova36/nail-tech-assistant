/**
 * c10-create-design-action — emulator-backed createDesignDraft integration test.
 *
 * Real Firestore emulator (booted by `firebase emulators:exec` via test:rules).
 * Asserts the durable Design write round-trips through designConverter and
 * that concurrent same-user creates produce distinct designIds.
 *
 * Note on rules: the lifecycle uses firebase-admin which BYPASSES rules in the
 * emulator. The rules-denied path is unit-tested via mocked Firestore in
 * tests/unit/designs/lifecycle-error-paths.test.ts. Cross-collection rule
 * coverage lives in tests/rules/designs.rules.test.ts (c4).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ALICE_UID = 'alice-design-uid';

let createDesignDraft: typeof import('@/lib/designs/lifecycle').createDesignDraft;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;
let designConverter: typeof import('@/lib/firestore/converters').designConverter;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'Run via `pnpm test:rules` so Firestore emulator is booted.'
    );
  }
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??= 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??= 'test.firebaseapp.com';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= 'nail-tech-assistant';
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??=
    'nail-tech-assistant.appspot.com';
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??= '123456789';
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??= '1:123456789:web:abc123';
  process.env.FIREBASE_PROJECT_ID ??= 'nail-tech-assistant';
  process.env.FIREBASE_CLIENT_EMAIL ??=
    'sa@nail-tech-assistant.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY ??=
    '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  process.env.ALLOWED_EMAIL ??= 'allowed@example.com';
  process.env.APP_URL ??= 'http://localhost:3100';

  const lifecycleMod = await import('@/lib/designs/lifecycle');
  createDesignDraft = lifecycleMod.createDesignDraft;
  const serverMod = await import('@/lib/firebase/server');
  createServerFirebaseAdmin = serverMod.createServerFirebaseAdmin;
  const firestoreMod = await import('firebase-admin/firestore');
  getFirestoreFn = firestoreMod.getFirestore;
  const convertersMod = await import('@/lib/firestore/converters');
  designConverter = convertersMod.designConverter;
});

afterAll(() => {
  // emulator teardown owned by firebase emulators:exec
});

describe('createDesignDraft — emulator end-to-end', () => {
  it('writes a c3-shaped Design doc that round-trips via designConverter', async () => {
    const out = await createDesignDraft({
      userId: ALICE_UID,
      primaryReferenceId: 'ref-primary-1',
      secondaryReferenceIds: ['ref-secondary-2', 'ref-secondary-3'],
      promptText: 'matte rose gold',
      nailShape: 'almond',
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const designId = out.designId;
    expect(out.status).toBe('draft_created');

    const db = getFirestoreFn(createServerFirebaseAdmin());
    const snap = await db
      .collection('designs')
      .doc(designId)
      .withConverter(designConverter)
      .get();
    expect(snap.exists).toBe(true);
    const data = snap.data();
    expect(data).toMatchObject({
      id: designId,
      userId: ALICE_UID,
      name: null,
      primaryReferenceId: 'ref-primary-1',
      secondaryReferenceIds: ['ref-secondary-2', 'ref-secondary-3'],
      promptText: 'matte rose gold',
      nailShape: 'almond',
      latestGenerationId: null,
    });
    expect(typeof data!.createdAt).toBe('string');
    expect(typeof data!.updatedAt).toBe('string');
    expect(data!.createdAt).toBe(data!.updatedAt);
  });

  it('concurrent identical creates from same user produce distinct designIds', async () => {
    const input = {
      userId: ALICE_UID,
      primaryReferenceId: 'ref-primary-X',
      secondaryReferenceIds: [] as string[],
      promptText: null,
      nailShape: 'oval',
    };
    const [a, b] = await Promise.all([
      createDesignDraft(input),
      createDesignDraft(input),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.designId).not.toBe(b.designId);
  });
});
