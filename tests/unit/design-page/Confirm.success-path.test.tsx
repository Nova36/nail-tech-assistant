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
