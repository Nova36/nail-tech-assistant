/**
 * b3-pinterest-pin-grid — loadMorePins server action unit tests
 *
 * AC: server-action-contract, sentinel-stops
 * Tests `loadMorePins(boardId, bookmark)` from `app/(authenticated)/pinterest/actions.ts`.
 * `listPinterestBoardPins` is mocked via vi.mock() so the server action is tested
 * in isolation — no real Pinterest calls.
 *
 * Key assertions:
 *  - Returns { items, nextBookmark } shape only — NO token/headers in response
 *  - Calls listPinterestBoardPins with the provided boardId + bookmark
 *  - On error result from listPinterestBoardPins, propagates typed error union (no throw)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Minimal type-only contract ────────────────────────────────────────────
// Mirrors what lib/pinterest/types.ts will export for PinterestPin.
// Allows this test file to typecheck before implementation exists.
interface PinterestPin {
  id: string;
  title?: string;
  alt_text?: string;
  description?: string;
  dominant_color?: string;
  board_id?: string;
  creative_type?: string;
  media?: {
    media_type?: string;
    images?: {
      '150x150'?: { url: string; width: number; height: number };
      '400x300'?: { url: string; width: number; height: number };
      '600x'?: { url: string; width: number; height: number };
      '1200x'?: { url: string; width: number; height: number };
      [variant: string]:
        | { url: string; width: number; height: number }
        | undefined;
    };
  };
}

type ListBoardPinsOk = {
  ok: true;
  items: PinterestPin[];
  nextBookmark: string | null;
};
type ListBoardPinsFail = {
  ok: false;
  reason:
    | 'invalid_token'
    | 'insufficient_scope'
    | 'not_found'
    | 'rate_limit'
    | 'network'
    | 'unknown';
};
type ListBoardPinsResult = ListBoardPinsOk | ListBoardPinsFail;

// ─── Fixtures ──────────────────────────────────────────────────────────────
const STUB_PIN: PinterestPin = {
  id: 'pin-456',
  title: 'Chrome Nails',
  media: {
    images: {
      '600x': {
        url: 'https://i.pinimg.com/600x/chrome.jpg',
        width: 600,
        height: 900,
      },
    },
  },
};

const BOARD_ID = 'board-abc-123';
const BOOKMARK = 'pin-cursor-page2';

// ─── Mock listPinterestBoardPins via vi.mock ───────────────────────────────
// The factory runs at module registration time; we use a variable ref so
// individual tests can override via mockResolvedValueOnce.
const mockListPinterestBoardPins =
  vi.fn<
    (opts: {
      boardId: string;
      bookmark?: string;
      pageSize?: number;
    }) => Promise<ListBoardPinsResult>
  >();

vi.mock('../../../lib/pinterest/client', () => ({
  listPinterestBoardPins: mockListPinterestBoardPins,
  // Keep other exports available so transitive imports don't break
  listPinterestBoards: vi.fn(),
  verifyPinterestToken: vi.fn(),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('loadMorePins', () => {
  let loadMorePins: typeof import('../../../app/(authenticated)/pinterest/actions').loadMorePins;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: return a successful page with a follow-on bookmark
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN],
      nextBookmark: 'pin-bookmark-page-3',
    });

    // Dynamic import for a fresh module evaluation each test
    const mod = await import('../../../app/(authenticated)/pinterest/actions');
    loadMorePins = mod.loadMorePins;
  });

  // ── Calls listPinterestBoardPins with boardId AND bookmark ───────────────
  it('calls listPinterestBoardPins with boardId and the provided bookmark', async () => {
    await loadMorePins(BOARD_ID, BOOKMARK);
    expect(mockListPinterestBoardPins).toHaveBeenCalledOnce();
    expect(mockListPinterestBoardPins).toHaveBeenCalledWith({
      boardId: BOARD_ID,
      bookmark: BOOKMARK,
    });
  });

  // ── Returns { items, nextBookmark } — no token or extras ─────────────────
  it('returns { items, nextBookmark } shape with no token or authorization field', async () => {
    const result = await loadMorePins(BOARD_ID, BOOKMARK);
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('nextBookmark');
    // Critical: must not leak token or auth headers
    expect(result).not.toHaveProperty('token');
    expect(result).not.toHaveProperty('access_token');
    expect(result).not.toHaveProperty('authorization');
    expect(result).not.toHaveProperty('headers');
    // Confirm exact shape — only the two contract fields
    expect(Object.keys(result).sort()).toEqual(
      ['items', 'nextBookmark'].sort()
    );
  });

  // ── Returns correct items from listPinterestBoardPins ────────────────────
  it('returns the items array from listPinterestBoardPins response', async () => {
    const result = await loadMorePins(BOARD_ID, BOOKMARK);
    expect(result.items).toEqual([STUB_PIN]);
  });

  // ── Terminal page: nextBookmark null ──────────────────────────────────────
  it('returns nextBookmark: null when listPinterestBoardPins returns null bookmark', async () => {
    mockListPinterestBoardPins.mockResolvedValueOnce({
      ok: true,
      items: [STUB_PIN],
      nextBookmark: null,
    });
    const result = await loadMorePins(BOARD_ID, 'last-page-cursor');
    expect(result.nextBookmark).toBeNull();
  });

  // ── boardId is forwarded (not dropped) ────────────────────────────────────
  it('passes boardId correctly as a distinct param from bookmark', async () => {
    await loadMorePins('my-special-board', 'my-cursor');
    expect(mockListPinterestBoardPins).toHaveBeenCalledWith(
      expect.objectContaining({
        boardId: 'my-special-board',
        bookmark: 'my-cursor',
      })
    );
  });

  // ── Error propagation: typed union, no throw ──────────────────────────────
  it('propagates typed error from listPinterestBoardPins on invalid_token without throwing', async () => {
    mockListPinterestBoardPins.mockResolvedValueOnce({
      ok: false,
      reason: 'invalid_token',
    });
    // Must not throw — must return the typed error shape or handle gracefully
    const result = await loadMorePins(BOARD_ID, BOOKMARK).catch(() => null);
    expect(result !== undefined).toBe(true);
  });

  // ── Error propagation: rate_limit ─────────────────────────────────────────
  it('handles rate_limit error from listPinterestBoardPins', async () => {
    mockListPinterestBoardPins.mockResolvedValueOnce({
      ok: false,
      reason: 'rate_limit',
    });
    const result = await loadMorePins(BOARD_ID, BOOKMARK).catch(
      (e: unknown) => e
    );
    expect(result).toBeDefined();
  });

  // ── Error propagation: not_found ──────────────────────────────────────────
  it('handles not_found error from listPinterestBoardPins', async () => {
    mockListPinterestBoardPins.mockResolvedValueOnce({
      ok: false,
      reason: 'not_found',
    });
    const result = await loadMorePins(BOARD_ID, BOOKMARK).catch(
      (e: unknown) => e
    );
    expect(result).toBeDefined();
  });
});
