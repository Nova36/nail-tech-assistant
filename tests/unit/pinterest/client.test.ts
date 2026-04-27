/**
 * b1-pinterest-client-token-boundary — verifyPinterestToken unit tests
 *
 * AC-1: valid token returns { ok: true }
 * AC-2: 401 → { ok: false, reason: 'invalid_token' } without throw
 * AC-3: 403 → { ok: false, reason: 'insufficient_scope' } distinct from 401
 * AC-4: network failure → { ok: false, reason: 'network' } without throw
 * Plus fetch-posture assertions (Bearer header, cache:'no-store', URL)
 *
 * Uses vi.fn() to mock global fetch — does NOT hit real Pinterest.
 * Token stub: 'ptest_token_abc123' (established fixture; avoids `pina_` in source)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Minimal type-only contract ────────────────────────────────────────────
// These types mirror what lib/pinterest/client.ts will export.
// They allow this test file to typecheck without implementation existing.
type VerifyOk = { ok: true };
type VerifyFail = {
  ok: false;
  reason: 'invalid_token' | 'insufficient_scope' | 'network';
};
type VerifyResult = VerifyOk | VerifyFail;

// ─── Constants ─────────────────────────────────────────────────────────────
const PINTEREST_API_URL = 'https://api.pinterest.com/v5/user_account';
const STUB_TOKEN = 'ptest_token_abc123';

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeMockResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => '',
  } as unknown as Response;
}

describe('verifyPinterestToken', () => {
  let verifyPinterestToken: () => Promise<VerifyResult>;
  let capturedRequest: Request | undefined;

  beforeEach(async () => {
    vi.resetModules();
    capturedRequest = undefined;

    // Stub environment so lib/env hydrates successfully
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
    vi.stubEnv('PINTEREST_ACCESS_TOKEN', STUB_TOKEN);

    // Mock global fetch BEFORE importing the module under test
    const mockFetch = vi.fn(async (input: RequestInfo | URL) => {
      const req = input instanceof Request ? input : new Request(String(input));
      capturedRequest = req;
      // Default: 200 OK — individual tests override via mockImplementationOnce
      return makeMockResponse(200);
    });
    vi.stubGlobal('fetch', mockFetch);

    // Dynamic import so each test gets a fresh module evaluation
    const mod = await import('../../../lib/pinterest/client');
    verifyPinterestToken = mod.verifyPinterestToken;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── AC-1: valid token returns { ok: true } ──────────────────────────────
  it('returns { ok: true } on 200', async () => {
    const result = await verifyPinterestToken();
    expect(result).toEqual({ ok: true });
  });

  // ── AC-2: 401 → invalid_token (no throw) ────────────────────────────────
  it('returns { ok: false, reason: "invalid_token" } on 401', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(401)
    );
    const result = await verifyPinterestToken();
    expect(result).toEqual({ ok: false, reason: 'invalid_token' });
  });

  // ── AC-3: 403 → insufficient_scope (distinct from 401) ──────────────────
  it('returns { ok: false, reason: "insufficient_scope" } on 403', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(403)
    );
    const result = await verifyPinterestToken();
    expect(result).toEqual({ ok: false, reason: 'insufficient_scope' });
  });

  it('returns different reasons for 401 vs 403', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;

    mockFetch.mockImplementationOnce(async () => makeMockResponse(401));
    const result401 = await verifyPinterestToken();

    mockFetch.mockImplementationOnce(async () => makeMockResponse(403));
    const result403 = await verifyPinterestToken();

    expect(result401).toEqual({ ok: false, reason: 'invalid_token' });
    expect(result403).toEqual({ ok: false, reason: 'insufficient_scope' });
    expect((result401 as VerifyFail).reason).not.toBe(
      (result403 as VerifyFail).reason
    );
  });

  // ── AC-4: network failure → network (no throw) ───────────────────────────
  it('returns { ok: false, reason: "network" } on fetch rejection (no throw)', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => {
        throw new TypeError('Failed to fetch');
      }
    );
    const result = await verifyPinterestToken();
    expect(result).toEqual({ ok: false, reason: 'network' });
  });

  // ── Fetch posture: Bearer header ─────────────────────────────────────────
  it('sends Authorization: Bearer <token> header', async () => {
    await verifyPinterestToken();
    const authHeader = capturedRequest?.headers.get('Authorization');
    expect(authHeader).toBe(`Bearer ${STUB_TOKEN}`);
  });

  // ── Fetch posture: cache:'no-store' ──────────────────────────────────────
  it('uses cache: "no-store" fetch posture', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    mockFetch.mockImplementationOnce(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init });
        return makeMockResponse(200);
      }
    );

    await verifyPinterestToken();
    expect(calls.length).toBe(1);
    expect(calls[0].init?.cache ?? (calls[0].input as Request).cache).toBe(
      'no-store'
    );
  });

  // ── Fetch posture: correct URL ────────────────────────────────────────────
  it('calls the correct Pinterest API URL', async () => {
    await verifyPinterestToken();
    const url = capturedRequest?.url ?? '';
    expect(url).toBe(PINTEREST_API_URL);
  });
});
