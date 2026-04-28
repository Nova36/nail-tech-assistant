/**
 * b2-pinterest-boards-grid — listPinterestBoards unit tests
 *
 * AC: server-action-contract
 * Tests `listPinterestBoards({ bookmark?, pageSize? })` extension to
 * `lib/pinterest/client.ts`. Follows the exact vi.stubEnv + vi.resetModules +
 * dynamic import pattern established by b1's client.test.ts.
 *
 * Does NOT hit real Pinterest.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Minimal type-only contract ────────────────────────────────────────────
// Mirrors what lib/pinterest/client.ts will export for listPinterestBoards.
// Allows this test file to typecheck before implementation exists.
interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  pin_count?: number;
  follower_count?: number;
  created_at?: string;
  board_pins_modified_at?: string;
  media?: Record<string, unknown>;
  owner?: { username?: string };
}

type ListBoardsOk = {
  ok: true;
  items: PinterestBoard[];
  nextBookmark: string | null;
};
type ListBoardsFail = {
  ok: false;
  reason:
    | 'invalid_token'
    | 'insufficient_scope'
    | 'not_found'
    | 'rate_limit'
    | 'network'
    | 'unknown';
};
type ListBoardsResult = ListBoardsOk | ListBoardsFail;

// ─── Constants ─────────────────────────────────────────────────────────────
const STUB_TOKEN = 'ptest_token_abc123';
const BOARDS_URL_BASE = 'https://api.pinterest.com/v5/boards';

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeMockResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body ?? {},
    text: async () => '',
  } as unknown as Response;
}

const STUB_BOARD: PinterestBoard = {
  id: 'board-123',
  name: 'Nail Inspo',
  pin_count: 42,
};

describe('listPinterestBoards', () => {
  let listPinterestBoards: (opts?: {
    bookmark?: string;
    pageSize?: number;
  }) => Promise<ListBoardsResult>;

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
      // Default: 200 with a page of boards
      return makeMockResponse(200, {
        items: [STUB_BOARD],
        bookmark: 'next-bookmark-xyz',
      });
    });
    vi.stubGlobal('fetch', mockFetch);

    // Dynamic import for fresh module evaluation per test
    const mod = await import('../../../lib/pinterest/client');
    listPinterestBoards = mod.listPinterestBoards;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // ── 200 with non-null bookmark ────────────────────────────────────────────
  it('returns { ok: true, items, nextBookmark } on 200 with non-null bookmark', async () => {
    const result = await listPinterestBoards();
    expect(result).toMatchObject({
      ok: true,
      items: [STUB_BOARD],
      nextBookmark: 'next-bookmark-xyz',
    });
  });

  // ── 200 with null bookmark (terminal page) ────────────────────────────────
  it('returns nextBookmark: null when API responds with null bookmark', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () =>
        makeMockResponse(200, {
          items: [STUB_BOARD],
          bookmark: null,
        })
    );
    const result = await listPinterestBoards();
    expect(result).toMatchObject({
      ok: true,
      items: [STUB_BOARD],
      nextBookmark: null,
    });
  });

  // ── URL construction: no bookmark (first request) ──────────────────────────
  it('omits bookmark param on first request when no bookmark provided', async () => {
    await listPinterestBoards({ pageSize: 25 });
    const url = capturedRequest?.url ?? '';
    expect(url).toContain(BOARDS_URL_BASE);
    expect(url).not.toContain('bookmark=');
    expect(url).toContain('page_size=25');
  });

  // ── URL construction: bookmark forwarded ──────────────────────────────────
  it('forwards bookmark as query param when provided', async () => {
    await listPinterestBoards({ bookmark: 'cursor-abc', pageSize: 25 });
    const url = capturedRequest?.url ?? '';
    expect(url).toContain('bookmark=cursor-abc');
    expect(url).toContain('page_size=25');
    expect(url).toMatch(/^https:\/\/api\.pinterest\.com\/v5\/boards/);
  });

  // ── Default pageSize ──────────────────────────────────────────────────────
  it('uses Pinterest default pageSize (25) when not explicitly provided', async () => {
    await listPinterestBoards();
    const url = capturedRequest?.url ?? '';
    // page_size=25 is the Pinterest API default
    expect(url).toContain('page_size=25');
  });

  // ── Bearer header ─────────────────────────────────────────────────────────
  it('sends Authorization: Bearer <token> header', async () => {
    await listPinterestBoards();
    const authHeader = capturedRequest?.headers.get('Authorization');
    expect(authHeader).toBe(`Bearer ${STUB_TOKEN}`);
  });

  // ── cache: 'no-store' posture (carry forward from b1) ────────────────────
  it('uses cache: "no-store" fetch posture', async () => {
    const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    mockFetch.mockImplementationOnce(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ input, init });
        return makeMockResponse(200, { items: [], bookmark: null });
      }
    );

    await listPinterestBoards();
    expect(calls.length).toBe(1);
    expect(calls[0].init?.cache ?? (calls[0].input as Request).cache).toBe(
      'no-store'
    );
  });

  // ── 401 → invalid_token (no throw) ───────────────────────────────────────
  it('returns { ok: false, reason: "invalid_token" } on 401', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(401)
    );
    const result = await listPinterestBoards();
    expect(result).toEqual({ ok: false, reason: 'invalid_token' });
  });

  // ── 403 → insufficient_scope ──────────────────────────────────────────────
  it('returns { ok: false, reason: "insufficient_scope" } on 403', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(403)
    );
    const result = await listPinterestBoards();
    expect(result).toEqual({ ok: false, reason: 'insufficient_scope' });
  });

  // ── 404 → not_found ──────────────────────────────────────────────────────
  it('returns { ok: false, reason: "not_found" } on 404', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(404)
    );
    const result = await listPinterestBoards();
    expect(result).toEqual({ ok: false, reason: 'not_found' });
  });

  // ── 429 → rate_limit ──────────────────────────────────────────────────────
  it('returns { ok: false, reason: "rate_limit" } on 429', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => makeMockResponse(429)
    );
    const result = await listPinterestBoards();
    if (result.ok === false) {
      expect(result.reason).toBe('rate_limit');
    } else {
      throw new Error('Expected ok: false for 429');
    }
  });

  // ── Network reject → network (no throw) ───────────────────────────────────
  it('returns { ok: false, reason: "network" } on fetch rejection without throwing', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => {
        throw new TypeError('Failed to fetch');
      }
    );
    const result = await listPinterestBoards();
    expect(result).toEqual({ ok: false, reason: 'network' });
  });
});
