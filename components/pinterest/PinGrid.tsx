'use client';

import React, { useState } from 'react';

import { loadMorePins } from '@/app/(authenticated)/pinterest/actions';
import { InfiniteScrollSentinel } from '@/components/pinterest/InfiniteScrollSentinel';
import { InlineBrowseError } from '@/components/pinterest/InlineBrowseError';
import { PinCard } from '@/components/pinterest/PinCard';

import type { PinterestPin } from '@/lib/pinterest/types';

type PinGridProps = {
  boardId: string;
  initialItems: PinterestPin[];
  initialNextBookmark: string | null;
};

type InlineReason = 'rate_limit' | 'network' | 'unknown';
const INLINE_REASONS = new Set<InlineReason>([
  'rate_limit',
  'network',
  'unknown',
]);

export function PinGrid({
  boardId,
  initialItems,
  initialNextBookmark,
}: PinGridProps) {
  const [items, setItems] = useState(initialItems);
  const [nextBookmark, setNextBookmark] = useState(initialNextBookmark);
  const [isFetching, setIsFetching] = useState(false);
  const [appendedIds, setAppendedIds] = useState<Set<string>>(() => new Set());
  const [browseError, setBrowseError] = useState<InlineReason | null>(null);
  const [lastFailedBookmark, setLastFailedBookmark] = useState<string | null>(
    null
  );

  async function handleLoadMore(bookmark: string): Promise<void> {
    setIsFetching(true);

    try {
      const result = await loadMorePins(boardId, bookmark);

      setItems((current) => [...current, ...result.items]);
      setNextBookmark(result.nextBookmark);
      setAppendedIds((current) => {
        const next = new Set(current);
        for (const item of result.items) {
          next.add(item.id);
        }
        return next;
      });
      setBrowseError(null);
      setLastFailedBookmark(null);
    } catch (err) {
      const cause = (err as Error)?.cause as { reason?: string } | undefined;
      const reason = cause?.reason as InlineReason | undefined;
      if (reason && INLINE_REASONS.has(reason)) {
        setBrowseError(reason);
        setLastFailedBookmark(bookmark);
        return;
      }
      throw err;
    } finally {
      setIsFetching(false);
    }
  }

  function handleRetry(): void {
    if (lastFailedBookmark === null) return;
    void handleLoadMore(lastFailedBookmark);
  }

  return (
    <>
      <section
        aria-busy={isFetching ? 'true' : 'false'}
        aria-labelledby="board-title"
        aria-live="polite"
        aria-relevant="additions"
        data-component="PinGrid"
      >
        <ul
          role="list"
          className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-3 lg:gap-8"
        >
          {items.map((pin, index) => {
            const isInitial = index < initialItems.length;
            const isAppended = appendedIds.has(pin.id);

            return (
              <li
                key={pin.id}
                className={isAppended ? 'card-enter' : ''}
                style={
                  isInitial || !isAppended
                    ? undefined
                    : {
                        animationDelay: `${Math.min((index - initialItems.length) * 40, 320)}ms`,
                      }
                }
              >
                <PinCard pin={pin} />
              </li>
            );
          })}
        </ul>
      </section>
      {browseError ? (
        <InlineBrowseError
          reason={browseError}
          onRetry={handleRetry}
          isRetrying={isFetching}
        />
      ) : (
        <InfiniteScrollSentinel
          bookmark={nextBookmark}
          isFetching={isFetching}
          onTrigger={handleLoadMore}
        />
      )}
      <style>{`
        .card-enter {
          animation: card-enter 260ms ease-out both;
        }

        @keyframes card-enter {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .card-enter {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
