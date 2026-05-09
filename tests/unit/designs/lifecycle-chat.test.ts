/**
 * e3-lifecycle-chat-lineage — unit tests for the additive `chatTurnId` linkage
 * on `persistGenerationResult`. Covers atomic 3-doc transaction on success,
 * backward-compat 2-doc transaction when `chatTurnId` is omitted, and the
 * existing error-log shape when the transaction itself fails.
 *
 * Mock pattern mirrors `tests/unit/designs/persist-generation-result.test.ts`
 * but extends `collectionMock` to handle the nested chat-turn doc path
 * `designs/{designId}/chat_turns/{chatTurnId}`.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerationUpdate = vi.fn();
const mockDesignChatTurnUpdate = vi.fn();
const mockTxnUpdate = vi.fn();
const mockRunTransaction = vi.fn();
const mockUploadGenerationBytes = vi.fn();

// Track which ref paths were resolved, so the test can assert ordering and
// presence of the chat-turn ref independent of mock-call instrumentation.
const refsResolved: string[] = [];

const makeChatTurnsCollection = (designId: string) => ({
  doc: (turnId: string) => {
    refsResolved.push(`designs/${designId}/chat_turns/${turnId}`);
    return {
      withConverter: () => ({ update: mockDesignChatTurnUpdate }),
      // `withConverter` returns a typed ref; tests don't construct without it
    };
  },
});

const collectionMock = vi.fn((name: string) => ({
  doc: (id: string) => {
    refsResolved.push(`${name}/${id}`);
    return {
      withConverter: () => ({ update: mockGenerationUpdate }),
      collection: (sub: string) => {
        if (name === 'designs' && sub === 'chat_turns') {
          return makeChatTurnsCollection(id);
        }
        throw new Error(`unexpected subcollection: ${name}/${id}/${sub}`);
      },
    };
  },
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
  refsResolved.length = 0;
  mockGenerationUpdate.mockReset().mockResolvedValue({});
  mockDesignChatTurnUpdate.mockReset().mockResolvedValue({});
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

describe('persistGenerationResult — chat-driven success lineage (AC1)', () => {
  it('with chatTurnId: transaction updates generation, design, AND chat_turn atomically', async () => {
    mockUploadGenerationBytes.mockResolvedValue({
      ok: true,
      storagePath: 'users/alice-uid/generations/g1.png',
    });

    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      chatTurnId: 't1',
      outcome: {
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: { retryCount: 0, durationMs: 1000 },
      },
    });

    expect(out.ok).toBe(true);
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    expect(mockTxnUpdate).toHaveBeenCalledTimes(3);

    const generationUpdate = mockTxnUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[1], 'resultStoragePath')
    );
    expect(generationUpdate).toBeDefined();
    expect(generationUpdate![1]).toMatchObject({
      status: 'success',
      resultStoragePath: 'users/alice-uid/generations/g1.png',
      chatTurnId: 't1',
    });

    const designUpdate = mockTxnUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[1], 'latestGenerationId')
    );
    expect(designUpdate).toBeDefined();
    expect(designUpdate![1]).toMatchObject({ latestGenerationId: 'g1' });

    const chatTurnUpdate = mockTxnUpdate.mock.calls.find((c) =>
      Object.prototype.hasOwnProperty.call(c[1], 'generationId')
    );
    expect(chatTurnUpdate).toBeDefined();
    expect(chatTurnUpdate![1]).toMatchObject({
      generationId: 'g1',
      status: 'success',
    });

    expect(refsResolved).toContain('designs/d1/chat_turns/t1');
  });
});

describe('persistGenerationResult — non-chat callers (AC2 backward compat)', () => {
  it('without chatTurnId: transaction has exactly 2 updates and never touches chat_turns', async () => {
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
    expect(mockRunTransaction).toHaveBeenCalledOnce();
    expect(mockTxnUpdate).toHaveBeenCalledTimes(2);
    expect(
      refsResolved.some((p) => p.startsWith('designs/d1/chat_turns/'))
    ).toBe(false);
  });

  it('without chatTurnId: provider failure preserves existing single-update behavior', async () => {
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
    expect(mockGenerationUpdate.mock.calls[0][0]).toMatchObject({
      status: 'failure',
      errorCode: 'refusal',
    });
  });
});

describe('persistGenerationResult — chat-driven provider failure (AC3 logging)', () => {
  it('with chatTurnId + provider failure: generation row update tags chatTurnId; logs code + message on firestore_failure', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerationUpdate.mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { code: 'aborted' })
    );

    const out = await persistGenerationResult({
      generationId: 'g1',
      userId: 'alice-uid',
      designId: 'd1',
      chatTurnId: 't1',
      outcome: {
        ok: false,
        reason: 'refusal',
        message: 'blocked',
        metadata: { retryCount: 0, durationMs: 100 },
      },
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('firestore_failure');

    const log = errorSpy.mock.calls.find((c) =>
      String(c[0]).includes('[lifecycle] persistGenerationResult')
    );
    expect(log).toBeDefined();
    // Body must include code + message keys per feedback_silent_catches_cost_time
    const body = log?.[1] as Record<string, unknown> | undefined;
    expect(body).toBeDefined();
    expect(body).toMatchObject({ code: 'aborted' });
    expect(typeof body!.message).toBe('string');

    errorSpy.mockRestore();
  });
});
