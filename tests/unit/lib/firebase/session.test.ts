/**
 * AC#4 — getSession() never throws; returns Session | null from session cookie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const mockVerifySessionCookie = vi.fn();
const mockGetAuth = vi.fn(() => ({
  verifySessionCookie: mockVerifySessionCookie,
}));

vi.mock('firebase-admin/auth', () => ({
  getAuth: mockGetAuth,
}));

vi.mock('firebase-admin/app', () => {
  const fakeApp = { name: '[DEFAULT]', options: {} };
  return {
    getApps: vi.fn(() => [fakeApp]),
    initializeApp: vi.fn(() => fakeApp),
    cert: vi.fn((c: unknown) => c),
  };
});

// Prevent createServerFirebaseAdmin from actually initialising Firebase Admin
vi.mock('../../../../lib/firebase/server', () => ({
  createServerFirebaseAdmin: vi.fn(() => ({ name: '[DEFAULT]' })),
}));

function makeRequest(cookieValue?: string): NextRequest {
  const req = new NextRequest('https://test.local/');
  if (cookieValue !== undefined) {
    // NextRequest is immutable; we override cookies via headers
    return new NextRequest('https://test.local/', {
      headers: { cookie: `session=${cookieValue}` },
    });
  }
  return req;
}

describe('lib/firebase/session — getSession (AC#4)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerifySessionCookie.mockReset();
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  });

  it('returns null when no session cookie is present', async () => {
    const { getSession } = await import('../../../../lib/firebase/session');
    const result = await getSession(makeRequest());
    expect(result).toBeNull();
  });

  it('does NOT throw when no session cookie is present', async () => {
    const { getSession } = await import('../../../../lib/firebase/session');
    await expect(getSession(makeRequest())).resolves.toBeNull();
  });

  it('returns null for a malformed session cookie (verifySessionCookie throws)', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('Malformed cookie'));
    const { getSession } = await import('../../../../lib/firebase/session');
    const result = await getSession(makeRequest('bad-cookie-value'));
    expect(result).toBeNull();
  });

  it('does NOT throw for a malformed session cookie', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('Malformed cookie'));
    const { getSession } = await import('../../../../lib/firebase/session');
    await expect(
      getSession(makeRequest('bad-cookie-value'))
    ).resolves.toBeNull();
  });

  it('returns null when verifySessionCookie throws (expired/revoked)', async () => {
    mockVerifySessionCookie.mockRejectedValue(
      new Error('auth/session-cookie-expired')
    );
    const { getSession } = await import('../../../../lib/firebase/session');
    const result = await getSession(makeRequest('expired-cookie'));
    expect(result).toBeNull();
  });

  it('returns Session with uid and email for a valid cookie', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'user-uid-123',
      email: 'allowed@example.com',
    });
    const { getSession } = await import('../../../../lib/firebase/session');
    const result = await getSession(makeRequest('valid-session-cookie'));
    expect(result).not.toBeNull();
    expect(result?.uid).toBe('user-uid-123');
    expect(result?.email).toBe('allowed@example.com');
  });
});

describe('lib/firebase/session — getSessionFromCookieString (string API)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerifySessionCookie.mockReset();
    process.env.FIREBASE_PROJECT_ID = 'test-project';
    process.env.FIREBASE_CLIENT_EMAIL = 'sa@test.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY =
      '-----BEGIN RSA PRIVATE KEY-----\nfake\n-----END RSA PRIVATE KEY-----';
  });

  it('returns null for undefined', async () => {
    const { getSessionFromCookieString } =
      await import('../../../../lib/firebase/session');
    await expect(getSessionFromCookieString(undefined)).resolves.toBeNull();
  });

  it('returns null for empty string', async () => {
    const { getSessionFromCookieString } =
      await import('../../../../lib/firebase/session');
    await expect(getSessionFromCookieString('')).resolves.toBeNull();
  });

  it('returns null for null', async () => {
    const { getSessionFromCookieString } =
      await import('../../../../lib/firebase/session');
    await expect(getSessionFromCookieString(null)).resolves.toBeNull();
  });

  it('returns Session for a valid cookie string', async () => {
    mockVerifySessionCookie.mockResolvedValue({
      uid: 'direct-uid',
      email: 'direct@example.com',
    });
    const { getSessionFromCookieString } =
      await import('../../../../lib/firebase/session');
    const result = await getSessionFromCookieString('valid-cookie');
    expect(result).toEqual({ uid: 'direct-uid', email: 'direct@example.com' });
  });

  it('returns null when verifySessionCookie throws', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('expired'));
    const { getSessionFromCookieString } =
      await import('../../../../lib/firebase/session');
    await expect(
      getSessionFromCookieString('expired-cookie')
    ).resolves.toBeNull();
  });
});
