/**
 * c7-upload-ingest-route — emulator-backed ingestUpload integration test.
 *
 * Real Firestore + Storage emulators (booted by `firebase emulators:exec` via
 * test:rules). No Pinterest API mocking needed — uploads bypass Pinterest.
 *
 * Asserts the end-to-end durability promise: after success, the Firestore
 * doc exists and the bytes are readable from Storage at the recorded path.
 *
 * Concurrency: two different userIds in parallel → two distinct refs, no
 * cross-user contamination.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const ALICE_UID = 'alice-upload-uid';
const BOB_UID = 'bob-upload-uid';

let ingestUpload: typeof import('@/lib/references/ingest').ingestUpload;
let getServerFirebaseStorage: typeof import('@/lib/firebase/storage').getServerFirebaseStorage;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;

beforeAll(async () => {
  if (
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_STORAGE_EMULATOR_HOST
  ) {
    throw new Error(
      'Run via `pnpm test:rules` so Firestore + Storage emulators are booted.'
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
  // ingest.ts imports @/lib/pinterest/client which validates this env at
  // module load — stub even though ingestUpload itself never calls Pinterest.
  process.env.PINTEREST_ACCESS_TOKEN ??= 'ptest_unused_for_upload_tests';

  const ingestMod = await import('@/lib/references/ingest');
  ingestUpload = ingestMod.ingestUpload;
  const storageMod = await import('@/lib/firebase/storage');
  getServerFirebaseStorage = storageMod.getServerFirebaseStorage;
  const serverMod = await import('@/lib/firebase/server');
  createServerFirebaseAdmin = serverMod.createServerFirebaseAdmin;
  const firestoreMod = await import('firebase-admin/firestore');
  getFirestoreFn = firestoreMod.getFirestore;
});

afterAll(() => {
  // Emulator teardown is owned by `firebase emulators:exec`.
});

describe('ingestUpload — emulator end-to-end', () => {
  it('writes bytes to Storage and a Reference doc to Firestore', async () => {
    const result = await ingestUpload({
      userId: ALICE_UID,
      bytes: FAKE_BYTES,
      contentType: 'image/jpeg',
      originalFilename: 'nail.jpg',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ref = result.reference;

    // Storage byte round-trip
    const bucket = getServerFirebaseStorage();
    const [downloaded] = await bucket.file(ref.storagePath).download();
    expect(downloaded.length).toBe(FAKE_BYTES.length);

    // Firestore round-trip
    const db = getFirestoreFn(createServerFirebaseAdmin());
    const snap = await db.collection('references').doc(ref.id).get();
    expect(snap.exists).toBe(true);
    const data = snap.data();
    expect(data?.userId).toBe(ALICE_UID);
    expect(data?.source).toBe('upload');
    expect(data?.pinterestPinId).toBeNull();
    expect(data?.sourceUrl).toBeNull();
    expect(data?.storagePath).toBe(ref.storagePath);
  });

  it('isolates concurrent uploads from different users — two distinct refs, no cross-contamination', async () => {
    const [aliceResult, bobResult] = await Promise.all([
      ingestUpload({
        userId: ALICE_UID,
        bytes: FAKE_BYTES,
        contentType: 'image/png',
        originalFilename: 'a.png',
      }),
      ingestUpload({
        userId: BOB_UID,
        bytes: FAKE_BYTES,
        contentType: 'image/png',
        originalFilename: 'b.png',
      }),
    ]);

    expect(aliceResult.ok).toBe(true);
    expect(bobResult.ok).toBe(true);
    if (!aliceResult.ok || !bobResult.ok) return;

    expect(aliceResult.reference.id).not.toBe(bobResult.reference.id);
    expect(aliceResult.reference.userId).toBe(ALICE_UID);
    expect(bobResult.reference.userId).toBe(BOB_UID);
    expect(aliceResult.reference.storagePath).toMatch(
      new RegExp(`^users/${ALICE_UID}/references/`)
    );
    expect(bobResult.reference.storagePath).toMatch(
      new RegExp(`^users/${BOB_UID}/references/`)
    );
  });
});
