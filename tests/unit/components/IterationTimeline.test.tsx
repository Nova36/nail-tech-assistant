/**
 * e5 TDD — components/IterationTimeline.tsx
 *
 * 60×60 thumbnail strip pinned beneath the visualizer. One cell per turn,
 * chronological. Cell states: success | pending | failed. Active cell shows
 * Current (latest successful, viewingTurnIndex === null) OR Comparing (when
 * viewingTurnIndex matches that cell).
 *
 * RED until e5 implement step ships components/IterationTimeline.tsx.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import type { ChatTurnView } from '@/components/ChatRefinementPanel';

const TURN_BASE = {
  designId: 'design-1',
  message: 'turn message',
};

function makeTurn(
  overrides: Partial<ChatTurnView> & { id: string }
): ChatTurnView {
  return {
    message: TURN_BASE.message,
    status: 'success',
    generationId: `gen-${overrides.id}`,
    imageUrl: `https://example.com/${overrides.id}.jpg`,
    createdAt: '2026-05-05T00:00:00Z',
    ...overrides,
  } as ChatTurnView;
}

const TURNS_5: ChatTurnView[] = [
  makeTurn({ id: 't1', createdAt: '2026-05-05T00:00:01Z' }),
  makeTurn({ id: 't2', createdAt: '2026-05-05T00:00:02Z' }),
  makeTurn({
    id: 't3',
    status: 'failed',
    generationId: null,
    imageUrl: null,
    createdAt: '2026-05-05T00:00:03Z',
  }),
  makeTurn({ id: 't4', createdAt: '2026-05-05T00:00:04Z' }),
  makeTurn({ id: 't5', createdAt: '2026-05-05T00:00:05Z' }),
];

describe('IterationTimeline', () => {
  it('renders one cell per turn in chronological order', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveAttribute('data-turn-id', 't1');
    expect(tabs[4]).toHaveAttribute('data-turn-id', 't5');
  });

  it('uses tablist + tab semantics with aria-selected', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('tablist')).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    // Latest successful turn (t5, index 4) is the implicit "current" when
    // viewingTurnIndex === null. It carries aria-selected=true.
    expect(tabs[4]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('marks the latest successful turn as Current when viewingTurnIndex is null', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    // Cell 5 (latest successful) should display 'Current' micro-label.
    const tabs = screen.getAllByRole('tab');
    expect(tabs[4]).toHaveTextContent(/current/i);
    expect(tabs[3]).not.toHaveTextContent(/current/i);
  });

  it('marks the cell at viewingTurnIndex as Comparing', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={1}
        onTurnSelect={vi.fn()}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveTextContent(/comparing/i);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    // The default-current cell (latest successful) is NO LONGER current
    // when user is comparing.
    expect(tabs[4]).not.toHaveTextContent(/^current$/i);
  });

  it('renders failed cell with stripe + ! glyph (no thumbnail image)', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    const { container } = render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    const failedCell = container.querySelector('[data-turn-id="t3"]');
    expect(failedCell).toBeTruthy();
    expect(failedCell?.getAttribute('data-state')).toBe('failed');
    // No <img> in failed cell.
    expect(failedCell?.querySelector('img')).toBeNull();
    // ! glyph is present
    expect(failedCell?.textContent).toMatch(/!/);
  });

  it('renders pending cell with motion-safe stripe pattern (no thumbnail)', async () => {
    const turnsWithPending: ChatTurnView[] = [
      makeTurn({ id: 't1', createdAt: '2026-05-05T00:00:01Z' }),
      makeTurn({
        id: 't2',
        status: 'pending',
        generationId: null,
        imageUrl: null,
        createdAt: '2026-05-05T00:00:02Z',
      }),
    ];
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    const { container } = render(
      <IterationTimeline
        turns={turnsWithPending}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    const pendingCell = container.querySelector('[data-turn-id="t2"]');
    expect(pendingCell?.getAttribute('data-state')).toBe('pending');
    expect(pendingCell?.querySelector('img')).toBeNull();
  });

  it('clicking a non-active cell calls onTurnSelect with that turn', async () => {
    const onTurnSelect = vi.fn();
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={null}
        onTurnSelect={onTurnSelect}
      />
    );

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    expect(onTurnSelect).toHaveBeenCalledTimes(1);
    expect(onTurnSelect.mock.calls[0]?.[0]?.id).toBe('t2');
  });

  it('clicking the active (Current/Comparing) cell calls onTurnSelect(null) to revert', async () => {
    const onTurnSelect = vi.fn();
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    render(
      <IterationTimeline
        turns={TURNS_5}
        viewingTurnIndex={1}
        onTurnSelect={onTurnSelect}
      />
    );

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);
    expect(onTurnSelect).toHaveBeenCalledWith(null);
  });

  it('renders nothing when turns is empty', async () => {
    const { IterationTimeline } =
      await import('@/components/IterationTimeline');
    const { container } = render(
      <IterationTimeline
        turns={[]}
        viewingTurnIndex={null}
        onTurnSelect={vi.fn()}
      />
    );

    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });
});
