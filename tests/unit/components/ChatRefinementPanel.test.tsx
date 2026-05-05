/**
 * e5 TDD — components/ChatRefinementPanel.tsx
 *
 * Right-side drawer chat refinement panel. Lives next to the visualizer.
 * Manages turn list, system-message-retry block (collapsed-aggregate of
 * unresolved failed turns), and input state.
 *
 * RED until e5 implement step ships components/ChatRefinementPanel.tsx.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

type Status = 'pending' | 'success' | 'failed';

function turn(
  id: string,
  status: Status,
  message: string,
  createdAt: string,
  imageUrl: string | null = null
) {
  return {
    id,
    message,
    status,
    generationId: status === 'success' ? `gen-${id}` : null,
    imageUrl:
      status === 'success'
        ? (imageUrl ?? `https://example.com/${id}.jpg`)
        : null,
    createdAt,
  };
}

const DESIGN_ID = 'design-e5';

describe('ChatRefinementPanel', () => {
  it('renders empty state with example chips when no turns', async () => {
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="Soft Lavender French"
        initialChatTurns={[]}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    expect(
      screen.getByText(/nudge this design with a quick message/i)
    ).toBeTruthy();
    expect(screen.getByText(/make it more pastel/i)).toBeTruthy();
    expect(screen.getByText(/add gold accents/i)).toBeTruthy();
    expect(screen.getByText(/shorter, almond shape/i)).toBeTruthy();
  });

  it('clicking an example chip populates the textarea (does not auto-submit)', async () => {
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="Soft Lavender French"
        initialChatTurns={[]}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    fireEvent.click(screen.getByText(/make it more pastel/i));

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/pastel/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders ordered turn rows by createdAt', async () => {
    const turns = [
      turn('t1', 'success', 'first', '2026-05-05T00:00:01Z'),
      turn('t2', 'success', 'second', '2026-05-05T00:00:02Z'),
      turn('t3', 'success', 'third', '2026-05-05T00:00:03Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="Soft Lavender French"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('first');
    expect(items[2]).toHaveTextContent('third');
  });

  it('failed turn row uses neutral Sent badge, not Failed', async () => {
    const turns = [
      turn('t1', 'success', 'ok', '2026-05-05T00:00:01Z'),
      turn('t2', 'failed', 'bad', '2026-05-05T00:00:02Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const items = screen.getAllByRole('listitem');
    // Row carries Sent — NOT Failed.
    expect(items[1]).toHaveTextContent(/sent/i);
    expect(items[1]).not.toHaveTextContent(/failed/i);
  });

  it('aggregates 2+ failed turns into a single SYSTEM block above input', async () => {
    const turns = [
      turn('t1', 'success', 'ok', '2026-05-05T00:00:01Z'),
      turn('t2', 'failed', 'bad-1', '2026-05-05T00:00:02Z'),
      turn('t3', 'success', 'ok-2', '2026-05-05T00:00:03Z'),
      turn('t4', 'failed', 'bad-2', '2026-05-05T00:00:04Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const block = screen.getByRole('status', { name: /system/i });
    expect(block).toBeTruthy();
    expect(block.textContent).toMatch(/turn 02/i);
    expect(block.textContent).toMatch(/turn 04/i);
    // One block, not two.
    expect(screen.getAllByRole('status', { name: /system/i })).toHaveLength(1);
  });

  it('Retry inside the SYSTEM block fires POST /api/designs/[id]/chat with retryTurnId', async () => {
    const turns = [
      turn('t1', 'success', 'ok', '2026-05-05T00:00:01Z'),
      turn('t2', 'failed', 'bad', '2026-05-05T00:00:02Z'),
    ];
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        generationId: 'gen-retry',
        turnId: 't2',
      }),
    });

    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain(`/api/designs/${DESIGN_ID}/chat`);
    expect((init as RequestInit | undefined)?.method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit | undefined)?.body));
    expect(body.retryTurnId).toBe('t2');
  });

  it('dismiss removes the entry from the SYSTEM block without calling fetch', async () => {
    const turns = [
      turn('t1', 'success', 'ok', '2026-05-05T00:00:01Z'),
      turn('t2', 'failed', 'bad', '2026-05-05T00:00:02Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    expect(screen.getByRole('status', { name: /system/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('status', { name: /system/i })).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('input is disabled while any turn is pending', async () => {
    const turns = [
      turn('t1', 'success', 'ok', '2026-05-05T00:00:01Z'),
      turn('t2', 'pending', 'wait', '2026-05-05T00:00:02Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-disabled', 'true');
    const send = screen.getByRole('button', { name: /generating|send/i });
    expect(send).toBeDisabled();
  });

  it('replaces input with locked notice when session is full (5 turns)', async () => {
    const turns = [
      turn('t1', 'success', '1', '2026-05-05T00:00:01Z'),
      turn('t2', 'success', '2', '2026-05-05T00:00:02Z'),
      turn('t3', 'success', '3', '2026-05-05T00:00:03Z'),
      turn('t4', 'success', '4', '2026-05-05T00:00:04Z'),
      turn('t5', 'success', '5', '2026-05-05T00:00:05Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    expect(screen.getByText(/session full/i)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('clicking a successful turn row calls onTurnImageSelect with that turn', async () => {
    const turns = [
      turn('t1', 'success', 'first', '2026-05-05T00:00:01Z'),
      turn('t2', 'success', 'second', '2026-05-05T00:00:02Z'),
    ];
    const onTurnImageSelect = vi.fn();
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={onTurnImageSelect}
        viewingTurnIndex={null}
      />
    );

    const items = screen.getAllByRole('listitem');
    fireEvent.click(items[0]);
    expect(onTurnImageSelect).toHaveBeenCalledTimes(1);
    expect(onTurnImageSelect.mock.calls[0]?.[0]?.id).toBe('t1');
  });

  it('Send fires POST /api/designs/[id]/chat with the typed message', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        generationId: 'gen-new',
        turnId: 't-new',
      }),
    });

    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={[]}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'soften the tip' } });

    const send = screen.getByRole('button', { name: /^send$/i });
    fireEvent.click(send);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(String(url)).toContain(`/api/designs/${DESIGN_ID}/chat`);
    expect((init as RequestInit | undefined)?.method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit | undefined)?.body));
    expect(body.message).toBe('soften the tip');
    // No retryTurnId for fresh sends.
    expect(body.retryTurnId).toBeUndefined();
  });

  it('Send is disabled when textarea has only whitespace', async () => {
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={[]}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '   \n  ' } });

    const send = screen.getByRole('button', { name: /^send$/i });
    expect(send).toBeDisabled();

    fireEvent.click(send);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('Send clears the textarea after a successful POST', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        generationId: 'gen-new',
        turnId: 't-new',
      }),
    });

    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={[]}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'add gold accents' } });

    fireEvent.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(textarea.value).toBe('');
    });
  });

  it('badge label switches Current → "Comparing turn 03" when viewingTurnIndex === 2', async () => {
    const turns = [
      turn('t1', 'success', '1', '2026-05-05T00:00:01Z'),
      turn('t2', 'success', '2', '2026-05-05T00:00:02Z'),
      turn('t3', 'success', '3', '2026-05-05T00:00:03Z'),
    ];
    const { ChatRefinementPanel } =
      await import('@/components/ChatRefinementPanel');
    const { rerender } = render(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={null}
      />
    );

    // viewingTurnIndex null → latest successful (t3 / index 2) carries 'Current'
    let items = screen.getAllByRole('listitem');
    expect(items[2]).toHaveTextContent(/current/i);
    expect(items[2]).not.toHaveTextContent(/comparing/i);

    rerender(
      <ChatRefinementPanel
        designId={DESIGN_ID}
        designName="x"
        initialChatTurns={turns}
        onTurnImageSelect={vi.fn()}
        viewingTurnIndex={1}
      />
    );

    items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveTextContent(/comparing turn 02/i);
    expect(items[2]).not.toHaveTextContent(/^current$/i);
  });
});
