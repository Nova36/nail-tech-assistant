import React, { Suspense } from 'react';

import { BoardGrid } from '@/components/pinterest/BoardGrid';
import { BoardGridSkeleton } from '@/components/pinterest/BoardGridSkeleton';
import { InsufficientScopeView } from '@/components/pinterest/InsufficientScopeView';
import { TokenInvalidView } from '@/components/pinterest/TokenInvalidView';
import {
  listPinterestBoards,
  verifyPinterestToken,
} from '@/lib/pinterest/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type BoardsResource = {
  read: () => Awaited<ReturnType<typeof listPinterestBoards>>;
};

function createBoardsResource(
  promise: ReturnType<typeof listPinterestBoards>
): BoardsResource {
  let status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  let value: Awaited<ReturnType<typeof listPinterestBoards>>;
  let error: unknown;

  const suspender = promise.then(
    (result) => {
      status = 'fulfilled';
      value = result;
    },
    (reason) => {
      status = 'rejected';
      error = reason;
    }
  );

  return {
    read() {
      if (status === 'pending') {
        throw suspender;
      }

      if (status === 'rejected') {
        throw error;
      }

      return value;
    },
  };
}

function BoardsSection({ boardsResource }: { boardsResource: BoardsResource }) {
  const result = boardsResource.read();

  if (!result.ok) {
    throw new Error(`Failed to load Pinterest boards: ${result.reason}`);
  }

  return (
    <BoardGrid
      initialItems={result.items}
      initialNextBookmark={result.nextBookmark}
    />
  );
}

export default async function PinterestPage() {
  const verify = await verifyPinterestToken();

  if (!verify.ok) {
    if (verify.reason === 'invalid_token') {
      return <TokenInvalidView />;
    }

    if (verify.reason === 'insufficient_scope') {
      return <InsufficientScopeView />;
    }

    throw new Error(`pinterest verify failed: ${verify.reason}`);
  }

  const boardsResource = createBoardsResource(listPinterestBoards());

  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <section
        aria-labelledby="boards-heading"
        className="mb-8 space-y-4 md:mb-10 lg:mb-14"
      >
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Pinterest
        </p>
        <h1
          id="boards-heading"
          className="font-heading-display text-4xl font-light leading-none tracking-[-0.03em] text-foreground md:text-5xl lg:text-6xl lg:leading-[0.98]"
        >
          Your <em className="italic text-primary">boards.</em>
        </h1>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground">
          Inspiration pulled from your Pinterest account. Open a board to browse
          its pins.
        </p>
      </section>

      <Suspense fallback={<BoardGridSkeleton />}>
        <BoardsSection boardsResource={boardsResource} />
      </Suspense>
    </main>
  );
}
