import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { BoardDetailHeader } from '@/components/pinterest/BoardDetailHeader';
import { PinGrid } from '@/components/pinterest/PinGrid';
import { PinGridSkeleton } from '@/components/pinterest/PinGridSkeleton';
import {
  listPinterestBoardPins,
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

function formatBoardName(boardId: string): string {
  return boardId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

type PinsResource = {
  read: () => Awaited<ReturnType<typeof listPinterestBoardPins>>;
};

function createPinsResource(
  promise: ReturnType<typeof listPinterestBoardPins>
): PinsResource {
  let status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  let value: Awaited<ReturnType<typeof listPinterestBoardPins>>;
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

function PinsSection({
  boardId,
  pinsResource,
}: {
  boardId: string;
  pinsResource: PinsResource;
}) {
  const result = pinsResource.read();

  if (!result.ok) {
    if (result.reason === 'not_found') {
      notFound();
    }

    if (result.reason === 'invalid_token') {
      return (
        <TokenPlaceholderInline
          title={
            <>
              Pinterest is <em className="italic text-primary">paused.</em>
            </>
          }
          message="Pinterest token needs to be replaced; see Vercel env."
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

    throw new Error(`Failed to load Pinterest pins: ${result.reason}`);
  }

  return (
    <PinGrid
      boardId={boardId}
      initialItems={result.items}
      initialNextBookmark={result.nextBookmark}
    />
  );
}

type Props = {
  params: Promise<{ boardId: string }>;
};

export default async function BoardDetailPage({ params }: Props) {
  const { boardId } = await params;
  const verify = await verifyPinterestToken();

  if (!verify.ok) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-8 pt-12 md:px-6 md:pb-10 md:pt-16 lg:pb-12 lg:pt-20">
        {verify.reason === 'insufficient_scope' ? (
          <TokenPlaceholderInline
            title={
              <>
                Pinterest needs{' '}
                <em className="italic text-primary">expanded scope.</em>
              </>
            }
            message="Pinterest token needs broader access; see Vercel env."
          />
        ) : (
          <TokenPlaceholderInline
            title={
              <>
                Pinterest is <em className="italic text-primary">paused.</em>
              </>
            }
            message="Pinterest token needs to be replaced; see Vercel env."
          />
        )}
      </main>
    );
  }

  const pinsResource = createPinsResource(listPinterestBoardPins({ boardId }));

  return (
    <main className="mx-auto max-w-6xl px-5 pb-8 pt-12 md:px-6 md:pb-10 md:pt-16 lg:pb-12 lg:pt-20">
      <BoardDetailHeader boardName={formatBoardName(boardId)} />
      <Suspense fallback={<PinGridSkeleton />}>
        <PinsSection boardId={boardId} pinsResource={pinsResource} />
      </Suspense>
    </main>
  );
}
