/**
 * c9-select-pin-action — auth + input validation.
 * Asserts no session / empty session / empty pinId all reject without
 * invoking ingestPinterestPin.
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

describe('selectPinterestPin — auth + input', () => {
  it('null session → unauthorized; ingest not called', async () => {
    mockGetSession.mockResolvedValue(null);

    const out = await selectPinterestPin('p1');

    expect(mockIngestPinterestPin).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('unauthorized');
  });

  it('empty uid in session → unauthorized; ingest not called', async () => {
    mockGetSession.mockResolvedValue({ uid: '', email: 'x', name: null });

    const out = await selectPinterestPin('p1');

    expect(mockIngestPinterestPin).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('unauthorized');
  });

  it('empty pinId → invalid_input; ingest not called', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });

    const out = await selectPinterestPin('');

    expect(mockIngestPinterestPin).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('invalid_input');
  });

  it('whitespace-only pinId → invalid_input; ingest not called', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'alice-uid',
      email: 'a@b.c',
      name: null,
    });

    const out = await selectPinterestPin('   ');

    expect(mockIngestPinterestPin).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe('invalid_input');
  });
});
