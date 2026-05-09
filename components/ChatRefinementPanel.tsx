'use client';

import Link from 'next/link';
import { useMemo, useState, type KeyboardEvent } from 'react';

import type { ChatTurnView as SharedChatTurnView } from '@/lib/designs/loadChatTurns';

export type ChatTurnView = SharedChatTurnView;

export type ChatRefinementPanelProps = {
  designId: string;
  designName?: string | null;
  initialChatTurns: ChatTurnView[];
  onTurnImageSelect: (turn: ChatTurnView | null) => void;
  viewingTurnIndex: number | null;
};

const EXAMPLE_CHIPS = [
  'make it more pastel',
  'add gold accents',
  'shorter, almond shape',
];

function formatTurnNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function getLatestSuccessfulIndex(turns: ChatTurnView[]): number | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index]?.status === 'success') {
      return index;
    }
  }

  return null;
}

export function ChatRefinementPanel({
  designId,
  designName,
  initialChatTurns,
  onTurnImageSelect,
  viewingTurnIndex,
}: ChatRefinementPanelProps) {
  const orderedTurns = useMemo(
    () =>
      [...initialChatTurns].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ),
    [initialChatTurns]
  );
  const [message, setMessage] = useState('');
  const [dismissedFailures, setDismissedFailures] = useState<string[]>([]);
  const [retryingIds, setRetryingIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const latestSuccessfulIndex = getLatestSuccessfulIndex(orderedTurns);
  const hasPendingTurn = orderedTurns.some((turn) => turn.status === 'pending');
  const isSessionFull = orderedTurns.length >= 5;
  const unresolvedFailedTurns = orderedTurns.filter(
    (turn) =>
      turn.status === 'failed' &&
      !dismissedFailures.includes(turn.id) &&
      !retryingIds.includes(turn.id)
  );

  async function retryTurn(turnId: string) {
    setRetryingIds((current) => [...current, turnId]);

    try {
      await fetch(`/api/designs/${designId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ retryTurnId: turnId }),
      });
    } finally {
      setDismissedFailures((current) => [...current, turnId]);
      setRetryingIds((current) => current.filter((id) => id !== turnId));
    }
  }

  async function sendMessage() {
    const trimmedMessage = message.trim();

    if (trimmedMessage.length === 0 || hasPendingTurn || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(`/api/designs/${designId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      if (response.ok) {
        setMessage('');
      }
    } finally {
      setIsSending(false);
    }
  }

  function handleTurnKeyDown(
    event: KeyboardEvent<HTMLLIElement>,
    turn: ChatTurnView
  ) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onTurnImageSelect(turn);
    }
  }

  return (
    <aside className="flex h-full flex-col rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-[0_20px_50px_rgba(61,53,48,0.08)]">
      <div className="space-y-2 border-b border-border/60 pb-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          Refine with chat
        </p>
        <h3 className="font-heading-display text-2xl text-foreground">
          {designName ?? 'Untitled design'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {orderedTurns.length}/5 turns
        </p>
        <p className="text-sm text-muted-foreground">
          Keep your iteration history in order while you compare results.
        </p>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {orderedTurns.length === 0 ? (
          <div className="space-y-4 rounded-[24px] border border-dashed border-border/70 bg-background/70 p-4">
            <p className="text-sm text-foreground">
              Nudge this design with a quick message to start a refinement turn.
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setMessage(chip)}
                  className="rounded-full border border-border/70 bg-background px-3 py-2 text-sm text-foreground transition hover:border-[color:var(--primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol role="list" className="space-y-3">
            {orderedTurns.map((turn, index) => {
              const badgeText =
                turn.status === 'success'
                  ? 'Success'
                  : turn.status === 'pending'
                    ? 'Generating'
                    : 'Sent';
              const comparisonBadge =
                viewingTurnIndex === index
                  ? `Comparing turn ${formatTurnNumber(index)}`
                  : viewingTurnIndex === null && latestSuccessfulIndex === index
                    ? 'Current'
                    : null;

              return (
                <li
                  key={turn.id}
                  role="listitem"
                  tabIndex={0}
                  aria-live={turn.status === 'pending' ? 'polite' : undefined}
                  onClick={() => onTurnImageSelect(turn)}
                  onKeyDown={(event) => handleTurnKeyDown(event, turn)}
                  className="cursor-pointer rounded-[20px] border border-border/70 bg-background/80 p-4 text-left shadow-sm transition hover:border-[color:var(--primary)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span>{formatTurnNumber(index)}</span>
                    <span className="rounded-full bg-[color:var(--primary)]/10 px-2 py-1 text-[10px] text-foreground">
                      {badgeText}
                    </span>
                    {comparisonBadge ? (
                      <span className="rounded-full border border-[color:var(--primary)]/25 px-2 py-1 text-[10px] text-foreground">
                        {comparisonBadge}
                      </span>
                    ) : null}
                    <span>{turn.createdAt}</span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{turn.message}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {unresolvedFailedTurns.length > 0 ? (
        <div
          role="status"
          aria-label="System"
          className="mt-4 space-y-2 rounded-[20px] border border-[color:var(--destructive)]/30 bg-[color:var(--destructive)]/5 p-4"
        >
          <p className="text-[11px] uppercase tracking-[0.22em] text-destructive">
            System
          </p>
          {unresolvedFailedTurns.map((turn) => {
            const index = orderedTurns.findIndex(
              (candidate) => candidate.id === turn.id
            );
            return (
              <div
                key={turn.id}
                className="flex flex-wrap items-center gap-2 text-sm text-foreground"
              >
                <span>{`Turn ${formatTurnNumber(index)} didn't generate`}</span>
                <button
                  type="button"
                  onClick={() => void retryTurn(turn.id)}
                  className="text-destructive underline underline-offset-4"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDismissedFailures((current) => [...current, turn.id])
                  }
                  className="text-muted-foreground underline underline-offset-4"
                >
                  dismiss
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-4 border-t border-border/60 pt-4">
        {isSessionFull ? (
          <p className="text-sm text-muted-foreground">
            Session full.{' '}
            <Link
              href="/design/new"
              className="text-foreground underline underline-offset-4"
            >
              start a new design from this
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, 500))}
              maxLength={500}
              rows={4}
              aria-disabled={hasPendingTurn || isSending ? 'true' : 'false'}
              disabled={hasPendingTurn || isSending}
              className="w-full rounded-[20px] border border-border/70 bg-background px-4 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{message.length}/500</span>
              <span>
                {hasPendingTurn
                  ? 'Generating now. Send unlocks when the current turn finishes.'
                  : 'Enter to send · Shift+Enter for newline'}
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={
                  hasPendingTurn || isSending || message.trim().length === 0
                }
                aria-disabled={hasPendingTurn || isSending ? 'true' : 'false'}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[0_6px_16px_rgba(107,63,94,0.25)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {hasPendingTurn || isSending ? 'Generating…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
