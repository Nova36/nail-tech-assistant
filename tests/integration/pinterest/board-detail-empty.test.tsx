/**
 * b5 — /pinterest/[boardId] empty-state integration test
 *
 * Mocks listPinterestBoardPins to return `{ ok: true, items: [], nextBookmark: null }`
 * and asserts EmptyPinsState renders instead of an empty PinGrid.
 *
 * AC covered:
 *   AC-2 (b5) — zero-pins explicit empty-state UI for a specific board
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoardPins = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoardPins: mockListPinterestBoardPins,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMorePins: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
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

describe('/pinterest/[boardId] — zero pins (b5 AC-2)', () => {
  it('renders EmptyPinsState with role=status aria-live=polite when items=[]', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage('gel-inspo');

    const target = document.querySelector(
      '[data-component="EmptyPinsState"]'
    ) as HTMLElement | null;

    expect(target).toBeTruthy();
    expect(target?.getAttribute('role')).toBe('status');
    expect(target?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows the "This board is empty." heading copy from the addendum', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage('gel-inspo');

    const heading = await screen.findByText(/This board is empty\.?/i);
    expect(heading).toBeTruthy();
  });

  it('does NOT render PinGrid when items=[]', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage('gel-inspo');

    expect(document.querySelector('[data-component="PinGrid"]')).toBeNull();
  });

  it('still renders PinGrid when items.length > 0 (no regression to b3)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoardPins.mockResolvedValue({
      ok: true,
      items: [
        {
          id: 'pin-1',
          board_id: 'gel-inspo',
          link: null,
          title: 'A pin',
          description: null,
          dominant_color: null,
          alt_text: null,
          media: { images: { '600x': { url: 'x', width: 600, height: 600 } } },
        },
      ],
      nextBookmark: null,
    });

    await renderPage('gel-inspo');

    const grid = await new Promise<Element | null>((resolve) => {
      const t = setInterval(() => {
        const el = document.querySelector('[data-component="PinGrid"]');
        if (el) {
          clearInterval(t);
          resolve(el);
        }
      }, 5);
      setTimeout(() => {
        clearInterval(t);
        resolve(null);
      }, 1000);
    });

    expect(grid).toBeTruthy();
    expect(
      document.querySelector('[data-component="EmptyPinsState"]')
    ).toBeNull();
  });
});
