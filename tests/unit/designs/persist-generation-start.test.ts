/**
 * c15 — persistGenerationStart unit tests (mocked Firestore + design lookup).
 * Covers: pre-flight design ownership check, pending-row write, rules_denied,
 * design_not_found, design_unauthorized.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDesignGet = vi.fn();
const mockGenerationSet = vi.fn();

const collectionMock = vi.fn((name: string) => {
  if (name === 'designs') {
    return {
      doc: () => ({
        withConverter: () => ({ get: mockDesignGet }),
      }),
    };
  }
  if (name === 'generations') {
    return {
      doc: () => ({
        withConverter: () => ({ set: mockGenerationSet }),
      }),
    };
  }
  throw new Error(`unexpected collection ${name}`);
});

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: collectionMock }),
}));

let persistGenerationStart: typeof import('@/lib/designs/lifecycle').persistGenerationStart;

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
  persistGenerationStart = mod.persistGenerationStart;
});

beforeEach(() => {
  mockDesignGet.mockReset();
  mockGenerationSet.mockReset().mockResolvedValue({});
});

describe('persistGenerationStart', () => {
  it('writes pending row + returns generationId on owned design', async () => {
    mockDesignGet.mockResolvedValue({
      exists: true,
      data: () => ({ id: 'd1', userId: 'alice-uid' }),
    });

    const out = await persistGenerationStart({
      userId: 'alice-uid',
      designId: 'd1',
      requestJson: { sample: true },
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(typeof out.generationId).toBe('string');
    expect(mockGenerationSet).toHaveBeenCalledOnce();
    const written = mockGenerationSet.mock.calls[0][0];
    expect(written).toMatchObject({
      id: out.generationId,
      designId: 'd1',
      userId: 'alice-uid',
      status: 'pending',
      resultStoragePath: null,
      errorCode: null,
      errorMessage: null,
    });
  });

  it('returns design_not_found when design does not exist', async () => {
    mockDesignGet.mockResolvedValue({ exists: false, data: () => undefined });

    const out = await persistGenerationStart({
      userId: 'alice-uid',
      designId: 'missing',
      requestJson: {},
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('design_not_found');
    expect(mockGenerationSet).not.toHaveBeenCalled();
  });

  it('returns design_unauthorized when design owned by different user', async () => {
    mockDesignGet.mockResolvedValue({
      exists: true,
      data: () => ({ id: 'd1', userId: 'bob-uid' }),
    });

    const out = await persistGenerationStart({
      userId: 'alice-uid',
      designId: 'd1',
      requestJson: {},
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('design_unauthorized');
    expect(mockGenerationSet).not.toHaveBeenCalled();
  });

  it('maps permission-denied write to rules_denied', async () => {
    mockDesignGet.mockResolvedValue({
      exists: true,
      data: () => ({ id: 'd1', userId: 'alice-uid' }),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGenerationSet.mockRejectedValueOnce(
      Object.assign(new Error('denied'), { code: 'permission-denied' })
    );

    const out = await persistGenerationStart({
      userId: 'alice-uid',
      designId: 'd1',
      requestJson: {},
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('rules_denied');
    errorSpy.mockRestore();
  });
});
