/**
 * c7-upload-ingest-route — ingestUpload happy-path unit test.
 *
 * Mocks: @/lib/firebase/server + firebase-admin/firestore + @/lib/firebase/storage.
 *
 * Asserts the returned Reference matches the c3-locked shape exactly:
 *   source: 'upload', pinterestPinId: null, sourceUrl: null,
 *   storagePath: 'users/<uid>/references/<refId>.<ext>', userId, id, createdAt.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // JPEG header

const mockUploadReferenceBytes = vi.fn();
const mockFirestoreSet = vi.fn().mockResolvedValue({});

vi.mock('@/lib/firebase/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/storage')>(
    '@/lib/firebase/storage'
  );
  return {
    ...actual,
    uploadReferenceBytes: mockUploadReferenceBytes,
  };
});

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        withConverter: () => ({
          set: mockFirestoreSet,
        }),
      }),
    }),
  }),
}));

let ingestUpload: typeof import('@/lib/references/ingest').ingestUpload;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_API_KEY', 'test-api-key');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '123456789');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_APP_ID', '1:123456789:web:abc123');
  vi.stubEnv('FIREBASE_PROJECT_ID', 'test-project');
  vi.stubEnv(
    'FIREBASE_CLIENT_EMAIL',
    'sa@test-project.iam.gserviceaccount.com'
  );
  vi.stubEnv(
    'FIREBASE_PRIVATE_KEY',
    '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');
  // ingest.ts imports @/lib/pinterest/client which validates this env at
  // module load — stub even though ingestUpload itself never calls Pinterest.
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'ptest_unused_for_upload_tests');

  const mod = await import('@/lib/references/ingest');
  ingestUpload = mod.ingestUpload;
});

beforeEach(() => {
  mockUploadReferenceBytes.mockReset();
  mockFirestoreSet.mockReset().mockResolvedValue({});
});

describe('ingestUpload — happy path', () => {
  it('returns a Reference with the c3-locked shape on success', async () => {
    mockUploadReferenceBytes.mockImplementation(async ({ uid, refId }) => ({
      ok: true,
      storagePath: `users/${uid}/references/${refId}.jpg`,
    }));

    const result = await ingestUpload({
      userId: 'alice',
      bytes: FAKE_BYTES,
      contentType: 'image/jpeg',
      originalFilename: 'nail.jpg',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ref = result.reference;
    expect(ref.source).toBe('upload');
    expect(ref.pinterestPinId).toBeNull();
    expect(ref.sourceUrl).toBeNull();
    expect(ref.userId).toBe('alice');
    expect(ref.storagePath).toMatch(
      /^users\/alice\/references\/[a-f0-9-]+\.jpg$/
    );
    expect(ref.id).toBeTruthy();
    expect(ref.id).toBe(ref.storagePath.split('/').pop()?.replace('.jpg', ''));
    expect(ref.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // Two-write order: storage called once, firestore called once.
    expect(mockUploadReferenceBytes).toHaveBeenCalledTimes(1);
    expect(mockFirestoreSet).toHaveBeenCalledTimes(1);

    // The c5 helper was invoked with bytes + content type, NOT a wrapped Buffer object identity check.
    const callArg = mockUploadReferenceBytes.mock.calls[0]?.[0];
    expect(callArg.uid).toBe('alice');
    expect(callArg.contentType).toBe('image/jpeg');
    expect(callArg.refId).toBe(ref.id);
  });

  it('threads HEIC content type through to the c5 helper', async () => {
    mockUploadReferenceBytes.mockImplementation(async ({ uid, refId }) => ({
      ok: true,
      storagePath: `users/${uid}/references/${refId}.heic`,
    }));

    const result = await ingestUpload({
      userId: 'alice',
      bytes: FAKE_BYTES,
      contentType: 'image/heic',
      originalFilename: 'phone.heic',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reference.storagePath).toMatch(/\.heic$/);
    const callArg = mockUploadReferenceBytes.mock.calls[0]?.[0];
    expect(callArg.contentType).toBe('image/heic');
  });
});
