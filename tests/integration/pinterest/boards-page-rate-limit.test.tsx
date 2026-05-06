/**
 * b5 — /pinterest inline retryable browse-error test (rate_limit)
 *
 * Boards initially render. Sentinel triggers loadMoreBoards which throws
 * Error with cause: { reason: 'rate_limit' }. BoardGrid catches, decides
 * inline (rate_limit/network/unknown), renders InlineBrowseError at the
 * grid bottom — items above stay intact. Retry click invokes the same
 * handler with the same bookmark; on success, items append and error
 * clears.
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
const mockListPinterestBoards = vi.fn();
const mockLoadMoreBoards = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoards: mockListPinterestBoards,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMoreBoards: mockLoadMoreBoards,
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

async function renderPage(): Promise<ReturnType<typeof render>> {
  const { default: Page } =
    await import('../../../app/(authenticated)/pinterest/page');
  const element = await (Page as () => Promise<React.ReactElement>)();
  return render(element);
}

describe('/pinterest — inline retryable browse error on rate_limit (b5 AC-3, AC-4)', () => {
  it('renders InlineBrowseError at grid bottom when loadMoreBoards throws rate_limit', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [
        { id: 'board-1', name: 'Gel Inspo' },
        { id: 'board-2', name: 'Nail Art' },
      ],
      nextBookmark: 'page-2',
    });

    const rateLimitError = new Error(
      'Failed to load Pinterest boards: rate_limit',
      { cause: { reason: 'rate_limit' } }
    );
    mockLoadMoreBoards.mockRejectedValueOnce(rateLimitError);

    await renderPage();

    await waitFor(() => {
      expect(screen.queryByText('Gel Inspo')).toBeTruthy();
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

  it('keeps existing items in the DOM when inline error renders (no list-state loss)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [
        { id: 'board-1', name: 'Gel Inspo' },
        { id: 'board-2', name: 'Nail Art' },
      ],
      nextBookmark: 'page-2',
    });

    mockLoadMoreBoards.mockRejectedValueOnce(
      new Error('rate_limit', { cause: { reason: 'rate_limit' } })
    );

    await renderPage();

    await waitFor(() => screen.queryByText('Gel Inspo'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InlineBrowseError"]')
      ).toBeTruthy();
    });

    expect(screen.queryByText('Gel Inspo')).toBeTruthy();
    expect(screen.queryByText('Nail Art')).toBeTruthy();
  });

  it('retry button invokes loadMoreBoards with the same bookmark', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [{ id: 'board-1', name: 'Gel Inspo' }],
      nextBookmark: 'page-2',
    });

    mockLoadMoreBoards
      .mockRejectedValueOnce(
        new Error('rate_limit', { cause: { reason: 'rate_limit' } })
      )
      .mockResolvedValueOnce({
        items: [{ id: 'board-3', name: 'Spring 2026' }],
        nextBookmark: null,
      });

    await renderPage();

    await waitFor(() => screen.queryByText('Gel Inspo'));

    await act(async () => {
      triggerIntersect(true);
    });

    await waitFor(() => {
      expect(
        document.querySelector('[data-component="InlineBrowseError"]')
      ).toBeTruthy();
    });

    const retryBtn = await screen.findByRole('button', { name: /try again/i });

    await act(async () => {
      fireEvent.click(retryBtn);
    });

    await waitFor(() => {
      expect(mockLoadMoreBoards).toHaveBeenCalledTimes(2);
    });
    expect(mockLoadMoreBoards).toHaveBeenNthCalledWith(1, 'page-2');
    expect(mockLoadMoreBoards).toHaveBeenNthCalledWith(2, 'page-2');

    await waitFor(() => {
      expect(screen.queryByText('Spring 2026')).toBeTruthy();
    });

    expect(screen.queryByText('Gel Inspo')).toBeTruthy();
    expect(
      document.querySelector('[data-component="InlineBrowseError"]')
    ).toBeNull();
  });

  it('does NOT render InlineBrowseError when error reason is invalid_token (bubble to error.tsx)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [{ id: 'board-1', name: 'Gel Inspo' }],
      nextBookmark: 'page-2',
    });

    mockLoadMoreBoards.mockRejectedValueOnce(
      new Error('invalid_token', { cause: { reason: 'invalid_token' } })
    );

    // SUT re-throws on invalid_token so it bubbles to error.tsx in prod;
    // in jsdom this surfaces as unhandledRejection with no error boundary.
    // Swallow only this specific reason to keep the test deterministic.
    const swallowInvalidToken = (reason: unknown) => {
      const cause = (reason as { cause?: { reason?: string } } | undefined)
        ?.cause;
      if (cause?.reason !== 'invalid_token') throw reason;
    };
    process.on('unhandledRejection', swallowInvalidToken);

    await renderPage();

    await waitFor(() => screen.queryByText('Gel Inspo'));

    const originalError = console.error;
    console.error = vi.fn();

    try {
      await act(async () => {
        try {
          triggerIntersect(true);
        } catch {
          // Bubble path: handler re-throws on invalid_token; we expect it.
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
    } finally {
      console.error = originalError;
      process.off('unhandledRejection', swallowInvalidToken);
    }

    expect(
      document.querySelector('[data-component="InlineBrowseError"]')
    ).toBeNull();
  });
});
