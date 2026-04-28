import Link from 'next/link';
import React from 'react';

type BoardDetailHeaderProps = {
  boardName: string;
  pinCount?: number;
  updatedLabel?: string;
};

export function BoardDetailHeader({
  boardName,
  pinCount,
  updatedLabel = 'freshly curated.',
}: BoardDetailHeaderProps) {
  const title = boardName.trim() || 'Board';
  const metaParts = [`${pinCount ?? 0} pins`, `updated ${updatedLabel}`];

  return (
    <>
      <section
        data-component="BoardDetailHeader"
        className="mb-8 md:mb-10 lg:mb-14"
      >
        <Link
          href="/pinterest"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <span aria-hidden="true">‹</span>
          <span>All boards</span>
        </Link>
        <p
          aria-hidden="true"
          className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
        >
          Board
        </p>
        <span
          aria-hidden="true"
          className="mb-5 mt-4 block h-px w-14"
          style={{ background: 'var(--color-accent)' }}
        />
        <h1
          id="board-title"
          className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl lg:text-6xl lg:leading-[0.98]"
        >
          {title}
        </h1>
        <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
          {metaParts.join(' · ')}
        </p>
      </section>
      <style>{`
        [data-component='BoardDetailHeader'] {
          animation: view-settle 280ms ease-out both;
        }

        @keyframes view-settle {
          from {
            opacity: 0;
            transform: translateY(2px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-component='BoardDetailHeader'] {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
