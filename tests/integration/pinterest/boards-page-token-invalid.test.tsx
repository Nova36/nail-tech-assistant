/**
 * b4-pinterest-token-remediation-views — /pinterest page, 401 invalid_token branch
 *
 * TDD-red: asserts TokenInvalidView renders when verifyPinterestToken returns
 * { ok: false, reason: 'invalid_token' }. These tests FAIL until codex implements
 * the token gate + TokenInvalidView component.
 *
 * ACs covered:
 *   AC-2-token-invalid-view       (TokenInvalidView renders on 401)
 *   AC-4-verify-before-fetch      (listPinterestBoards never called on fail)
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
const mockListPinterestBoards = vi.fn();

vi.mock('../../../lib/pinterest/client', () => ({
  verifyPinterestToken: mockVerifyPinterestToken,
  listPinterestBoards: mockListPinterestBoards,
}));

vi.mock('../../../app/(authenticated)/pinterest/actions', () => ({
  loadMoreBoards: vi.fn(),
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
async function renderPage(): Promise<ReturnType<typeof render>> {
  const { default: Page } =
    await import('../../../app/(authenticated)/pinterest/page');
  const element = await (Page as () => Promise<React.ReactElement>)();
  return render(element);
}

// ─── Test suite ────────────────────────────────────────────────────────────

describe('/pinterest page — TokenInvalidView (AC-2, MAJOR-1, MAJOR-2)', () => {
  it('renders heading "Pinterest needs a fresh token"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(screen.getByText(/Pinterest needs a fresh token/i)).toBeTruthy();
  });

  it('renders data-component="TokenInvalidView"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(
      document.querySelector('[data-component="TokenInvalidView"]')
    ).toBeTruthy();
  });

  it('copy contains "Pinterest developer portal"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('Pinterest developer portal');
  });

  it('copy contains "My apps"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('My apps');
  });

  it('copy contains "Generate access token"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('Generate access token');
  });

  it('copy contains "Settings → Environment Variables"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('Settings → Environment Variables');
  });

  it('copy contains "PINTEREST_ACCESS_TOKEN"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('PINTEREST_ACCESS_TOKEN');
  });

  it('copy contains "redeploy"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('redeploy');
  });

  it('copy contains "Deployments tab"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('Deployments tab');
  });

  it('does NOT render BoardGrid', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(document.querySelector('[data-component="BoardGrid"]')).toBeNull();
  });

  it('does NOT render BoardGridSkeleton', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(
      document.querySelector('[data-component="BoardGridSkeleton"]')
    ).toBeNull();
  });

  it('does NOT render error.tsx content (MAJOR-1 — no "Something went wrong")', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('renders anchor linking to Pinterest developer portal', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    const anchor = document.querySelector(
      'a[href="https://developers.pinterest.com/apps/"]'
    );
    expect(anchor).toBeTruthy();
  });

  it('never calls listPinterestBoards (AC-4)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });

    await renderPage();

    expect(mockListPinterestBoards).not.toHaveBeenCalled();
  });
});
