/**
 * c9-select-pin-action — verbatim error propagation.
 * Each c6 IngestPinterestPinResult error reason flows through the action
 * without renaming, stripping, or reshaping.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetSession = vi.fn();
const mockIngestPinterestPin = vi.fn();

vi.mock('@/lib/firebase/session', () => ({
  getSessionForServerAction: mockGetSession,
}));

vi.mock('@/lib/references/ingest', () => ({
  ingestPinterestPin: mockIngestPinterestPin,
}));

let selectPinterestPin: typeof import('@/app/(authenticated)/design/actions').selectPinterestPin;

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
  vi.stubEnv('PINTEREST_ACCESS_TOKEN', 'pt-test');

  const mod = await import('@/app/(authenticated)/design/actions');
  selectPinterestPin = mod.selectPinterestPin;
});

beforeEach(() => {
  mockGetSession.mockReset().mockResolvedValue({
    uid: 'alice-uid',
    email: 'a@b.c',
    name: null,
  });
  mockIngestPinterestPin.mockReset();
});

const REASONS = [
  'invalid_token',
  'insufficient_scope',
  'not_found',
  'rate_limit',
  'network',
  'no_image_variant',
  'unsupported_media_type',
  'image_fetch_failed',
  'storage_failure',
  'firestore_failure',
  'unknown',
] as const;

describe('selectPinterestPin — verbatim propagation', () => {
  it.each(REASONS)('propagates ingest reason "%s" verbatim', async (reason) => {
    mockIngestPinterestPin.mockResolvedValue({
      ok: false,
      reason,
      message: `mock ${reason}`,
    });

    const out = await selectPinterestPin('p1');

    expect(out).toEqual({ ok: false, reason, message: `mock ${reason}` });
  });

  it('propagates happy-path response verbatim', async () => {
    const ref = {
      id: 'r1',
      userId: 'alice-uid',
      source: 'pinterest' as const,
      sourceUrl: 'https://pin.it/x',
      storagePath: 'users/alice-uid/references/r1.jpg',
      pinterestPinId: 'pX',
      createdAt: '2026-04-30T01:00:00.000Z',
    };
    mockIngestPinterestPin.mockResolvedValue({ ok: true, reference: ref });

    const out = await selectPinterestPin('pX');

    expect(out).toEqual({ ok: true, reference: ref });
  });
});
