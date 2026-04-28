import React, { Suspense } from 'react';

import { BoardGrid } from '@/components/pinterest/BoardGrid';
import { BoardGridSkeleton } from '@/components/pinterest/BoardGridSkeleton';
import {
  listPinterestBoards,
  verifyPinterestToken,
} from '@/lib/pinterest/client';

import type { ReactNode } from 'react';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function TokenPlaceholderInline({
  title,
  message,
}: {
  title: ReactNode;
  message: string;
}) {
  return (
    <section
      data-component="TokenPlaceholderInline"
      className="mx-auto max-w-md rounded-[28px] bg-card p-12 text-center"
    >
      <div className="rounded-[28px] border border-dashed border-[color:rgb(107_63_94_/_0.5)] p-8">
        <h2 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {message}
        </p>
      </div>
    </section>
  );
}

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
    if (result.reason === 'invalid_token') {
      return (
        <TokenPlaceholderInline
          title={
            <>
              Pinterest is <em className="italic text-primary">paused.</em>
            </>
          }
          message="Pinterest token needs replacement; see Vercel env."
        />
      );
    }

    if (result.reason === 'insufficient_scope') {
      return (
        <TokenPlaceholderInline
          title={
            <>
              Pinterest needs{' '}
              <em className="italic text-primary">expanded scope.</em>
            </>
          }
          message="Pinterest token needs broader access; see Vercel env."
        />
      );
    }

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

  if (
    !verify.ok &&
    verify.reason !== 'invalid_token' &&
    verify.reason !== 'insufficient_scope'
  ) {
    throw new Error('Failed to verify Pinterest token.');
  }

  const boardsResource = verify.ok
    ? createBoardsResource(listPinterestBoards())
    : null;

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

      {!verify.ok ? (
        verify.reason === 'invalid_token' ? (
          <TokenPlaceholderInline
            title={
              <>
                Pinterest is <em className="italic text-primary">paused.</em>
              </>
            }
            message="Pinterest token needs replacement; see Vercel env."
          />
        ) : (
          <TokenPlaceholderInline
            title={
              <>
                Pinterest needs{' '}
                <em className="italic text-primary">expanded scope.</em>
              </>
            }
            message="Pinterest token needs broader access; see Vercel env."
          />
        )
      ) : (
        <Suspense fallback={<BoardGridSkeleton />}>
          <BoardsSection boardsResource={boardsResource!} />
        </Suspense>
      )}
    </main>
  );
}
