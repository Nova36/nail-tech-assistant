/**
 * b5 — /pinterest empty-state integration test
 *
 * Mocks listPinterestBoards to return `{ ok: true, items: [], nextBookmark: null }`
 * and asserts EmptyBoardsState renders instead of an empty BoardGrid.
 *
 * AC covered:
 *   AC-1 (b5) — zero-boards explicit empty-state UI (NOT blank grid)
 *   role='status' aria-live='polite' per ADDENDUM.md + _a11y-spec.md §2 b5
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoards = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoards: mockListPinterestBoards,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMoreBoards: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage(): Promise<ReturnType<typeof render>> {
  const { default: Page } =
    await import('../../../app/(authenticated)/pinterest/page');
  const element = await (Page as () => Promise<React.ReactElement>)();
  return render(element);
}

describe('/pinterest — zero boards (b5 AC-1)', () => {
  it('renders EmptyBoardsState with role=status aria-live=polite when items=[]', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage();

    const empty = await screen
      .findByTestId('EmptyBoardsState')
      .catch(() => null);
    const byComponent = document.querySelector(
      '[data-component="EmptyBoardsState"]'
    );
    const target = (empty ?? byComponent) as HTMLElement | null;

    expect(target).toBeTruthy();
    expect(target?.getAttribute('role')).toBe('status');
    expect(target?.getAttribute('aria-live')).toBe('polite');
  });

  it('shows the "No boards yet." heading copy from the addendum', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage();

    const heading = await screen.findByText(/No boards yet\.?/i);
    expect(heading).toBeTruthy();
  });

  it('does NOT render BoardGrid when items=[]', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [],
      nextBookmark: null,
    });

    await renderPage();

    expect(document.querySelector('[data-component="BoardGrid"]')).toBeNull();
  });

  it('still renders BoardGrid when items.length > 0 (no regression to b2)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({ ok: true });
    mockListPinterestBoards.mockResolvedValue({
      ok: true,
      items: [{ id: 'b1', name: 'Some Board' }],
      nextBookmark: null,
    });

    await renderPage();

    const grid = await new Promise<Element | null>((resolve) => {
      const t = setInterval(() => {
        const el = document.querySelector('[data-component="BoardGrid"]');
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
      document.querySelector('[data-component="EmptyBoardsState"]')
    ).toBeNull();
  });
});
