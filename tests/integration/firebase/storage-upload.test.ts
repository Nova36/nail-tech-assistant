/**
 * c5-server-storage-helper — emulator-backed upload tests.
 *
 * Runs in the rules-lane (vitest.config.rules.ts) so the storage emulator
 * is available via `firebase emulators:exec`. Exercises the real
 * firebase-admin Storage SDK against the local emulator — no SDK mocks.
 *
 * Note: these tests do NOT use @firebase/rules-unit-testing. They use the
 * Admin SDK directly (the production code path), with the emulator wiring
 * provided by `FIREBASE_STORAGE_EMULATOR_HOST` env var.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let uploadReferenceBytes: typeof import('@/lib/firebase/storage').uploadReferenceBytes;
let uploadGenerationBytes: typeof import('@/lib/firebase/storage').uploadGenerationBytes;
let getServerFirebaseStorage: typeof import('@/lib/firebase/storage').getServerFirebaseStorage;

const ALICE_UID = 'alice-uid';
const STUB_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // JPEG header

beforeAll(async () => {
  if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new Error(
      'FIREBASE_STORAGE_EMULATOR_HOST is not set. Run via `pnpm test:rules`.'
    );
  }
  // Stub minimum env so lib/env validates. Hydration is inlined in storage.ts;
  // we only need NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET + the FIREBASE_PROJECT_ID
  // for the Admin SDK init in emulator mode.
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
    '-----BEGIN RSA PRIVATE KEY-----\\nfake\\n-----END RSA PRIVATE KEY-----';
  process.env.ALLOWED_EMAIL ??= 'allowed@example.com';
  process.env.APP_URL ??= 'http://localhost:3100';
  process.env.PINTEREST_ACCESS_TOKEN ??= 'ptest_token_abc123';

  const mod = await import('@/lib/firebase/storage');
  uploadReferenceBytes = mod.uploadReferenceBytes;
  uploadGenerationBytes = mod.uploadGenerationBytes;
  getServerFirebaseStorage = mod.getServerFirebaseStorage;
});

afterAll(async () => {
  // No global teardown — emulator process is owned by `firebase emulators:exec`.
});

describe('uploadReferenceBytes (emulator)', () => {
  it('uploads bytes and returns the canonical storage path', async () => {
    const result = await uploadReferenceBytes({
      uid: ALICE_UID,
      refId: 'r-upload-1',
      bytes: STUB_BYTES,
      contentType: 'image/jpeg',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toBe(
      `users/${ALICE_UID}/references/r-upload-1.jpg`
    );

    // Round-trip: bytes are readable from the bucket at the returned path.
    const bucket = getServerFirebaseStorage();
    const [downloaded] = await bucket.file(result.storagePath).download();
    expect(downloaded.length).toBe(STUB_BYTES.length);
  });

  it('returns a discriminated failure when contentType is unsupported', async () => {
    await expect(
      uploadReferenceBytes({
        uid: ALICE_UID,
        refId: 'r-bad-mime',
        bytes: STUB_BYTES,
        contentType: 'image/svg+xml',
      })
    ).rejects.toThrow(/unsupported contentType/);
  });
});

describe('uploadGenerationBytes (emulator)', () => {
  it('uploads bytes to the generations path family', async () => {
    const result = await uploadGenerationBytes({
      uid: ALICE_UID,
      genId: 'g-upload-1',
      bytes: STUB_BYTES,
      contentType: 'image/png',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toBe(
      `users/${ALICE_UID}/generations/g-upload-1.png`
    );
  });
});

describe('getServerFirebaseStorage cache', () => {
  it('returns the same Bucket instance across calls (Symbol.for cache)', () => {
    const a = getServerFirebaseStorage();
    const b = getServerFirebaseStorage();
    expect(a).toBe(b);
  });
});
