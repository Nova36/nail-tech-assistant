/**
 * b4-pinterest-token-remediation-views — /pinterest/[boardId] page, 401 branch
 *
 * TDD-red: asserts TokenInvalidView renders when verifyPinterestToken returns
 * { ok: false, reason: 'invalid_token' } on the board detail route.
 * Fails until codex implements the token gate on [boardId]/page.tsx.
 *
 * ACs covered:
 *   AC-2-token-invalid-view       (TokenInvalidView renders on 401)
 *   AC-4-verify-before-fetch      (listPinterestBoardPins never called on fail)
 *   MAJOR-1                       (error.tsx not triggered)
 *   MAJOR-2                       (TokenInvalidView is distinct component)
 */
import { render, screen } from '@testing-library/react';
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

// ─── IntersectionObserver mock (inline per-file convention) ────────────────
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  takeRecords = vi.fn((): IntersectionObserverEntry[] => []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(cb: IntersectionObserverCallback) {
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
  }
}

// ─── Mock modules ──────────────────────────────────────────────────────────
const mockVerifyPinterestToken = vi.fn();
const mockListPinterestBoardPins = vi.fn();
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
  loadMorePins: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

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
});

// ─── Helper ────────────────────────────────────────────────────────────────
async function renderDetailPage(
  boardId = 'test-board-1'
): Promise<ReturnType<typeof render>> {
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

// ─── Test suite ────────────────────────────────────────────────────────────

describe('/pinterest/[boardId] page — TokenInvalidView (AC-2, MAJOR-1, MAJOR-2)', () => {
  it('renders heading "Pinterest needs a fresh token"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(screen.getByText(/Pinterest needs a fresh token/i)).toBeTruthy();
  });

  it('renders data-component="TokenInvalidView"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(
      document.querySelector('[data-component="TokenInvalidView"]')
    ).toBeTruthy();
  });

  it('copy contains "Pinterest developer portal"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('Pinterest developer portal');
  });

  it('copy contains "My apps"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('My apps');
  });

  it('copy contains "Generate access token"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('Generate access token');
  });

  it('copy contains "Settings → Environment Variables"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('Settings → Environment Variables');
  });

  it('copy contains "PINTEREST_ACCESS_TOKEN"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('PINTEREST_ACCESS_TOKEN');
  });

  it('copy contains "redeploy"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('redeploy');
  });

  it('copy contains "Deployments tab"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderDetailPage();
    expect(container.textContent).toContain('Deployments tab');
  });

  it('does NOT render PinGrid', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(document.querySelector('[data-component="PinGrid"]')).toBeNull();
  });

  it('does NOT render PinGridSkeleton', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(
      document.querySelector('[data-component="PinGridSkeleton"]')
    ).toBeNull();
  });

  it('does NOT render error.tsx content (MAJOR-1 — no "Something went wrong")', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('renders anchor linking to Pinterest developer portal', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    const anchor = document.querySelector(
      'a[href="https://developers.pinterest.com/apps/"]'
    );
    expect(anchor).toBeTruthy();
  });

  it('never calls listPinterestBoardPins (AC-4)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(mockListPinterestBoardPins).not.toHaveBeenCalled();
  });

  it('never calls notFound (verify failed before pins fetch)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderDetailPage();

    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
