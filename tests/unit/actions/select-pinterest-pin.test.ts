/**
 * c9-select-pin-action — happy path test.
 * Asserts uid sourced from session, ingestPinterestPin called with
 * { userId, pinId }, envelope propagated verbatim.
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
  mockGetSession.mockReset();
  mockIngestPinterestPin.mockReset();
});

const FAKE_REF = {
  id: 'ref-1',
  userId: 'alice-uid',
  source: 'pinterest' as const,
  sourceUrl: 'https://pin.it/1',
  storagePath: 'users/alice-uid/references/ref-1.jpg',
  pinterestPinId: 'p1',
  createdAt: '2026-04-30T01:00:00.000Z',
};

describe('selectPinterestPin — happy path', () => {
  it('forwards session uid and pinId; propagates envelope verbatim', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });
    mockIngestPinterestPin.mockResolvedValue({
      ok: true,
      reference: FAKE_REF,
    });

    const out = await selectPinterestPin('p1');

    expect(mockIngestPinterestPin).toHaveBeenCalledWith({
      userId: 'alice-uid',
      pinId: 'p1',
    });
    expect(out).toEqual({ ok: true, reference: FAKE_REF });
  });

  it('trims surrounding whitespace from pinId before forwarding', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });
    mockIngestPinterestPin.mockResolvedValue({
      ok: true,
      reference: FAKE_REF,
    });

    await selectPinterestPin('  p1  ');

    expect(mockIngestPinterestPin).toHaveBeenCalledWith({
      userId: 'alice-uid',
      pinId: 'p1',
    });
  });
});
