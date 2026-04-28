/**
 * b2-pinterest-boards-grid — /pinterest page integration tests
 *
 * Uses React Testing Library + vitest (jsdom environment).
 * Tests the rendered output of `app/(authenticated)/pinterest/page.tsx`
 * (an async server component) by awaiting the JSX it returns and rendering
 * that element — the pattern for testing async RSC with RTL.
 *
 * IntersectionObserver mock: jsdom does not implement IO. We install a
 * controllable class-based mock via vi.stubGlobal so tests can trigger
 * intersection events explicitly. Installed inline here (no shared setup
 * file needed — only one integration test consumer).
 *
 * ACs covered:
 *   AC-1-skeleton-streams          (skeleton before board names)
 *   AC-2-401-minimal-placeholder   (invalid_token branch)
 *   AC-3-403-minimal-placeholder   (insufficient_scope branch)
 *   AC-4-verify-before-fetch       (listPinterestBoards never called on fail)
 *   AC-5-io-append                 (sentinel triggers loadMoreBoards)
 *   AC-6-io-stop                   (null nextBookmark stops sentinel)
 *   AC-7-io-dedupe                 (rapid double-intersection → exactly one call)
 *   AC-8-card-link-href            (BoardCard href = /pinterest/[boardId])
 *   AC-9-data-component-attrs      (data-component on all major components)
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';
// Note: @testing-library/jest-dom not installed; using native vitest matchers + DOM queries

// ─── IntersectionObserver mock ─────────────────────────────────────────────
// jsdom does not implement IntersectionObserver. We capture the callback so
// individual tests can trigger intersections manually.
type IOCallback = IntersectionObserverCallback;
let _lastIOCallback: IOCallback | null = null;

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  constructor(cb: IOCallback) {
    _lastIOCallback = cb;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}

/** Helper: trigger the sentinel intersection with `isIntersecting: true` */
function triggerIntersect(isIntersecting = true): void {
  if (!_lastIOCallback) return;
  _lastIOCallback(
    [
      {
        isIntersecting,
        target: document.createElement('div'),
      } as unknown as IntersectionObserverEntry,
    ],
    {} as IntersectionObserver
  );
}

// ─── Minimal type-only contracts ───────────────────────────────────────────
interface PinterestBoard {
  id: string;
  name: string;
  pin_count?: number;
  privacy?: string;
  description?: string;
  media?: Record<string, unknown>;
  owner?: { username?: string };
}

// ─── Mock modules ──────────────────────────────────────────────────────────
// We mock the client functions so page.tsx never calls real Pinterest.
const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoards = vi.fn();
const mockLoadMoreBoards = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoards: mockListPinterestBoards,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMoreBoards: mockLoadMoreBoards,
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────
const STUB_BOARD_1: PinterestBoard = {
  id: 'board-1',
  name: 'Gel Inspo',
  pin_count: 12,
};
const STUB_BOARD_2: PinterestBoard = {
  id: 'board-2',
  name: 'Nail Art',
  pin_count: 8,
};
const STUB_BOARD_3: PinterestBoard = {
  id: 'board-3',
  name: 'Spring 2026',
  pin_count: 21,
};

// ─── Setup ─────────────────────────────────────────────────────────────────
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  // Next.js Link requires a router context in tests; stub push/prefetch
  vi.stubGlobal('__NEXT_DATA__', { props: {} });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  _lastIOCallback = null;
});

// ─── Helper: render the page component ────────────────────────────────────
// page.tsx is an async server component. RTL cannot render async components
// directly, so we await the component call to get the JSX element, then render.
async function renderPage(): Promise<ReturnType<typeof render>> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — page.tsx does not exist yet (TDD red); import fails at runtime, as expected
  const { default: Page } =
    await import('../../../app/(authenticated)/pinterest/page');
  // Await the async server component to get the JSX tree
  const element = await (Page as () => Promise<React.ReactElement>)();
  return render(element);
}

// ─── Test suites ───────────────────────────────────────────────────────────

describe('/pinterest page — skeleton-streams (AC-1)', () => {
  it('renders BoardGridSkeleton with aria-busy="true" before any board name text', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    // listPinterestBoards never resolves → Suspense stays in fallback state
    mockListPinterestBoards.mockReturnValue(new Promise(() => {}));

    await renderPage();

    // Skeleton must be present and aria-busy
    const skeleton = document.querySelector(
      '[data-component="BoardGridSkeleton"]'
    );
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');

    // Board names must NOT be visible yet
    expect(screen.queryByText('Gel Inspo')).toBeNull();
    expect(screen.queryByText('Nail Art')).toBeNull();
  });
});

describe('/pinterest page — 401 placeholder (AC-2, AC-4)', () => {
  it('renders minimal 401 placeholder and never calls listPinterestBoards', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    // 401 copy visible (from design brief)
    expect(
      screen.getByText(
        /Pinterest token needs replacement|token needs to be replaced|PINTEREST_ACCESS_TOKEN/i
      )
    ).toBeTruthy();

    // listPinterestBoards must not have been called
    expect(mockListPinterestBoards).not.toHaveBeenCalled();

    // Skeleton must NOT render
    expect(
      document.querySelector('[data-component="BoardGridSkeleton"]')
    ).toBeNull();
  });
});

describe('/pinterest page — 403 placeholder (AC-3, AC-4)', () => {
  it('renders minimal 403 placeholder distinct from 401 and never calls listPinterestBoards', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    // 403 copy visible (from design brief — distinct from 401)
    expect(
      screen.getByText(/broader access|needs broader|boards:read|insufficient/i)
    ).toBeTruthy();

    // listPinterestBoards must not have been called
    expect(mockListPinterestBoards).not.toHaveBeenCalled();

    // Skeleton must NOT render
    expect(
      document.querySelector('[data-component="BoardGridSkeleton"]')
    ).toBeNull();
  });

  it('renders DIFFERENT copy for 403 vs 401', async () => {
    // Render 401 first
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container: container401 } = await renderPage();
    const text401 = container401.textContent ?? '';

    vi.clearAllMocks();

    // Render 403
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container: container403 } = await renderPage();
    const text403 = container403.textContent ?? '';

    expect(text401).not.toBe(text403);
  });
});

describe('/pinterest page — IntersectionObserver append (AC-5)', () => {
  it('calls loadMoreBoards with the initial bookmark when sentinel intersects', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1, STUB_BOARD_2],
      nextBookmark: 'bookmark-page-2',
    });
    mockLoadMoreBoards.mockResolvedValue({
      items: [STUB_BOARD_3],
      nextBookmark: null,
    });

    await renderPage();

    // Wait for boards to render
    await waitFor(() => {
      expect(
        screen.queryByText('Gel Inspo') ?? screen.queryByText(/Gel Inspo/)
      ).toBeTruthy();
    });

    // Trigger sentinel intersection
    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(mockLoadMoreBoards).toHaveBeenCalledOnce();
      expect(mockLoadMoreBoards).toHaveBeenCalledWith('bookmark-page-2');
    });
  });

  it('appended items appear in the DOM after loadMoreBoards resolves', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1],
      nextBookmark: 'bookmark-page-2',
    });
    mockLoadMoreBoards.mockResolvedValue({
      items: [STUB_BOARD_3],
      nextBookmark: null,
    });

    await renderPage();

    await waitFor(() => screen.queryByText('Gel Inspo'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(
        screen.queryByText('Spring 2026') ?? screen.queryByText(/Spring 2026/)
      ).toBeTruthy();
    });
  });
});

describe('/pinterest page — sentinel stops on null bookmark (AC-6)', () => {
  it('does not call loadMoreBoards again after nextBookmark is null', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1],
      nextBookmark: 'last-bookmark',
    });
    mockLoadMoreBoards.mockResolvedValue({
      items: [STUB_BOARD_2],
      nextBookmark: null,
    });

    await renderPage();
    await waitFor(() => screen.queryByText('Gel Inspo'));

    // First intersection triggers the load
    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(mockLoadMoreBoards).toHaveBeenCalledOnce();
    });

    // Second intersection — sentinel must be disabled now
    await act(async () => {
      triggerIntersect(true);
    });

    // Still only called once
    expect(mockLoadMoreBoards).toHaveBeenCalledOnce();
  });
});

describe('/pinterest page — IO dedupe (AC-7)', () => {
  it('calls loadMoreBoards exactly once on rapid double-intersection for the same bookmark', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1],
      nextBookmark: 'bookmark-page-2',
    });
    // Use a deferred promise so the action is still in-flight during second intersection
    let resolveLoad!: (val: {
      items: PinterestBoard[];
      nextBookmark: null;
    }) => void;
    const loadPromise = new Promise<{
      items: PinterestBoard[];
      nextBookmark: null;
    }>((res) => {
      resolveLoad = res;
    });
    mockLoadMoreBoards.mockReturnValue(loadPromise);

    await renderPage();
    await waitFor(() => screen.queryByText('Gel Inspo'));

    // Trigger two intersections in rapid succession (same event loop tick)
    await act(async () => {
      triggerIntersect(true);
      triggerIntersect(true);
    });

    // Resolve the action
    resolveLoad({ items: [], nextBookmark: null });
    await waitFor(() => expect(mockLoadMoreBoards).toHaveBeenCalled());

    // Must have been called exactly once despite two intersections
    expect(mockLoadMoreBoards).toHaveBeenCalledOnce();
  });
});

describe('/pinterest page — BoardCard link href (AC-8)', () => {
  it('renders a BoardCard link with href=/pinterest/[boardId] for each board', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1, STUB_BOARD_2],
      nextBookmark: null,
    });

    await renderPage();

    await waitFor(() => {
      const links = document.querySelectorAll(
        'a[href="/pinterest/board-1"], a[href="/pinterest/board-2"]'
      );
      expect(links.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe('/pinterest page — data-component attributes (AC-9)', () => {
  it('renders BoardGrid data-component attribute on the grid section', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1],
      nextBookmark: null,
    });

    await renderPage();

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="BoardGrid"]')
      ).toBeTruthy();
    });
  });

  it('renders BoardCard data-component attribute on each card', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1, STUB_BOARD_2],
      nextBookmark: null,
    });

    await renderPage();

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-component="BoardCard"]');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders InfiniteScrollSentinel data-component attribute', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [STUB_BOARD_1],
      nextBookmark: 'bookmark-xyz',
    });

    await renderPage();

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InfiniteScrollSentinel"]')
      ).toBeTruthy();
    });
  });
});
