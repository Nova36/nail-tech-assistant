/**
 * b4-pinterest-token-remediation-views — /pinterest page, 403 insufficient_scope branch
 *
 * TDD-red: asserts InsufficientScopeView renders when verifyPinterestToken returns
 * { ok: false, reason: 'insufficient_scope' }. Fails until codex implements the
 * token gate + InsufficientScopeView component.
 *
 * ACs covered:
 *   AC-3-insufficient-scope-view  (InsufficientScopeView renders on 403)
 *   AC-4-verify-before-fetch      (listPinterestBoards never called on fail)
 *   MAJOR-1                       (error.tsx not triggered)
 *   MAJOR-2                       (InsufficientScopeView distinct from TokenInvalidView)
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

describe('/pinterest page — InsufficientScopeView (AC-3, MAJOR-1, MAJOR-2)', () => {
  it('renders heading "Pinterest needs broader access"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    expect(screen.getByText(/Pinterest needs broader access/i)).toBeTruthy();
  });

  it('renders data-component="InsufficientScopeView"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    expect(
      document.querySelector('[data-component="InsufficientScopeView"]')
    ).toBeTruthy();
  });

  it('copy contains "broader access"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('broader access');
  });

  it('copy contains "missing the read permissions"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('missing the read permissions');
  });

  it('copy contains "select read access for boards AND read access for pins"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain(
      'select read access for boards AND read access for pins'
    );
  });

  it('copy contains "Settings → Environment Variables"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('Settings → Environment Variables');
  });

  it('copy contains "PINTEREST_ACCESS_TOKEN"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('PINTEREST_ACCESS_TOKEN');
  });

  it('copy contains "redeploy"', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container } = await renderPage();
    expect(container.textContent).toContain('redeploy');
  });

  it('copy is DISTINCT from tokenInvalidCopy (MAJOR-2)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'invalid_token',
    });
    const { container: container401 } = await renderPage();
    const text401 = container401.textContent ?? '';

    vi.clearAllMocks();

    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });
    const { container: container403 } = await renderPage();
    const text403 = container403.textContent ?? '';

    expect(text401).not.toBe(text403);
  });

  it('does NOT render error.tsx content (MAJOR-1 — no "Something went wrong")', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    expect(screen.queryByText(/Something went wrong/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Try again/i })).toBeNull();
  });

  it('does NOT render TokenInvalidView (MAJOR-2)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    expect(
      document.querySelector('[data-component="TokenInvalidView"]')
    ).toBeNull();
  });

  it('never calls listPinterestBoards (AC-4)', async () => {
    mockVerifyPinterestToken.mockResolvedValue({
      ok: false,
      reason: 'insufficient_scope',
    });

    await renderPage();

    expect(mockListPinterestBoards).not.toHaveBeenCalled();
  });
});
