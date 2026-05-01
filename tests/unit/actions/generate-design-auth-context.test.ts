/**
 * c16 — generateDesign auth-context unit tests.
 * No session → unauthorized; empty designId → invalid_input.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.PINTEREST_ACCESS_TOKEN = 'test';

const mockGetSession = vi.fn();
const mockGenerate = vi.fn();
const mockPersistGenerationStart = vi.fn();
const mockPersistGenerationResult = vi.fn();
const mockCreateDesignDraft = vi.fn();
const mockGetServerFirebaseStorage = vi.fn();
const mockGenerationPath = vi.fn();

vi.mock('@/lib/firebase/session', () => ({
  getSessionForServerAction: mockGetSession,
}));

vi.mock('@/lib/ai/generate', () => ({
  generate: mockGenerate,
}));

vi.mock('@/lib/designs/lifecycle', () => ({
  persistGenerationStart: mockPersistGenerationStart,
  persistGenerationResult: mockPersistGenerationResult,
  createDesignDraft: mockCreateDesignDraft,
}));

vi.mock('@/lib/firebase/storage', () => ({
  getServerFirebaseStorage: mockGetServerFirebaseStorage,
  generationPath: mockGenerationPath,
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: () => ({
      doc: () => ({
        withConverter: () => ({
          get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

let generateDesign: typeof import('@/app/(authenticated)/design/actions').generateDesign;

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

  const mod = await import('@/app/(authenticated)/design/actions');
  generateDesign = mod.generateDesign;
});

beforeEach(() => {
  mockGetSession.mockReset();
  mockGenerate.mockReset();
  mockPersistGenerationStart.mockReset();
  mockPersistGenerationResult.mockReset();
});

describe('generateDesign — auth context', () => {
  it('returns unauthorized when no session; persistGenerationStart and generate NOT called', async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'unauthorized',
      cta: 'adjust_inputs',
      message: expect.any(String),
    });
    expect(mockPersistGenerationStart).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns invalid_input when designId is empty string; provider NOT called', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });

    const result = await generateDesign({ designId: '' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'invalid_input',
      cta: 'adjust_inputs',
      message: expect.any(String),
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('returns invalid_input when designId is whitespace-only; provider NOT called', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });

    const result = await generateDesign({ designId: '   ' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'invalid_input',
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
