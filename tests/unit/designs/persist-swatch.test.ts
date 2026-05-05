// @vitest-environment node
/**
 * d10 — persistGenerationResult swatch-extraction hook (TDD-red).
 * Asserts:
 *   - On success transaction, an extra generation-doc update sets
 *     nailSwatchStoragePath when extractNailSwatch resolves { ok: true }.
 *   - When extractNailSwatch resolves { ok: false }, the field is left null
 *     and persistGenerationResult still returns { ok: true }.
 *   - When extractNailSwatch throws, persistGenerationResult still returns
 *     { ok: true } and the failure is logged.
 *   - Failure of the extraction step never propagates as a rejected promise.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerationUpdate = vi.fn();
const mockTxnUpdate = vi.fn();
const mockRunTransaction = vi.fn();
const mockUploadGenerationBytes = vi.fn();
const mockExtractNailSwatch = vi.fn();

const collectionMock = vi.fn(() => ({
  doc: () => ({
    withConverter: () => ({ update: mockGenerationUpdate }),
  }),
}));

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: collectionMock,
    runTransaction: mockRunTransaction,
  }),
}));

vi.mock('@/lib/firebase/storage', () => ({
  uploadGenerationBytes: mockUploadGenerationBytes,
  generationPath: (uid: string, genId: string, ext: string) =>
    `users/${uid}/generations/${genId}.${ext}`,
}));

vi.mock('@/lib/ai/extract-swatch', () => ({
  extractNailSwatch: mockExtractNailSwatch,
}));

let persistGenerationResult: typeof import('@/lib/designs/lifecycle').persistGenerationResult;

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
    '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----'
  );
  vi.stubEnv('ALLOWED_EMAIL', 'allowed@example.com');
  vi.stubEnv('APP_URL', 'https://nail-tech.example.com');
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');

  const mod = await import('@/lib/designs/lifecycle');
  persistGenerationResult = mod.persistGenerationResult;
});

beforeEach(() => {
  mockGenerationUpdate.mockReset().mockResolvedValue({});
  mockUploadGenerationBytes.mockReset();
  mockTxnUpdate.mockReset();
  mockExtractNailSwatch.mockReset();
  mockRunTransaction
    .mockReset()
    .mockImplementation(
      async (cb: (txn: { update: typeof mockTxnUpdate }) => Promise<void>) => {
        await cb({ update: mockTxnUpdate });
      }
    );
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const SUCCESS_INPUT = {
  generationId: 'g1',
  userId: 'alice-uid',
  designId: 'd1',
  outcome: {
    ok: true as const,
    imageBytes: PNG,
    mimeType: 'image/png' as const,
    metadata: { retryCount: 0, durationMs: 1000 },
  },
};

const SUCCESSFUL_UPLOAD = {
  ok: true as const,
  storagePath: 'users/alice-uid/generations/g1.png',
};

// Skipped: swatch extraction is temporarily disabled in lib/designs/lifecycle.ts
// after pivoting to gemini-3-pro-image-preview which generates the full
// five-nail composition directly. Re-enable when the solid-color flow returns
// behind a designKind: 'solid' flag.
describe.skip('persistGenerationResult — swatch extraction hook', () => {
  it('writes nailSwatchStoragePath to the generation doc when extractNailSwatch returns { ok: true }', async () => {
    mockUploadGenerationBytes.mockResolvedValue(SUCCESSFUL_UPLOAD);
    mockExtractNailSwatch.mockResolvedValue({
      ok: true,
      storagePath: 'designs/d1/swatch.png',
    });

    const out = await persistGenerationResult(SUCCESS_INPUT);

    expect(out.ok).toBe(true);
    expect(mockExtractNailSwatch).toHaveBeenCalledOnce();
    // Post-transaction follow-up update on the generation doc carries the
    // swatch path. The base happy path does NOT call generationRef.update()
    // (success goes through runTransaction), so a single non-txn update on
    // the doc is the swatch write.
    const swatchUpdate = mockGenerationUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[0], 'nailSwatchStoragePath')
    );
    expect(swatchUpdate).toBeDefined();
    expect(swatchUpdate![0].nailSwatchStoragePath).toBe(
      'designs/d1/swatch.png'
    );
  });

  it('leaves nailSwatchStoragePath unwritten when extractNailSwatch returns { ok: false }; result still { ok: true }', async () => {
    mockUploadGenerationBytes.mockResolvedValue(SUCCESSFUL_UPLOAD);
    mockExtractNailSwatch.mockResolvedValue({ ok: false });

    const out = await persistGenerationResult(SUCCESS_INPUT);

    expect(out.ok).toBe(true);
    const swatchUpdate = mockGenerationUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[0], 'nailSwatchStoragePath')
    );
    expect(swatchUpdate).toBeUndefined();
  });

  it('swallows + logs when extractNailSwatch throws; persistGenerationResult still returns { ok: true }', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadGenerationBytes.mockResolvedValue(SUCCESSFUL_UPLOAD);
    mockExtractNailSwatch.mockRejectedValue(new Error('boom'));

    const out = await persistGenerationResult(SUCCESS_INPUT);

    expect(out.ok).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    const swatchUpdate = mockGenerationUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[0], 'nailSwatchStoragePath')
    );
    expect(swatchUpdate).toBeUndefined();
    errorSpy.mockRestore();
  });
});
