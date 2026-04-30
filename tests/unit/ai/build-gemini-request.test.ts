/**
 * c14 — buildGeminiRequest unit tests (happy path + error paths).
 * Mocks c5 readReferenceBytes; asserts primary-first ordering, secondary
 * order preservation, mimeType propagation, and strict missing-bytes failure.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadReferenceBytes = vi.fn();

vi.mock('@/lib/firebase/storage', () => ({
  readReferenceBytes: mockReadReferenceBytes,
  // Re-export the others in case generate.ts imports them as named — no-op stubs
  getServerFirebaseStorage: vi.fn(),
}));

vi.mock('@/lib/ai/provider', () => ({
  generateImage: vi.fn(),
}));

let buildGeminiRequest: typeof import('@/lib/ai/generate').buildGeminiRequest;

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
  vi.stubEnv(
    'FIREBASE_SERVICE_ACCOUNT_JSON',
    JSON.stringify({
      project_id: 'test-project',
      client_email: 'sa@test-project.iam.gserviceaccount.com',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    })
  );

  const mod = await import('@/lib/ai/generate');
  buildGeminiRequest = mod.buildGeminiRequest;
});

beforeEach(() => {
  mockReadReferenceBytes.mockReset();
});

const PRIMARY_REF = {
  id: 'r-primary',
  userId: 'alice-uid',
  source: 'pinterest' as const,
  sourceUrl: 'https://pin.it/p',
  storagePath: 'users/alice-uid/references/r-primary.jpg',
  pinterestPinId: 'p1',
  createdAt: '2026-04-30T01:00:00.000Z',
};

const SECONDARY_REFS = [
  {
    id: 'r-sec-1',
    userId: 'alice-uid',
    source: 'upload' as const,
    sourceUrl: null,
    storagePath: 'users/alice-uid/references/r-sec-1.png',
    pinterestPinId: null,
    createdAt: '2026-04-30T01:01:00.000Z',
  },
  {
    id: 'r-sec-2',
    userId: 'alice-uid',
    source: 'pinterest' as const,
    sourceUrl: 'https://pin.it/q',
    storagePath: 'users/alice-uid/references/r-sec-2.jpg',
    pinterestPinId: 'p2',
    createdAt: '2026-04-30T01:02:00.000Z',
  },
];

describe('buildGeminiRequest — happy path', () => {
  it('returns ProviderRequest with primary-first + secondaries in input order', async () => {
    mockReadReferenceBytes
      .mockResolvedValueOnce({
        ok: true,
        bytes: Buffer.from([0xff, 0xd8]),
        contentType: 'image/jpeg',
      })
      .mockResolvedValueOnce({
        ok: true,
        bytes: Buffer.from([0x89, 0x50]),
        contentType: 'image/png',
      })
      .mockResolvedValueOnce({
        ok: true,
        bytes: Buffer.from([0xff, 0xd8]),
        contentType: 'image/jpeg',
      });

    const out = await buildGeminiRequest({
      primaryReference: PRIMARY_REF,
      secondaryReferences: SECONDARY_REFS,
      promptText: 'matte rose gold',
      nailShape: 'almond',
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.request.images).toHaveLength(3);
    expect(out.request.images[0].role).toBe('primary');
    expect(out.request.images[0].mimeType).toBe('image/jpeg');
    expect(out.request.images[1].role).toBe('secondary');
    expect(out.request.images[1].mimeType).toBe('image/png');
    expect(out.request.images[2].role).toBe('secondary');
    expect(out.request.promptText).toBe('matte rose gold');
    expect(out.request.nailShape).toBe('almond');
  });

  it('handles zero secondaries — primary-only request', async () => {
    mockReadReferenceBytes.mockResolvedValueOnce({
      ok: true,
      bytes: Buffer.from([0xff]),
      contentType: 'image/jpeg',
    });

    const out = await buildGeminiRequest({
      primaryReference: PRIMARY_REF,
      secondaryReferences: [],
      promptText: null,
      nailShape: 'oval',
    });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.request.images).toHaveLength(1);
    expect(out.request.images[0].role).toBe('primary');
    expect(out.request.promptText).toBeNull();
  });
});

describe('buildGeminiRequest — error paths', () => {
  it('primary missing bytes → missing_reference_bytes', async () => {
    mockReadReferenceBytes.mockResolvedValueOnce({
      ok: false,
      reason: 'not_found',
      message: 'object not found',
    });

    const out = await buildGeminiRequest({
      primaryReference: PRIMARY_REF,
      secondaryReferences: [],
      promptText: null,
      nailShape: 'almond',
    });

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('missing_reference_bytes');
      expect(out.message).toContain(PRIMARY_REF.id);
    }
  });

  it('secondary missing bytes → missing_reference_bytes (strict — no partial)', async () => {
    mockReadReferenceBytes
      .mockResolvedValueOnce({
        ok: true,
        bytes: Buffer.from([0xff]),
        contentType: 'image/jpeg',
      })
      .mockResolvedValueOnce({
        ok: false,
        reason: 'not_found',
        message: 'gone',
      });

    const out = await buildGeminiRequest({
      primaryReference: PRIMARY_REF,
      secondaryReferences: [SECONDARY_REFS[0]],
      promptText: null,
      nailShape: 'almond',
    });

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('missing_reference_bytes');
  });
});
