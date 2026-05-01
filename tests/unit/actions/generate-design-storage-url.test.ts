/**
 * c16 — generateDesign signed-URL path tests.
 * Asserts generationPath called with correct extension and getSignedUrl options.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

process.env.PINTEREST_ACCESS_TOKEN = 'test';

const mockGetSession = vi.fn();
const mockGenerate = vi.fn();
const mockPersistGenerationStart = vi.fn();
const mockPersistGenerationResult = vi.fn();
const mockCreateDesignDraft = vi.fn();
const mockGetServerFirebaseStorage = vi.fn();
const mockGenerationPath = vi.fn();
const mockGetSignedUrl = vi.fn();
const mockDesignGet = vi.fn();
const mockReferenceGet = vi.fn();

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

const ALICE_SESSION = { uid: 'alice', email: 'alice@test.com', name: null };

const DESIGN_D1 = {
  id: 'd1',
  userId: 'alice',
  name: null,
  primaryReferenceId: 'ref-primary',
  secondaryReferenceIds: ['ref-secondary-1'],
  promptText: null,
  nailShape: 'almond' as const,
  latestGenerationId: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const PRIMARY_REF = {
  id: 'ref-primary',
  userId: 'alice',
  source: 'pinterest' as const,
  sourceUrl: null,
  storagePath: 'users/alice/references/ref-primary.jpg',
  pinterestPinId: null,
  createdAt: '2026-01-01T00:00:00Z',
};

const SECONDARY_REF = {
  id: 'ref-secondary-1',
  userId: 'alice',
  source: 'upload' as const,
  sourceUrl: null,
  storagePath: 'users/alice/references/ref-secondary-1.png',
  pinterestPinId: null,
  createdAt: '2026-01-01T00:00:00Z',
};

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
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-05-01T00:00:00Z'));

  mockGetSession.mockReset().mockResolvedValue(ALICE_SESSION);
  mockGenerate.mockReset();
  mockPersistGenerationStart
    .mockReset()
    .mockResolvedValue({ ok: true, generationId: 'g1' });
  mockPersistGenerationResult.mockReset().mockResolvedValue({ ok: true });
  mockGenerationPath.mockReset();
  mockGetSignedUrl
    .mockReset()
    .mockResolvedValue(['https://storage.example.com/signed-url']);

  const mockFileRef = { getSignedUrl: mockGetSignedUrl };
  const mockBucket = { file: vi.fn().mockReturnValue(mockFileRef) };
  mockGetServerFirebaseStorage.mockReset().mockReturnValue(mockBucket);

  mockDesignGet.mockReset().mockResolvedValue({
    exists: true,
    data: () => DESIGN_D1,
  });

  let refCall = 0;
  const refs = [PRIMARY_REF, SECONDARY_REF];
  mockReferenceGet.mockReset().mockImplementation(() => {
    const ref = refs[refCall % refs.length];
    refCall++;
    return Promise.resolve({ exists: true, data: () => ref });
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('generateDesign — signed-URL path', () => {
  it('image/jpeg mime → generationPath called with jpg extension', async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: Buffer.from([0xff, 0xd8]),
      mimeType: 'image/jpeg',
      metadata: { retryCount: 0, durationMs: 5000 },
    });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.jpg');

    await generateDesign({ designId: 'd1' });

    expect(mockGenerationPath).toHaveBeenCalledWith('alice', 'g1', 'jpg');
  });

  it('image/png mime → generationPath called with png extension', async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');

    await generateDesign({ designId: 'd1' });

    expect(mockGenerationPath).toHaveBeenCalledWith('alice', 'g1', 'png');
  });

  it('getSignedUrl called with action read and expires = Date.now() + 15 minutes', async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');

    const expectedExpires =
      new Date('2026-05-01T00:00:00Z').getTime() + 15 * 60 * 1000;

    await generateDesign({ designId: 'd1' });

    expect(mockGetSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'read',
        expires: expectedExpires,
      })
    );
  });

  it('signed URL from getSignedUrl[0] is returned in imageUrl envelope field', async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      mimeType: 'image/png',
      metadata: { retryCount: 0, durationMs: 8000 },
    });
    mockGenerationPath.mockReturnValue('users/alice/generations/g1.png');
    mockGetSignedUrl.mockResolvedValue([
      'https://storage.example.com/signed/g1.png?token=abc',
    ]);

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'success',
      imageUrl: 'https://storage.example.com/signed/g1.png?token=abc',
    });
  });
});
