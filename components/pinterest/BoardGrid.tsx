'use client';

import React, { useState } from 'react';

import { loadMoreBoards } from '@/app/(authenticated)/pinterest/actions';
import { BoardCard } from '@/components/pinterest/BoardCard';
import { InfiniteScrollSentinel } from '@/components/pinterest/InfiniteScrollSentinel';
import { InlineBrowseError } from '@/components/pinterest/InlineBrowseError';

import type { PinterestBoard } from '@/lib/pinterest/types';

type BoardGridProps = {
  initialItems: PinterestBoard[];
  initialNextBookmark: string | null;
};

type InlineReason = 'rate_limit' | 'network' | 'unknown';
const INLINE_REASONS = new Set<InlineReason>([
  'rate_limit',
  'network',
  'unknown',
]);

export function BoardGrid({
  initialItems,
  initialNextBookmark,
}: BoardGridProps) {
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
      const result = await loadMoreBoards(bookmark);

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
        aria-labelledby="boards-heading"
        aria-live="polite"
        aria-relevant="additions"
        data-component="BoardGrid"
      >
        <ul
          role="list"
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
        >
          {items.map((board, index) => {
            const isInitial = index < initialItems.length;
            const isAppended = appendedIds.has(board.id);

            return (
              <li
                key={board.id}
                className={isAppended ? 'card-enter' : ''}
                style={
                  isInitial || !isAppended
                    ? undefined
                    : {
                        animationDelay: `${Math.min((index - initialItems.length) * 40, 320)}ms`,
                      }
                }
              >
                <BoardCard board={board} />
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
