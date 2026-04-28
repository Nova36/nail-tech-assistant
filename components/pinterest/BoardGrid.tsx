'use client';

import React, { useState } from 'react';

import { loadMoreBoards } from '@/app/(authenticated)/pinterest/actions';
import { BoardCard } from '@/components/pinterest/BoardCard';
import { InfiniteScrollSentinel } from '@/components/pinterest/InfiniteScrollSentinel';

import type { PinterestBoard } from '@/lib/pinterest/types';

type BoardGridProps = {
  initialItems: PinterestBoard[];
  initialNextBookmark: string | null;
};

export function BoardGrid({
  initialItems,
  initialNextBookmark,
}: BoardGridProps) {
  const [items, setItems] = useState(initialItems);
  const [nextBookmark, setNextBookmark] = useState(initialNextBookmark);
  const [isFetching, setIsFetching] = useState(false);
  const [appendedIds, setAppendedIds] = useState<Set<string>>(() => new Set());

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
    } finally {
      setIsFetching(false);
    }
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
      <InfiniteScrollSentinel
        bookmark={nextBookmark}
        isFetching={isFetching}
        onTrigger={handleLoadMore}
      />
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
