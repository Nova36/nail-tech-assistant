/**
 * c15 — persistGenerationResult unit tests (mocked Firestore + Storage).
 * Covers: provider success → Storage + transactional update; provider failure
 * → row update only; storage_fail-after-success → terminal failure (FR-C-9
 * anti-zombie); reason → errorCode mapping.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerationUpdate = vi.fn();
const mockTxnUpdate = vi.fn();
const mockRunTransaction = vi.fn();
const mockUploadGenerationBytes = vi.fn();

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
  mockRunTransaction
    .mockReset()
    .mockImplementation(
      async (cb: (txn: { update: typeof mockTxnUpdate }) => Promise<void>) => {
        await cb({ update: mockTxnUpdate });
      }
    );
});

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('persistGenerationResult — provider success', () => {
  it('uploads bytes + transactional update both docs on success', async () => {
    mockUploadGenerationBytes.mockResolvedValue({
      ok: true,
      storagePath: 'users/alice-uid/generations/g1.png',
    });

    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: { retryCount: 0, durationMs: 1000 },
      },
    });

    expect(out.ok).toBe(true);
    expect(mockUploadGenerationBytes).toHaveBeenCalledOnce();
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    expect(mockTxnUpdate).toHaveBeenCalledTimes(2);
    const generationUpdate = mockTxnUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[1], 'status')
    );
    expect(generationUpdate![1]).toMatchObject({
      status: 'success',
      resultStoragePath: 'users/alice-uid/generations/g1.png',
      errorCode: null,
      errorMessage: null,
    });
    const designUpdate = mockTxnUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[1], 'latestGenerationId')
    );
    expect(designUpdate![1]).toMatchObject({
      latestGenerationId: 'g1',
    });
  });

  it('storage upload fails after provider success → terminal failure (FR-C-9)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadGenerationBytes.mockResolvedValue({
      ok: false,
      reason: 'storage_failure',
      message: 'bucket unavailable',
    });

    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: { retryCount: 0, durationMs: 1000 },
      },
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('storage_fail');
    // Rescue update — generation row → failure (NEVER pending)
    expect(mockGenerationUpdate).toHaveBeenCalledOnce();
    const rescue = mockGenerationUpdate.mock.calls[0][0];
    expect(rescue.status).toBe('failure');
    expect(rescue.errorMessage).toContain('storage_fail');
    // No transactional update of design
    expect(mockRunTransaction).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('firestore txn fails after storage write succeeded → firestore_failure + tagged log', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUploadGenerationBytes.mockResolvedValue({
      ok: true,
      storagePath: 'users/alice-uid/generations/g1.png',
    });
    mockRunTransaction.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { code: 'aborted' })
    );

    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: { retryCount: 0, durationMs: 1000 },
      },
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('firestore_failure');
    const log = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes(
        '[lifecycle] firestore transaction failed after storage write succeeded'
      )
    );
    expect(log).toBeDefined();
    errorSpy.mockRestore();
  });
});

describe('persistGenerationResult — provider failure', () => {
  it('refusal → row update with errorCode "refusal"; no Storage; no design update', async () => {
    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: false,
        reason: 'refusal',
        message: 'blocked',
        metadata: { retryCount: 0, durationMs: 100 },
      },
    });

    expect(out.ok).toBe(true);
    expect(mockUploadGenerationBytes).not.toHaveBeenCalled();
    expect(mockRunTransaction).not.toHaveBeenCalled();
    expect(mockGenerationUpdate).toHaveBeenCalledOnce();
    const update = mockGenerationUpdate.mock.calls[0][0];
    expect(update).toMatchObject({
      status: 'failure',
      errorCode: 'refusal',
      errorMessage: 'blocked',
    });
  });

  it('rate_limit → errorCode "rate_limit"', async () => {
    await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: false,
        reason: 'rate_limit',
        message: 'limit',
        metadata: { retryCount: 1, durationMs: 1500 },
      },
    });
    expect(mockGenerationUpdate.mock.calls[0][0].errorCode).toBe('rate_limit');
  });

  it('network → errorCode "network"', async () => {
    await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      outcome: {
        ok: false,
        reason: 'network',
        message: 'down',
        metadata: { retryCount: 1, durationMs: 1500 },
      },
    });
    expect(mockGenerationUpdate.mock.calls[0][0].errorCode).toBe('network');
  });

  it('unknown / low_quality / missing_reference_bytes / primary_required all map to errorCode "unknown"', async () => {
    const reasons = [
      'unknown',
      'low_quality',
      'missing_reference_bytes',
      'primary_required',
    ] as const;
    for (const r of reasons) {
      mockGenerationUpdate.mockClear();
      await persistGenerationResult({
        generationId: 'g1',
        userId: 'alice-uid',
        designId: 'd1',
        outcome: {
          ok: false,
          reason: r,
          message: r,
          metadata: { retryCount: 0, durationMs: 0 },
        },
      });
      expect(mockGenerationUpdate.mock.calls[0][0].errorCode).toBe('unknown');
    }
  });
});
