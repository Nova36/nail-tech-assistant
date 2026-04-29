/**
 * b3-pinterest-pin-grid — /pinterest/[boardId] page integration tests
 *
 * Uses React Testing Library + vitest (jsdom environment).
 * Tests the rendered output of `app/(authenticated)/pinterest/[boardId]/page.tsx`
 * (an async server component) by awaiting the JSX it returns and rendering
 * that element — the pattern for testing async RSC with RTL, mirroring b2.
 *
 * Next.js 15 dynamic route params are async Promises; we pass
 * `params: Promise.resolve({ boardId: '...' })` to the Page component.
 *
 * `notFound()` testing: next/navigation is mocked to throw a sentinel error,
 * and `not-found.tsx` is imported separately to verify copy. Two distinct
 * assertions — notFound called + not-found heading renders.
 *
 * IntersectionObserver mock: jsdom does not implement IO. We install a
 * controllable class-based mock via vi.stubGlobal so tests can trigger
 * intersection events explicitly. Installed inline (no shared setup file
 * needed — inline-per-file is the convention).
 *
 * ACs covered:
 *   AC-1-skeleton-streams              (skeleton before pin titles)
 *   AC-5-io-append                     (sentinel triggers loadMorePins)
 *   AC-6-io-stop                       (null nextBookmark stops sentinel)
 *   AC-7-io-dedupe                     (rapid double-intersection → exactly one call)
 *   AC-8-pin-image-fallback            (PinCard media variant fallback chain)
 *   AC-9-not-found                     (notFound() called → not-found.tsx renders)
 *   AC-10-data-component-attrs         (data-component on all major components)
 *   AC-11-aria-live-busy               (aria-live + aria-busy toggles)
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
interface PinterestPin {
  id: string;
  title?: string;
  alt_text?: string;
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

// ─── Mock modules ──────────────────────────────────────────────────────────
const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoardPins = vi.fn();
const mockLoadMorePins = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoards: vi.fn(),
  listPinterestBoardPins: mockListPinterestBoardPins,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMoreBoards: vi.fn(),
  loadMorePins: mockLoadMorePins,
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────
const BOARD_ID = 'board-test-123';

const STUB_PIN_1: PinterestPin = {
  id: 'pin-1',
  title: 'Gel Chrome Mauve',
  media: {
    images: {
      '600x': {
        url: 'https://i.pinimg.com/600x/pin1.jpg',
        width: 600,
        height: 900,
      },
    },
  },
};
const STUB_PIN_2: PinterestPin = {
  id: 'pin-2',
  title: 'French Tip Ombre',
  media: {
    images: {
      '600x': {
        url: 'https://i.pinimg.com/600x/pin2.jpg',
        width: 600,
        height: 900,
      },
    },
  },
};
const STUB_PIN_3: PinterestPin = {
  id: 'pin-3',
  title: 'Nail Art Swirl',
  media: {
    images: {
      '600x': {
        url: 'https://i.pinimg.com/600x/pin3.jpg',
        width: 600,
        height: 900,
      },
    },
  },
};

// ─── Setup ─────────────────────────────────────────────────────────────────
beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  vi.stubGlobal('__NEXT_DATA__', { props: {} });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  _lastIOCallback = null;
});

// ─── Helpers ───────────────────────────────────────────────────────────────
/**
 * Render the board detail page component for a given boardId.
 * Next.js 15 dynamic params are async Promises.
 */
async function renderDetailPage(
  boardId: string = BOARD_ID
): Promise<ReturnType<typeof render>> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — page.tsx does not exist yet (TDD red); import fails at runtime, as expected
  // prettier-ignore
  const { default: Page } = await import('../../../app/(authenticated)/pinterest/[boardId]/page');
  const params = Promise.resolve({ boardId });
  const element = await (
    Page as (props: {
      params: Promise<{ boardId: string }>;
    }) => Promise<React.ReactElement>
  )({ params });
  return render(element);
}

// ─── Test suites ───────────────────────────────────────────────────────────

describe('/pinterest/[boardId] page — skeleton-streams (AC-1)', () => {
  it('renders PinGridSkeleton with aria-busy="true" before any pin title appears', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    // listPinterestBoardPins never resolves → Suspense stays in fallback state
    mockListPinterestBoardPins.mockReturnValue(new Promise(() => {}));

    await renderDetailPage();

    // Skeleton must be present and aria-busy
    const skeleton = document.querySelector(
      '[data-component="PinGridSkeleton"]'
    );
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute('aria-busy')).toBe('true');

    // Pin titles must NOT be visible yet
    expect(screen.queryByText('Gel Chrome Mauve')).toBeNull();
    expect(screen.queryByText('French Tip Ombre')).toBeNull();
  });
});

describe('/pinterest/[boardId] page — not_found branch (AC-9)', () => {
  it('calls notFound() when listPinterestBoardPins returns not_found', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: false,
      reason: 'not_found',
    });

    // renderDetailPage will throw NEXT_NOT_FOUND when notFound() is called
    await expect(renderDetailPage('bogus-board-id')).rejects.toThrow(
      'NEXT_NOT_FOUND'
    );
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('not-found.tsx renders BoardNotFound data-component and back link', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — not-found.tsx does not exist yet (TDD red)
    // prettier-ignore
    const { default: NotFound } = await import('../../../app/(authenticated)/pinterest/not-found');
    const element = React.createElement(NotFound);
    render(element);

    // Back link to /pinterest must be present
    const backLink = document.querySelector('a[href="/pinterest"]');
    expect(backLink).toBeTruthy();

    // BoardNotFound data-component
    expect(
      document.querySelector('[data-component="BoardNotFound"]')
    ).toBeTruthy();
  });
});

describe('/pinterest/[boardId] page — IntersectionObserver append (AC-5)', () => {
  it('calls loadMorePins with boardId + initial bookmark when sentinel intersects', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1, STUB_PIN_2],
      nextBookmark: 'bookmark-pins-page-2',
    });
    mockLoadMorePins.mockResolvedValue({
      items: [STUB_PIN_3],
      nextBookmark: null,
    });

    await renderDetailPage();

    // Wait for pins to render
    await waitFor(() => {
      expect(
        screen.queryByText('Gel Chrome Mauve') ??
          screen.queryByText(/Gel Chrome Mauve/)
      ).toBeTruthy();
    });

    // Trigger sentinel intersection
    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(mockLoadMorePins).toHaveBeenCalledOnce();
      expect(mockLoadMorePins).toHaveBeenCalledWith(
        BOARD_ID,
        'bookmark-pins-page-2'
      );
    });
  });

  it('appended pins appear in the DOM after loadMorePins resolves', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: 'bookmark-pins-page-2',
    });
    mockLoadMorePins.mockResolvedValue({
      items: [STUB_PIN_3],
      nextBookmark: null,
    });

    await renderDetailPage();

    await waitFor(() => screen.queryByText('Gel Chrome Mauve'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(
        screen.queryByText('Nail Art Swirl') ??
          screen.queryByText(/Nail Art Swirl/)
      ).toBeTruthy();
    });
  });
});

describe('/pinterest/[boardId] page — sentinel stops on null bookmark (AC-6)', () => {
  it('does not call loadMorePins again after nextBookmark is null', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: 'last-pin-bookmark',
    });
    mockLoadMorePins.mockResolvedValue({
      items: [STUB_PIN_2],
      nextBookmark: null,
    });

    await renderDetailPage();
    await waitFor(() => screen.queryByText('Gel Chrome Mauve'));

    // First intersection triggers the load
    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(mockLoadMorePins).toHaveBeenCalledOnce();
    });

    // Second intersection — sentinel must be disabled now
    await act(async () => {
      triggerIntersect(true);
    });

    // Still only called once
    expect(mockLoadMorePins).toHaveBeenCalledOnce();
  });
});

describe('/pinterest/[boardId] page — IO dedupe (AC-7)', () => {
  it('calls loadMorePins exactly once on rapid double-intersection for same bookmark', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: 'bookmark-pins-page-2',
    });

    // Use a deferred promise so the action is still in-flight during second intersection
    let resolveLoad!: (val: {
      items: PinterestPin[];
      nextBookmark: null;
    }) => void;
    const loadPromise = new Promise<{
      items: PinterestPin[];
      nextBookmark: null;
    }>((res) => {
      resolveLoad = res;
    });
    mockLoadMorePins.mockReturnValue(loadPromise);

    await renderDetailPage();
    await waitFor(() => screen.queryByText('Gel Chrome Mauve'));

    // Trigger two intersections in rapid succession (same event loop tick)
    await act(async () => {
      triggerIntersect(true);
      triggerIntersect(true);
    });

    // Resolve the action
    resolveLoad({ items: [], nextBookmark: null });
    await waitFor(() => expect(mockLoadMorePins).toHaveBeenCalled());

    // Must have been called exactly once despite two intersections
    expect(mockLoadMorePins).toHaveBeenCalledOnce();
  });
});

describe('/pinterest/[boardId] page — PinCard cover image fallback (AC-8)', () => {
  it('renders PinCard placeholder when media has no images at all', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — PinCard does not exist yet (TDD red)
    // prettier-ignore
    const { PinCard } = await import('../../../components/pinterest/PinCard');
    const pinNoMedia: PinterestPin = {
      id: 'pin-no-media',
      title: 'No Media Pin',
    };
    const { container } = render(
      React.createElement(PinCard, { pin: pinNoMedia })
    );
    // Should render a placeholder — either data-uri src or a fallback element
    // No image with a real pinimg.com URL should appear
    const img = container.querySelector('img');
    if (img) {
      // If an img is rendered it must NOT be a broken pinimg.com URL
      const src = img.getAttribute('src') ?? '';
      expect(src).not.toContain('i.pinimg.com');
    }
    // PinCard data-component must be present
    expect(container.querySelector('[data-component="PinCard"]')).toBeTruthy();
  });

  it('renders PinCard with "150x150" src when only that variant is present', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — PinCard does not exist yet (TDD red)
    // prettier-ignore
    const { PinCard } = await import('../../../components/pinterest/PinCard');
    const pin150: PinterestPin = {
      id: 'pin-150',
      title: '150 Only',
      media: {
        images: {
          '150x150': {
            url: 'https://i.pinimg.com/150x150/only.jpg',
            width: 150,
            height: 150,
          },
        },
      },
    };
    const { container } = render(React.createElement(PinCard, { pin: pin150 }));
    const img = container.querySelector('img');
    // Some form of image should render; the URL (or src attribute) should reference the 150x150 image
    expect(img).toBeTruthy();
    const src = img?.getAttribute('src') ?? '';
    // next/image may encode the URL; check decoded or partial match
    expect(src).toMatch(/150x150|only\.jpg/);
  });

  it('renders PinCard with "600x" src when that variant is present', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — PinCard does not exist yet (TDD red)
    // prettier-ignore
    const { PinCard } = await import('../../../components/pinterest/PinCard');
    const pin600: PinterestPin = {
      id: 'pin-600',
      title: '600x Present',
      media: {
        images: {
          '600x': {
            url: 'https://i.pinimg.com/600x/preferred.jpg',
            width: 600,
            height: 900,
          },
          '150x150': {
            url: 'https://i.pinimg.com/150x150/fallback.jpg',
            width: 150,
            height: 150,
          },
        },
      },
    };
    const { container } = render(React.createElement(PinCard, { pin: pin600 }));
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    const src = img?.getAttribute('src') ?? '';
    // 600x should be preferred over 150x150
    expect(src).toMatch(/600x|preferred\.jpg/);
    expect(src).not.toMatch(/150x150|fallback\.jpg/);
  });
});

describe('/pinterest/[boardId] page — aria-live + aria-busy (AC-11)', () => {
  it('PinGrid section has aria-live="polite" after grid resolves', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: null,
    });

    await renderDetailPage();

    await waitFor(() => {
      const grid = document.querySelector('[data-component="PinGrid"]');
      expect(grid).toBeTruthy();
      expect(grid?.getAttribute('aria-live')).toBe('polite');
    });
  });
});

describe('/pinterest/[boardId] page — data-component attributes (AC-10)', () => {
  it('renders PinGrid data-component attribute on the grid section', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: null,
    });

    await renderDetailPage();

    await waitFor(() => {
      expect(document.querySelector('[data-component="PinGrid"]')).toBeTruthy();
    });
  });

  it('renders PinCard data-component attribute on each card', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1, STUB_PIN_2],
      nextBookmark: null,
    });

    await renderDetailPage();

    await waitFor(() => {
      const cards = document.querySelectorAll('[data-component="PinCard"]');
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('renders InfiniteScrollSentinel data-component attribute when bookmark is non-null', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: 'pin-bookmark-xyz',
    });

    await renderDetailPage();

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InfiniteScrollSentinel"]')
      ).toBeTruthy();
    });
  });

  it('renders BoardDetailHeader data-component attribute', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [STUB_PIN_1],
      nextBookmark: null,
    });

    await renderDetailPage();

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="BoardDetailHeader"]')
      ).toBeTruthy();
    });
  });
});
