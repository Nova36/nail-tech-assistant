/**
 * c14 — generateWithRetry / generate retry policy tests.
 * Locked: ONE retry on transient (network|rate_limit); NO retry on
 * refusal|unknown|low_quality. metadata.retryCount accurately set.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGenerateImage = vi.fn();
const mockReadReferenceBytes = vi.fn();

vi.mock('@/lib/ai/provider', () => ({
  generateImage: mockGenerateImage,
}));

vi.mock('@/lib/firebase/storage', () => ({
  readReferenceBytes: mockReadReferenceBytes,
  getServerFirebaseStorage: vi.fn(),
}));

let generate: typeof import('@/lib/ai/generate').generate;

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
  generate = mod.generate;
});

beforeEach(() => {
  mockGenerateImage.mockReset();
  mockReadReferenceBytes.mockReset().mockResolvedValue({
    ok: true,
    bytes: Buffer.from([0xff]),
    contentType: 'image/jpeg',
  });
});

const REF = {
  id: 'r1',
  userId: 'alice-uid',
  source: 'pinterest' as const,
  sourceUrl: 'https://pin.it/x',
  storagePath: 'users/alice-uid/references/r1.jpg',
  pinterestPinId: 'p1',
  createdAt: '2026-04-30T01:00:00.000Z',
};

const INPUT = {
  primaryReference: REF,
  secondaryReferences: [],
  promptText: 'matte',
  nailShape: 'almond' as const,
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('generate — retry policy', () => {
  it('success on first attempt → retryCount: 0, provider called once', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      ok: true,
      imageBytes: PNG,
      mimeType: 'image/png',
      metadata: {},
    });

    const out = await generate(INPUT);

    expect(out.ok).toBe(true);
    if (out.ok) expect(out.metadata.retryCount).toBe(0);
    expect(mockGenerateImage).toHaveBeenCalledOnce();
  });

  it('network → success on retry → retryCount: 1', async () => {
    mockGenerateImage
      .mockResolvedValueOnce({ ok: false, reason: 'network', message: 'down' })
      .mockResolvedValueOnce({
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: {},
      });

    const out = await generate(INPUT);

    expect(out.ok).toBe(true);
    if (out.ok) expect(out.metadata.retryCount).toBe(1);
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
  });

  it('rate_limit → success on retry → retryCount: 1', async () => {
    mockGenerateImage
      .mockResolvedValueOnce({ ok: false, reason: 'rate_limit', message: '' })
      .mockResolvedValueOnce({
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: {},
      });

    const out = await generate(INPUT);

    expect(out.ok).toBe(true);
    if (out.ok) expect(out.metadata.retryCount).toBe(1);
  });

  it('network → rate_limit → final failure with retryCount: 1, provider called twice', async () => {
    mockGenerateImage
      .mockResolvedValueOnce({ ok: false, reason: 'network', message: 'a' })
      .mockResolvedValueOnce({ ok: false, reason: 'rate_limit', message: 'b' });

    const out = await generate(INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('rate_limit');
      expect(out.metadata.retryCount).toBe(1);
    }
    expect(mockGenerateImage).toHaveBeenCalledTimes(2);
  });

  it('refusal → NO retry → retryCount: 0, provider called once', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      ok: false,
      reason: 'refusal',
      message: 'blocked',
    });

    const out = await generate(INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('refusal');
      expect(out.metadata.retryCount).toBe(0);
    }
    expect(mockGenerateImage).toHaveBeenCalledOnce();
  });

  it('unknown → NO retry', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      ok: false,
      reason: 'unknown',
      message: '?',
    });

    const out = await generate(INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.metadata.retryCount).toBe(0);
    expect(mockGenerateImage).toHaveBeenCalledOnce();
  });

  it('low_quality → NO retry', async () => {
    mockGenerateImage.mockResolvedValueOnce({
      ok: false,
      reason: 'low_quality',
      message: 'low',
    });

    const out = await generate(INPUT);

    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.metadata.retryCount).toBe(0);
    expect(mockGenerateImage).toHaveBeenCalledOnce();
  });

  it('metadata.durationMs >= 500 when retry occurs (backoff)', async () => {
    mockGenerateImage
      .mockResolvedValueOnce({ ok: false, reason: 'network', message: 'x' })
      .mockResolvedValueOnce({
        ok: true,
        imageBytes: PNG,
        mimeType: 'image/png',
        metadata: {},
      });

    const out = await generate(INPUT);

    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.metadata.durationMs).toBeGreaterThanOrEqual(500);
    }
  });
});
