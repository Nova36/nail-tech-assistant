/**
 * c16 — generateDesign error-path unit tests.
 * One it per reason → errorCode mapping row from the brief §3 table.
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

const FAKE_IMAGE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

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
  mockGetSession.mockReset().mockResolvedValue(ALICE_SESSION);
  mockGenerate.mockReset();
  mockPersistGenerationStart.mockReset();
  mockPersistGenerationResult.mockReset();
  mockGetServerFirebaseStorage.mockReset();
  mockGenerationPath.mockReset();

  mockDesignGet.mockReset().mockResolvedValue({
    exists: true,
    data: () => DESIGN_D1,
  });

  let refCall = 0;
  const refs = [PRIMARY_REF, SECONDARY_REF];
  mockReferenceGet.mockImplementation(() => {
    const ref = refs[refCall % refs.length];
    refCall++;
    return Promise.resolve({ exists: true, data: () => ref });
  });
});

describe('generateDesign — persistGenerationStart failure paths', () => {
  it('design_not_found → errorCode design_not_found; generate NOT called', async () => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: false,
      reason: 'design_not_found',
      message: 'not found',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'design_not_found',
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('design_unauthorized (from lifecycle) → errorCode design_unauthorized; generate NOT called', async () => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: false,
      reason: 'design_unauthorized',
      message: 'unauthorized',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'design_unauthorized',
    });
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it('rules_denied → errorCode unknown', async () => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: false,
      reason: 'rules_denied',
      message: 'denied',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'unknown' });
  });

  it('firestore_failure → errorCode unknown', async () => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: false,
      reason: 'firestore_failure',
      message: 'error',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'unknown' });
  });
});

describe('generateDesign — design ownership check (before persistGenerationStart)', () => {
  it('design.userId !== session.uid → errorCode design_unauthorized; persistGenerationStart NOT called', async () => {
    mockDesignGet.mockResolvedValue({
      exists: true,
      data: () => ({ ...DESIGN_D1, userId: 'someone-else' }),
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'design_unauthorized',
    });
    expect(mockPersistGenerationStart).not.toHaveBeenCalled();
  });
});

describe('generateDesign — generate failure paths', () => {
  beforeEach(() => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    mockPersistGenerationResult.mockResolvedValue({ ok: true });
  });

  it('generate returns refusal → persistGenerationResult called with failure outcome; errorCode refusal', async () => {
    const outcome = {
      ok: false as const,
      reason: 'refusal' as const,
      message: 'content policy',
      metadata: { retryCount: 0, durationMs: 1000 },
    };
    mockGenerate.mockResolvedValue(outcome);

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'refusal' });
    expect(mockPersistGenerationResult).toHaveBeenCalledWith(
      expect.objectContaining({ outcome })
    );
  });

  it('generate returns rate_limit → errorCode rate_limit', async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'rate_limit',
      message: 'quota exceeded',
      metadata: { retryCount: 1, durationMs: 2000 },
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'rate_limit',
    });
  });

  it('generate returns network → errorCode network', async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'network',
      message: 'timeout',
      metadata: { retryCount: 1, durationMs: 3000 },
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'network' });
  });

  it('generate returns low_quality → errorCode low_quality', async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'low_quality',
      message: 'quality too low',
      metadata: { retryCount: 0, durationMs: 5000 },
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'low_quality',
    });
  });

  it('generate returns missing_reference_bytes → errorCode unknown', async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'missing_reference_bytes',
      message: 'bytes missing',
      metadata: { retryCount: 0, durationMs: 100 },
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'unknown' });
  });

  it('generate returns primary_required → errorCode invalid_input', async () => {
    mockGenerate.mockResolvedValue({
      ok: false,
      reason: 'primary_required',
      message: 'no primary ref',
      metadata: { retryCount: 0, durationMs: 50 },
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'invalid_input',
    });
  });
});

describe('generateDesign — persistGenerationResult failure paths', () => {
  beforeEach(() => {
    mockPersistGenerationStart.mockResolvedValue({
      ok: true,
      generationId: 'g1',
    });
    mockGenerate.mockResolvedValue({
      ok: true,
      imageBytes: FAKE_IMAGE,
      mimeType: 'image/png' as const,
      metadata: { retryCount: 0, durationMs: 8000 },
    });
  });

  it('storage_fail (after provider success) → errorCode storage_fail', async () => {
    mockPersistGenerationResult.mockResolvedValue({
      ok: false,
      reason: 'storage_fail',
      message: 'upload failed',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({
      status: 'failure',
      errorCode: 'storage_fail',
    });
  });

  it('firestore_failure (from persistGenerationResult) → errorCode unknown', async () => {
    mockPersistGenerationResult.mockResolvedValue({
      ok: false,
      reason: 'firestore_failure',
      message: 'write failed',
    });

    const result = await generateDesign({ designId: 'd1' });

    expect(result).toMatchObject({ status: 'failure', errorCode: 'unknown' });
  });
});
