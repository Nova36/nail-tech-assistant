import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { BoardDetailHeader } from '@/components/pinterest/BoardDetailHeader';
import { InsufficientScopeView } from '@/components/pinterest/InsufficientScopeView';
import { PinGrid } from '@/components/pinterest/PinGrid';
import { PinGridSkeleton } from '@/components/pinterest/PinGridSkeleton';
import { TokenInvalidView } from '@/components/pinterest/TokenInvalidView';
import {
  listPinterestBoardPins,
  verifyPinterestToken,
} from '@/lib/pinterest/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    if (verify.reason === 'invalid_token') {
      return <TokenInvalidView />;
    }

    if (verify.reason === 'insufficient_scope') {
      return <InsufficientScopeView />;
    }

    throw new Error(`pinterest verify failed: ${verify.reason}`);
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
