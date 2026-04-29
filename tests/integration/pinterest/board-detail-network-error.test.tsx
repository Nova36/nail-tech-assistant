/**
 * b5 — /pinterest/[boardId] inline retryable browse-error test (network)
 *
 * Pins initially render. Sentinel triggers loadMorePins which throws
 * Error with cause: { reason: 'network' }. PinGrid catches, decides
 * inline (rate_limit/network/unknown), renders InlineBrowseError at the
 * grid bottom — items above stay intact. Retry click invokes the same
 * handler with the same bookmark; on success, items append.
 *
 * AC covered:
 *   AC-3 (b5) — inline retryable UI for rate_limit/network failures
 *   AC-4 (b5) — list state preserved across retry
 */
import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
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

const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoardPins = vi.fn();
const mockLoadMorePins = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoardPins: mockListPinterestBoardPins,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMorePins: mockLoadMorePins,
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  _lastIOCallback = null;
});

const PIN_FIXTURE = (id: string, title: string) => ({
  id,
  board_id: 'gel-inspo',
  link: null,
  title,
  description: null,
  dominant_color: null,
  alt_text: null,
  media: { images: { '600x': { url: `x-${id}`, width: 600, height: 600 } } },
});

async function renderPage(boardId: string): Promise<ReturnType<typeof render>> {
  const { default: Page } =
    await import('../../../app/(authenticated)/pinterest/[boardId]/page');
  const element = await (
    Page as (props: {
      params: Promise<{ boardId: string }>;
    }) => Promise<React.ReactElement>
  )({
    params: Promise.resolve({ boardId }),
  });
  return render(element);
}

describe('/pinterest/[boardId] — inline retryable browse error on network (b5 AC-3, AC-4)', () => {
  it('renders InlineBrowseError when loadMorePins throws network', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [PIN_FIXTURE('pin-1', 'First pin')],
      nextBookmark: 'page-2',
    });

    mockLoadMorePins.mockRejectedValueOnce(
      new Error('network', { cause: { reason: 'network' } })
    );

    await renderPage('gel-inspo');

    await waitFor(() => {
      expect(
        screen.queryByText('First pin') ??
          document.querySelector('[data-component="PinGrid"]')
      ).toBeTruthy();
    });

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      const target = document.querySelector(
        '[data-component="InlineBrowseError"]'
      );
      expect(target).toBeTruthy();
    });

    const target = document.querySelector(
      '[data-component="InlineBrowseError"]'
    );
    expect(target?.getAttribute('role')).toBe('alert');
  });

  it('keeps existing pins in the DOM when inline error renders', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [
        PIN_FIXTURE('pin-1', 'First pin'),
        PIN_FIXTURE('pin-2', 'Second pin'),
      ],
      nextBookmark: 'page-2',
    });

    mockLoadMorePins.mockRejectedValueOnce(
      new Error('network', { cause: { reason: 'network' } })
    );

    await renderPage('gel-inspo');

    await waitFor(() => document.querySelector('[data-component="PinGrid"]'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InlineBrowseError"]')
      ).toBeTruthy();
    });

    const grid = document.querySelector('[data-component="PinGrid"]');
    expect(grid).toBeTruthy();
    const items = grid?.querySelectorAll('li');
    expect(items?.length).toBeGreaterThanOrEqual(2);
  });

  it('retry button invokes loadMorePins with the same bookmark and clears the error on success', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [PIN_FIXTURE('pin-1', 'First pin')],
      nextBookmark: 'page-2',
    });

    mockLoadMorePins
      .mockRejectedValueOnce(
        new Error('network', { cause: { reason: 'network' } })
      )
      .mockResolvedValueOnce({
        items: [PIN_FIXTURE('pin-2', 'Second pin')],
        nextBookmark: null,
      });

    await renderPage('gel-inspo');

    await waitFor(() => document.querySelector('[data-component="PinGrid"]'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() =>
      document.querySelector('[data-component="InlineBrowseError"]')
    );

    const retryBtn = await screen.findByRole('button', { name: /try again/i });

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    await waitFor(() => {
      expect(mockLoadMorePins).toHaveBeenCalledTimes(2);
    });
    // First arg is boardId, second is bookmark
    expect(mockLoadMorePins).toHaveBeenNthCalledWith(1, 'gel-inspo', 'page-2');
    expect(mockLoadMorePins).toHaveBeenNthCalledWith(2, 'gel-inspo', 'page-2');

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InlineBrowseError"]')
      ).toBeNull();
    });
  });
});
