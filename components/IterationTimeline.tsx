'use client';

import { useId, useState, type KeyboardEvent } from 'react';

import type { ChatTurnView } from '@/lib/designs/loadChatTurns';

export type IterationTimelineProps = {
  turns: ChatTurnView[];
  viewingTurnIndex: number | null;
  onTurnSelect: (turn: ChatTurnView | null) => void;
};

function getLatestSuccessfulIndex(turns: ChatTurnView[]): number | null {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index]?.status === 'success') {
      return index;
    }
  }

  return null;
}

export function IterationTimeline({
  turns,
  viewingTurnIndex,
  onTurnSelect,
}: IterationTimelineProps) {
  const orderedTurns = [...turns].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const latestSuccessfulIndex = getLatestSuccessfulIndex(orderedTurns);
  const activeIndex =
    viewingTurnIndex ??
    (latestSuccessfulIndex !== null ? latestSuccessfulIndex : -1);
  const [focusIndex, setFocusIndex] = useState(
    activeIndex >= 0 ? activeIndex : 0
  );
  const tablistId = useId();

  if (orderedTurns.length === 0) {
    return null;
  }

  function selectAtIndex(index: number) {
    const turn = orderedTurns[index];
    if (!turn) {
      return;
    }

    const isCurrent =
      viewingTurnIndex === null && latestSuccessfulIndex === index;
    const isComparing = viewingTurnIndex === index;
    onTurnSelect(isCurrent || isComparing ? null : turn);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex =
      (index + delta + orderedTurns.length) % orderedTurns.length;
    setFocusIndex(nextIndex);
    selectAtIndex(nextIndex);
  }

  return (
    <div
      role="tablist"
      aria-label="Iteration timeline"
      id={tablistId}
      className="flex flex-wrap gap-3"
    >
      {orderedTurns.map((turn, index) => {
        const isCurrent =
          viewingTurnIndex === null && latestSuccessfulIndex === index;
        const isComparing = viewingTurnIndex === index;
        const isSelected = isCurrent || isComparing;

        return (
          <button
            key={turn.id}
            type="button"
            role="tab"
            aria-selected={isSelected ? 'true' : 'false'}
            aria-controls={undefined}
            tabIndex={focusIndex === index ? 0 : -1}
            data-turn-id={turn.id}
            data-state={turn.status}
            onClick={() => selectAtIndex(index)}
            onFocus={() => setFocusIndex(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={`relative flex h-[60px] w-[60px] flex-col items-center justify-center overflow-hidden rounded-2xl border text-[10px] font-medium transition focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 ${
              isSelected
                ? 'border-[color:var(--primary)] shadow-[0_0_0_2px_rgba(107,63,94,0.18)]'
                : 'border-border/70 bg-card/70'
            }`}
          >
            {turn.status === 'success' && turn.imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={turn.imageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-x-1 bottom-1 rounded-full bg-background/90 px-1.5 py-0.5 text-[9px] text-foreground">
                  {isComparing ? 'Comparing' : isCurrent ? 'Current' : ''}
                </span>
              </>
            ) : null}
            {turn.status === 'failed' ? (
              <span className="flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(-45deg,rgba(140,126,120,0.2)_0,rgba(140,126,120,0.2)_6px,transparent_6px,transparent_12px)] text-muted-foreground">
                !
              </span>
            ) : null}
            {turn.status === 'pending' ? (
              <span className="flex h-full w-full items-center justify-center bg-[repeating-linear-gradient(-45deg,rgba(107,63,94,0.08)_0,rgba(107,63,94,0.08)_8px,transparent_8px,transparent_16px)] motion-safe:animate-pulse text-muted-foreground">
                <span className="sr-only">Generating</span>
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
