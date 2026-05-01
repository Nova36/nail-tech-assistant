/**
 * c6-pinterest-ingest — emulator-backed integration test.
 *
 * Real Firestore + Storage emulators (booted by `firebase emulators:exec`
 * via test:rules). Pinterest API + image bytes are still mocked via MSW
 * because the real Pinterest API requires the production token and would
 * make tests dependent on Pinterest service availability.
 *
 * Asserts the end-to-end durability promise: after success, the Firestore
 * doc exists and the bytes are readable from Storage at the recorded path.
 */
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const STUB_TOKEN = 'ptest_token_abc123';
const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PIN_URL = 'https://i.pinimg.com/1200x/aa.jpg';
const ALICE_UID = 'alice-uid';

let ingestPinterestPin: typeof import('@/lib/references/ingest').ingestPinterestPin;
let getServerFirebaseStorage: typeof import('@/lib/firebase/storage').getServerFirebaseStorage;
let createServerFirebaseAdmin: typeof import('@/lib/firebase/server').createServerFirebaseAdmin;
let getFirestoreFn: typeof import('firebase-admin/firestore').getFirestore;

// Local MSW server — the rules-lane's vitest setup does not (yet) include
// the global MSW server from tests/setup/integration.ts because rules tests
// run in node environment and the rules suite has its own setup model.
// Spin up a dedicated MSW node server for this file.
const localMsw = setupServer();

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
  process.env.PINTEREST_ACCESS_TOKEN ??= STUB_TOKEN;

  localMsw.listen({ onUnhandledRequest: 'bypass' });

  const ingestMod = await import('@/lib/references/ingest');
  ingestPinterestPin = ingestMod.ingestPinterestPin;
  const storageMod = await import('@/lib/firebase/storage');
  getServerFirebaseStorage = storageMod.getServerFirebaseStorage;
  const serverMod = await import('@/lib/firebase/server');
  createServerFirebaseAdmin = serverMod.createServerFirebaseAdmin;
  const firestoreMod = await import('firebase-admin/firestore');
  getFirestoreFn = firestoreMod.getFirestore;
});

beforeEach(() => {
  localMsw.resetHandlers();
});

afterAll(() => {
  localMsw.close();
});

describe('ingestPinterestPin — emulator end-to-end', () => {
  it('writes bytes to Storage and a Reference doc to Firestore', async () => {
    localMsw.use(
      http.get('https://api.pinterest.com/v5/pins/p-int-1', () =>
        HttpResponse.json({
          id: 'p-int-1',
          link: 'https://www.pinterest.com/pin/p-int-1/',
          media: {
            media_type: 'image',
            images: { '1200x': { url: PIN_URL } },
          },
        })
      ),
      http.get(PIN_URL, () =>
        HttpResponse.arrayBuffer(FAKE_BYTES.buffer, {
          headers: { 'Content-Type': 'image/jpeg' },
        })
      )
    );

    const result = await ingestPinterestPin({
      userId: ALICE_UID,
      pinId: 'p-int-1',
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
    expect(data?.source).toBe('pinterest');
    expect(data?.pinterestPinId).toBe('p-int-1');
    expect(data?.storagePath).toBe(ref.storagePath);
  });
});
