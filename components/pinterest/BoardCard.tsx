'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import type { PinterestBoard } from '@/lib/pinterest/types';

const COVER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f0ebe3'/%3E%3Cstop offset='100%25' stop-color='%23d4a5a8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3C/svg%3E";

function getBoardCoverUrl(board: PinterestBoard): string {
  if (typeof board.media?.image_cover_url === 'string') {
    return board.media.image_cover_url;
  }

  return COVER_DATA_URI;
}

export function BoardCard({ board }: { board: PinterestBoard }) {
  const pinCount = board.pin_count ?? 0;
  const metaLabel =
    board.privacy === 'PRIVATE'
      ? `Private · ${pinCount} pins`
      : `${pinCount} pins`;

  return (
    <Link
      href={`/pinterest/${board.id}`}
      aria-label={`${board.name} (${pinCount} pins)`}
      data-component="BoardCard"
      className="group flex min-h-[44px] flex-col overflow-hidden rounded-[28px] border border-border/40 bg-card shadow-[0_12px_32px_rgba(61,53,48,0.08)] outline-none transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[color:rgb(212_165_168_/_0.6)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
    >
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <Image
          src={getBoardCoverUrl(board)}
          alt={board.name}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="space-y-2 p-5 md:p-6">
        <h3 className="line-clamp-2 font-heading-display text-xl font-light tracking-[-0.01em] text-foreground md:text-2xl md:leading-snug">
          {board.name}
        </h3>
        <p className="text-xs tracking-wide text-muted-foreground">
          {metaLabel}
        </p>
      </div>
    </Link>
  );
}
