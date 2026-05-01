/**
 * c16 — generateDesign happy-path unit test.
 * Auth + valid design d1 (alice-owned) + 1 primary + 2 secondary refs.
 * Asserts success envelope and call order.
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

const mockGetSignedUrl = vi.fn();
const mockFileRef = { getSignedUrl: mockGetSignedUrl };
const mockBucket = { file: vi.fn(() => mockFileRef) };

const mockDesignGet = vi.fn();
const mockReferenceGet = vi.fn();

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      doc: () => ({
        withConverter: () => ({
          get: name === 'designs' ? mockDesignGet : mockReferenceGet,
        }),
      }),
    }),
  }),
}));

vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: () => ({}),
}));

let generateDesign: typeof import('@/app/(authenticated)/design/actions').generateDesign;

const PRIMARY_REF = {
  id: 'ref-primary',
  userId: 'alice',
  source: 'pinterest' as const,
  sourceUrl: 'https://pin.it/1',
  storagePath: 'users/alice/references/ref-primary.jpg',
  pinterestPinId: 'pin1',
  createdAt: '2026-01-01T00:00:00Z',
};
const SECONDARY_REF_1 = {
  id: 'ref-secondary-1',
  userId: 'alice',
  source: 'upload' as const,
  sourceUrl: null,
  storagePath: 'users/alice/references/ref-secondary-1.png',
  pinterestPinId: null,
  createdAt: '2026-01-01T00:00:00Z',
};
const SECONDARY_REF_2 = {
  id: 'ref-secondary-2',
  userId: 'alice',
  source: 'upload' as const,
  sourceUrl: null,
  storagePath: 'users/alice/references/ref-secondary-2.png',
  pinterestPinId: null,
  createdAt: '2026-01-01T00:00:00Z',
};

const DESIGN_D1 = {
  id: 'd1',
  userId: 'alice',
  name: null,
  primaryReferenceId: 'ref-primary',
  secondaryReferenceIds: ['ref-secondary-1', 'ref-secondary-2'],
  promptText: 'matte',
  nailShape: 'almond' as const,
  latestGenerationId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const IMAGE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

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
  mockGetSignedUrl.mockReset();
  mockGenerationPath.mockReset();
  mockBucket.file.mockReset().mockReturnValue(mockFileRef);
  mockGetServerFirebaseStorage.mockReset().mockReturnValue(mockBucket);

  mockDesignGet.mockReset().mockResolvedValue({
    exists: true,
    data: () => DESIGN_D1,
  });

  let callCount = 0;
  const refs = [PRIMARY_REF, SECONDARY_REF_1, SECONDARY_REF_2];
  mockReferenceGet.mockImplementation(() => {
    const ref = refs[callCount % refs.length];
    callCount++;
    return Promise.resolve({ exists: true, data: () => ref });
  });
});

describe('generateDesign — happy path', () => {
  it('returns success envelope with generationId and imageUrl', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: IMAGE_BYTES,
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockPersistGenerationResult.mockResolvedValue({ ok: true });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');
    mockGetSignedUrl.mockResolvedValue([
      'https://storage.example.com/signed/g1.png',
    ]);

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'success',
      generationId: 'g1',
      imageUrl: expect.any(String),
    });
  });

  it('calls persistGenerationStart before generate', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: IMAGE_BYTES,
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockPersistGenerationResult.mockResolvedValue({ ok: true });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');
    mockGetSignedUrl.mockResolvedValue([
      'https://storage.example.com/signed/g1.png',
    ]);

    await generateDesign({ designId: 'd1' });

    expect(mockPersistGenerationStart.mock.invocationCallOrder[0]).toBeLessThan(
      mockGenerate.mock.invocationCallOrder[0]
    );
    expect(mockGenerate).toHaveBeenCalled();
    expect(mockPersistGenerationResult).toHaveBeenCalled();
  });

  it('calls generate with full Reference objects resolved from Firestore', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: IMAGE_BYTES,
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockPersistGenerationResult.mockResolvedValue({ ok: true });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');
    mockGetSignedUrl.mockResolvedValue([
      'https://storage.example.com/signed/g1.png',
    ]);

    await generateDesign({ designId: 'd1' });

    expect(mockGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryReference: expect.objectContaining({ id: 'ref-primary' }),
        secondaryReferences: expect.arrayContaining([
          expect.objectContaining({ id: 'ref-secondary-1' }),
          expect.objectContaining({ id: 'ref-secondary-2' }),
        ]),
        promptText: 'matte',
        nailShape: 'almond',
      })
    );
  });

  it('passes persistGenerationResult the outcome from generate', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice',
      email: 'alice@test.com',
      name: null,
    });
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    const outcome = {
      ok: true as const,
      imageBytes: IMAGE_BYTES,
      mimeType: 'image/png' as const,
      metadata: { retryCount: 0, durationMs: 8000 },
    };
    mockGenerate.mockResolvedValue(outcome);
    mockPersistGenerationResult.mockResolvedValue({ ok: true });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');
    mockGetSignedUrl.mockResolvedValue([
      'https://storage.example.com/signed/g1.png',
    ]);

    await generateDesign({ designId: 'd1' });

    expect(mockPersistGenerationResult).toHaveBeenCalledWith(
      expect.objectContaining({
        generationId: 'g1',
        userId: 'alice',
        designId: 'd1',
        outcome,
      })
    );
  });
});
