import React from 'react';

export function EmptyBoardsState() {
  return (
    <section
      data-component="EmptyBoardsState"
      data-testid="EmptyBoardsState"
      role="status"
      aria-live="polite"
      className="mt-2 grid grid-cols-1 gap-8 md:grid-cols-5 md:gap-10 lg:gap-12"
    >
      <div className="md:col-span-2 flex items-start">
        <BoardSilhouette />
      </div>
      <div className="md:col-span-3 flex flex-col items-start gap-4">
        <PushpinGlyph />
        <h2 className="font-heading-display text-3xl font-light leading-tight tracking-[-0.02em] text-foreground md:text-4xl">
          No boards yet.
        </h2>
        <p className="max-w-md text-sm leading-6 text-muted-foreground">
          Create a board in your Pinterest account and it will show up here.
        </p>
      </div>
      <style>{`
        [data-component='EmptyBoardsState'] {
          animation: view-settle 240ms ease-out both;
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
          [data-component='EmptyBoardsState'] {
            animation: none !important;
          }
        }
      `}</style>
    </section>
  );
}

function BoardSilhouette() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 240"
      className="h-auto w-full max-w-[280px] text-border"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray="6 8"
    >
      <rect x="6" y="6" width="308" height="228" rx="20" />
      <rect x="32" y="32" width="120" height="80" rx="10" />
      <rect x="168" y="32" width="120" height="40" rx="10" />
      <rect x="168" y="88" width="120" height="40" rx="10" />
      <rect x="32" y="128" width="120" height="80" rx="10" />
      <rect x="168" y="144" width="120" height="64" rx="10" />
    </svg>
  );
}

function PushpinGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      className="text-primary"
    >
      <path
        d="M22 4l8 8-3 3-1.5-.7L21 19l3.4 3.4-1.4 1.4-7-7L9 24v-6l4.2-4.2L9.8 10.4l1.4-1.4L15 12.4l4.7-4.7L18.9 6 22 4z"
        fill="currentColor"
      />
      <path
        d="M14 28l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
