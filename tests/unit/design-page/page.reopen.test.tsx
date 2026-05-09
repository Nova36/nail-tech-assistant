/**
 * d6 TDD — /design/[designId] page server-component reopen hydration.
 *
 * Tests that the page server component, given a DesignDetail prop, renders
 * Confirm with the correct restored state. Also covers the not-found path.
 *
 * Per reference_jsdom_formdata_node_env.md: jsdom env is correct here (no
 * FormData multipart; we render a server component shallowly).
 *
 * The page.tsx calls Firebase Admin SDK and next/headers; both are mocked
 * below so these run in jsdom without an emulator.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Module mocks — must come before component imports ──────────────────────

const mockNotFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

// Mock getSessionForServerAction — page.tsx uses this
const mockGetSession = vi.fn();
vi.mock('@/lib/firebase/session', () => ({
  getSessionForServerAction: mockGetSession,
  getSession: mockGetSession,
}));

// Mock createServerFirebaseAdmin so firebase-admin doesn't init
vi.mock('@/lib/firebase/server', () => ({
  createServerFirebaseAdmin: vi.fn(() => ({})),
}));

// Mock firebase-admin/firestore — page.tsx imports getFirestore but with
// loadDesignDetail mocked the actual db chain is never called.
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

// Mock @/lib/firestore/converters — page.tsx imports designConverter
vi.mock('@/lib/firestore/converters', () => ({
  designConverter: {},
  referenceConverter: {},
  generationConverter: {},
}));

// Mock loadDesignDetail — page.tsx delegates to it. Tests set return value
// per-case via mockLoadDesignDetail.mockResolvedValue(...).
const mockLoadDesignDetail = vi.fn();
vi.mock('@/lib/designs/load', () => ({
  loadDesignDetail: mockLoadDesignDetail,
}));

// Mock resolveImageUrl — pass-through; not load-bearing for prop assertions.
vi.mock('@/lib/designs/imageUrl', () => ({
  resolveImageUrl: vi.fn((path: string | null) =>
    Promise.resolve(path ? `https://example.com/${path}` : null)
  ),
}));

// Mock Confirm so we can assert its props without rendering the full client component
const mockConfirm = vi.fn();
vi.mock('@/app/(authenticated)/design/[designId]/Confirm', () => ({
  Confirm: (props: unknown) => {
    mockConfirm(props);
    return <div data-testid="confirm-mock" />;
  },
}));

// Mock design/actions to prevent pinterest token load
vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: vi.fn(),
  selectPinterestPin: vi.fn(),
  createDesign: vi.fn(),
}));

// e5: page hydrates initialChatTurns via loadDesignChatTurns
const mockLoadChatTurns = vi.fn();
vi.mock('@/lib/designs/loadChatTurns', () => ({
  loadDesignChatTurns: mockLoadChatTurns,
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const ALICE_UID = 'alice-reopen-uid';
const DESIGN_ID = 'design-reopen-test';

const aliceDesign = {
  id: DESIGN_ID,
  userId: ALICE_UID,
  name: 'My floral design',
  primaryReferenceId: 'ref-primary',
  secondaryReferenceIds: ['ref-secondary-1'],
  promptText: 'soft watercolor florals',
  nailShape: 'oval',
  latestGenerationId: 'gen-existing',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-01T00:00:00Z',
};

function makeDesignDetail(design: typeof aliceDesign | null) {
  if (design === null) return null;
  return {
    design,
    references: {
      primary: { id: 'ref-primary', userId: design.userId },
      secondary: [{ id: 'ref-secondary-1', userId: design.userId }],
      staleReferenceCount: 0,
    },
    latestGeneration: design.latestGenerationId
      ? {
          id: design.latestGenerationId,
          status: 'success',
          imageUrl: 'https://example.com/gen.png',
          createdAt: design.createdAt,
        }
      : null,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function renderPage(designId = DESIGN_ID) {
  const { default: DesignDetailPage } =
    await import('@/app/(authenticated)/design/[designId]/page');
  // Server components are async; call the function + await the JSX, then
  // render the synchronous result via React Testing Library.
  const element = await DesignDetailPage({
    params: Promise.resolve({ designId }),
  });
  return render(element);
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  mockConfirm.mockClear();
  mockLoadDesignDetail.mockReset();
  mockGetSession.mockReset();
  mockLoadChatTurns.mockReset();
  mockLoadChatTurns.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('d6 — page reopen: Confirm receives restored state', () => {
  it('passes designId down to Confirm', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await renderPage(DESIGN_ID);

    const calls = mockConfirm.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0][0] as Record<string, unknown>;
    expect(props.designId).toBe(DESIGN_ID);
  });

  it('passes promptText from design to Confirm', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await renderPage(DESIGN_ID);

    const props = mockConfirm.mock.calls[0][0] as Record<string, unknown>;
    expect(props.promptText).toBe('soft watercolor florals');
  });

  it('passes nailShape from design to Confirm', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await renderPage(DESIGN_ID);

    const props = mockConfirm.mock.calls[0][0] as Record<string, unknown>;
    expect(props.nailShape).toBe('oval');
  });

  it('passes latestGenerationId → Confirm enters idle phase (not pending)', async () => {
    // latestGenerationId non-null → Confirm initializes to idle (not pending)
    // per Confirm.tsx line: latestGenerationId ? { phase: 'idle' } : { phase: 'pending' }
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await renderPage(DESIGN_ID);

    const props = mockConfirm.mock.calls[0][0] as Record<string, unknown>;
    expect(props.latestGenerationId).toBe('gen-existing');
  });

  it('Confirm mock renders into the DOM', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await renderPage(DESIGN_ID);

    expect(screen.getByTestId('confirm-mock')).toBeTruthy();
  });
});

describe('d6 — page reopen: not-found path', () => {
  it('throws NEXT_NOT_FOUND (or redirects) when design does not exist', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(null);

    await expect(renderPage('missing-design')).rejects.toThrow();
  });

  it('throws NEXT_NOT_FOUND (or redirects) when design belongs to another user', async () => {
    mockGetSession.mockResolvedValue({
      uid: 'other-uid',
      email: 'other@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await expect(renderPage(DESIGN_ID)).rejects.toThrow();
  });

  it('throws (redirect) when user is unauthenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));

    await expect(renderPage(DESIGN_ID)).rejects.toThrow();
  });
});

describe('e5 — page reopen: chat turn hydration into Confirm', () => {
  const turns = [
    {
      id: 't1',
      message: 'first',
      status: 'success' as const,
      generationId: 'gen-t1',
      imageUrl: 'https://example.com/t1.jpg',
      createdAt: '2026-05-05T00:00:01Z',
    },
    {
      id: 't2',
      message: 'second',
      status: 'success' as const,
      generationId: 'gen-t2',
      imageUrl: 'https://example.com/t2.jpg',
      createdAt: '2026-05-05T00:00:02Z',
    },
  ];

  it('passes initialChatTurns from loadDesignChatTurns to Confirm', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));
    mockLoadChatTurns.mockResolvedValue(turns);

    await renderPage(DESIGN_ID);

    expect(mockLoadChatTurns).toHaveBeenCalledWith({
      designId: DESIGN_ID,
      userId: ALICE_UID,
    });
    const props = mockConfirm.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.initialChatTurns).toEqual(turns);
  });

  it('passes designName from design to Confirm', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));
    mockLoadChatTurns.mockResolvedValue([]);

    await renderPage(DESIGN_ID);

    const props = mockConfirm.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.designName).toBe('My floral design');
  });

  it('renders page even when loadDesignChatTurns rejects (no throw bubbles)', async () => {
    mockGetSession.mockResolvedValue({
      uid: ALICE_UID,
      email: 'alice@test.com',
      name: null,
    });
    mockLoadDesignDetail.mockResolvedValue(makeDesignDetail(aliceDesign));
    mockLoadChatTurns.mockRejectedValue(new Error('boom'));

    await renderPage(DESIGN_ID);

    const props = mockConfirm.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.initialChatTurns).toEqual([]);
  });
});
