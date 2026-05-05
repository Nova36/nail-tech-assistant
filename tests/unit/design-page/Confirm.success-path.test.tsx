/**
 * d5 TDD — Confirm.tsx success-branch integration
 *
 * The success branch replaces <GenerationPreview> with <NailVisualizer> +
 * <ShapeSelector> wired to PATCH /api/designs/[id]/shape.
 *
 * These tests are RED until d5 implement step rewires Confirm.tsx.
 *
 * Per reference_jsdom_formdata_node_env.md: jsdom env is fine here (no
 * FormData multipart). Fetch is stubbed via vi.stubGlobal.
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

// ── Module mocks (must come before component import) ───────────────────────

// Mock next/navigation so useRouter doesn't blow up in jsdom
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock the design actions (generateDesign server action)
const mockGenerateDesign = vi.fn();
vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: mockGenerateDesign,
}));

// ── Fetch stub ─────────────────────────────────────────────────────────────

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Fixtures ───────────────────────────────────────────────────────────────

const DESIGN_ID = 'design-confirm-d5-test';
const IMAGE_URL = 'https://storage.example.com/gen/abc.jpg';
const PROMPT_TEXT = 'red glitter';

// Props that put Confirm into success state immediately:
// latestGenerationId non-null → idle phase on mount, then we push success.
// Simpler: pass no latestGenerationId so Confirm fires generateDesign on mount,
// and we resolve mockGenerateDesign → success.

async function renderConfirmSuccess(nailShape = 'almond') {
  const { Confirm } =
    await import('@/app/(authenticated)/design/[designId]/Confirm');

  mockGenerateDesign.mockResolvedValue({
    status: 'success',
    generationId: 'gen-abc',
    imageUrl: IMAGE_URL,
  });

  const result = render(
    <Confirm
      designId={DESIGN_ID}
      nailShape={nailShape}
      promptText={PROMPT_TEXT}
      latestGenerationId={null}
    />
  );

  // Wait for the success branch to render
  await waitFor(() => {
    expect(screen.queryByTestId('nail-visualizer')).toBeTruthy();
  });

  return result;
}

// ── AC #1: success branch renders NailVisualizer + ShapeSelector ───────────

describe('AC#1 — success branch renders NailVisualizer + ShapeSelector', () => {
  it('renders NailVisualizer (data-testid="nail-visualizer") on success', async () => {
    await renderConfirmSuccess('almond');
    expect(screen.getByTestId('nail-visualizer')).toBeTruthy();
  });

  it.skip('renders ShapeSelector (data-testid="shape-selector") on success', async () => {
    // Removed: shape is now selected only in WizardStep2Direction (initial
    // prompt step). Result page is read-only; no shape selector or live remask.
    await renderConfirmSuccess('almond');
    expect(screen.getByTestId('shape-selector')).toBeTruthy();
  });

  it('does NOT render GenerationPreview on success', async () => {
    await renderConfirmSuccess('almond');
    expect(screen.queryByTestId('generation-preview')).toBeNull();
  });

  it('still shows prompt text "red glitter" on success (no regression)', async () => {
    await renderConfirmSuccess('almond');
    expect(screen.getByText(/red glitter/i)).toBeTruthy();
  });
});

// ── AC #2: shape selection triggers PATCH /api/designs/[id]/shape ──────────

// Skipped: shape selector removed from result page; shape is committed
// during WizardStep2Direction and not editable post-generation.
describe.skip('AC#2 — shape selection PATCHes /api/designs/[id]/shape', () => {
  it('clicking a shape pill sends PATCH with { nailShape }', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'updated', nailShape: 'coffin' }), {
        status: 200,
      })
    );

    await renderConfirmSuccess('almond');

    const coffinBtn = screen.getByRole('button', { name: /coffin/i });
    await act(async () => {
      fireEvent.click(coffinBtn);
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        `/api/designs/${DESIGN_ID}/shape`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.stringContaining('"coffin"'),
        })
      );
    });
  });

  it('does NOT call /api/designs/[id]/regenerate when switching shape', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'updated', nailShape: 'square' }), {
        status: 200,
      })
    );

    await renderConfirmSuccess('almond');

    const squareBtn = screen.getByRole('button', { name: /square/i });
    await act(async () => {
      fireEvent.click(squareBtn);
    });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const regenerateCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes('/regenerate')
    );
    expect(regenerateCalls).toHaveLength(0);
  });
});

// ── AC #3: PATCH 200 → new shape committed ────────────────────────────────

describe.skip('AC#3 — PATCH 200 → UI commits to new shape', () => {
  it('shape pill remains selected (aria-pressed=true) after successful PATCH', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'updated', nailShape: 'round' }), {
        status: 200,
      })
    );

    await renderConfirmSuccess('almond');

    const roundBtn = screen.getByRole('button', { name: /^round$/i });
    await act(async () => {
      fireEvent.click(roundBtn);
    });

    await waitFor(() => {
      expect(roundBtn.getAttribute('aria-pressed')).toBe('true');
    });
  });
});

// ── AC #4: PATCH failure → revert + controlled error message ──────────────

describe.skip('AC#4 — PATCH failure reverts shape and shows error', () => {
  it('reverts to previous shape when PATCH returns 404', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
    );

    await renderConfirmSuccess('almond');

    const almondBtn = screen.getByRole('button', { name: /^almond$/i });
    expect(almondBtn.getAttribute('aria-pressed')).toBe('true');

    const coffinBtn = screen.getByRole('button', { name: /^coffin$/i });
    await act(async () => {
      fireEvent.click(coffinBtn);
    });

    await waitFor(() => {
      expect(almondBtn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  it('surfaces a controlled error message on PATCH 500', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'server_error' }), { status: 500 })
    );

    await renderConfirmSuccess('almond');

    const stilettoBtn = screen.getByRole('button', { name: /^stiletto$/i });
    await act(async () => {
      fireEvent.click(stilettoBtn);
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/shape update failed/i) ??
          screen.queryByRole('alert')
      ).toBeTruthy();
    });
  });

  it('reverts shape on PATCH 403', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    );

    await renderConfirmSuccess('coffin');

    const ovalBtn = screen.getByRole('button', { name: /^oval$/i });
    await act(async () => {
      fireEvent.click(ovalBtn);
    });

    const coffinBtn = screen.getByRole('button', { name: /^coffin$/i });
    await waitFor(() => {
      expect(coffinBtn.getAttribute('aria-pressed')).toBe('true');
    });
  });
});

// ── e5: ChatRefinementPanel mounts in success branch ──────────────────────

describe('e5 — ChatRefinementPanel mounts alongside visualizer', () => {
  it('renders ChatRefinementPanel empty state when initialChatTurns is empty', async () => {
    const { Confirm } =
      await import('@/app/(authenticated)/design/[designId]/Confirm');

    mockGenerateDesign.mockResolvedValue({
      status: 'success',
      generationId: 'gen-abc',
      imageUrl: IMAGE_URL,
    });

    render(
      <Confirm
        designId={DESIGN_ID}
        nailShape="almond"
        promptText={PROMPT_TEXT}
        latestGenerationId={null}
        designName="Soft Lavender French"
        initialChatTurns={[]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('nail-visualizer')).toBeTruthy();
    });

    expect(
      screen.getByText(/nudge this design with a quick message/i)
    ).toBeTruthy();
  });

  it('renders chat turn list when initialChatTurns has turns', async () => {
    const turns = [
      {
        id: 't1',
        message: 'first turn',
        status: 'success' as const,
        generationId: 'gen-t1',
        imageUrl: 'https://example.com/t1.jpg',
        createdAt: '2026-05-05T00:00:01Z',
      },
      {
        id: 't2',
        message: 'second turn',
        status: 'success' as const,
        generationId: 'gen-t2',
        imageUrl: 'https://example.com/t2.jpg',
        createdAt: '2026-05-05T00:00:02Z',
      },
    ];

    const { Confirm } =
      await import('@/app/(authenticated)/design/[designId]/Confirm');

    mockGenerateDesign.mockResolvedValue({
      status: 'success',
      generationId: 'gen-abc',
      imageUrl: IMAGE_URL,
    });

    render(
      <Confirm
        designId={DESIGN_ID}
        nailShape="almond"
        promptText={PROMPT_TEXT}
        latestGenerationId={null}
        designName="x"
        initialChatTurns={turns}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('nail-visualizer')).toBeTruthy();
    });

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBe(2);
    expect(items[0]).toHaveTextContent('first turn');
  });

  it('keeps RegenerateButton in the success branch (P0 fallback preserved)', async () => {
    await renderConfirmSuccess('almond');
    // RegenerateButton renders a button with /regenerate/i name in some
    // existing variant; assert at least one regenerate-y button persists.
    const regenerateButton = screen.queryByRole('button', {
      name: /regenerate/i,
    });
    expect(regenerateButton).not.toBeNull();
  });

  it('clicking a non-current chat turn updates visualizer image to that turn', async () => {
    const turns = [
      {
        id: 't1',
        message: 'first',
        status: 'success' as const,
        generationId: 'gen-t1',
        imageUrl: 'https://example.com/turn1-image.jpg',
        createdAt: '2026-05-05T00:00:01Z',
      },
      {
        id: 't2',
        message: 'second',
        status: 'success' as const,
        generationId: 'gen-t2',
        imageUrl: 'https://example.com/turn2-image.jpg',
        createdAt: '2026-05-05T00:00:02Z',
      },
    ];

    const { Confirm } =
      await import('@/app/(authenticated)/design/[designId]/Confirm');

    mockGenerateDesign.mockResolvedValue({
      status: 'success',
      generationId: 'gen-abc',
      imageUrl: IMAGE_URL,
    });

    const { container } = render(
      <Confirm
        designId={DESIGN_ID}
        nailShape="almond"
        promptText={PROMPT_TEXT}
        latestGenerationId={null}
        designName="x"
        initialChatTurns={turns}
      />
    );

    await waitFor(() => {
      expect(screen.queryByTestId('nail-visualizer')).toBeTruthy();
    });

    const items = screen.getAllByRole('listitem');
    fireEvent.click(items[0]); // turn 1 (not the latest)

    await waitFor(() => {
      const img = container.querySelector(
        '[data-testid="nail-visualizer"] img'
      );
      expect(img?.getAttribute('src')).toBe(
        'https://example.com/turn1-image.jpg'
      );
    });
  });
});

// ── Negative: generateDesign never fires on shape switch ──────────────────

describe.skip('Negative — generateDesign not triggered by shape switch', () => {
  it('generateDesign is called exactly once on mount, never again on shape click', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ status: 'updated', nailShape: 'oval' }), {
        status: 200,
      })
    );

    await renderConfirmSuccess('almond');

    // Exactly one call on mount
    expect(mockGenerateDesign).toHaveBeenCalledTimes(1);

    const ovalBtn = screen.getByRole('button', { name: /^oval$/i });
    await act(async () => {
      fireEvent.click(ovalBtn);
    });

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    // generateDesign must not have fired again
    expect(mockGenerateDesign).toHaveBeenCalledTimes(1);
  });
});
