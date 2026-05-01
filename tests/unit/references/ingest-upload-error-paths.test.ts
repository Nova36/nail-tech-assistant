/**
 * c7-upload-ingest-route — ingestUpload error paths.
 *
 * Asserts:
 *   1. Storage helper failure → propagates `storage_failure`, no Firestore call.
 *   2. Firestore throw after Storage success → returns `firestore_failure`,
 *      logs the orphan line with code+message identifiers (mirrors c6).
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const FAKE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

const mockUploadReferenceBytes = vi.fn();
const mockFirestoreSet = vi.fn();

vi.mock('@/lib/firebase/storage', async () => {
  const actual = await vi.importActual<typeof import('@/lib/firebase/storage')>(
    '@/lib/firebase/storage'
  );
  return { ...actual, uploadReferenceBytes: mockUploadReferenceBytes };
});

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        withConverter: () => ({ set: mockFirestoreSet }),
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
  mockFirestoreSet.mockReset();
});

describe('ingestUpload — Storage helper failures', () => {
  it('propagates storage_failure and skips Firestore write', async () => {
    mockUploadReferenceBytes.mockResolvedValueOnce({
      ok: false,
      reason: 'storage_failure',
      message: 'emulator 5xx',
    });

    const result = await ingestUpload({
      userId: 'alice',
      bytes: FAKE_BYTES,
      contentType: 'image/jpeg',
      originalFilename: 'nail.jpg',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('storage_failure');
    expect(mockFirestoreSet).not.toHaveBeenCalled();
  });
});

describe('ingestUpload — Firestore write failures', () => {
  it('returns firestore_failure and logs identifiers when Firestore throws', async () => {
    mockUploadReferenceBytes.mockResolvedValueOnce({
      ok: true,
      storagePath: 'users/alice/references/r1.jpg',
    });
    const error = new Error('grpc unavailable');
    (error as { code?: string }).code = 'unavailable';
    mockFirestoreSet.mockRejectedValueOnce(error);

    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const result = await ingestUpload({
      userId: 'alice',
      bytes: FAKE_BYTES,
      contentType: 'image/jpeg',
      originalFilename: 'nail.jpg',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      consoleSpy.mockRestore();
      return;
    }
    expect(result.reason).toBe('firestore_failure');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ingest] firestore write failed after storage write succeeded',
      expect.objectContaining({
        uid: 'alice',
        storagePath: 'users/alice/references/r1.jpg',
        code: 'unavailable',
        message: 'grpc unavailable',
      })
    );
    consoleSpy.mockRestore();
  });
});
