'use client';

import React from 'react';

type InlineBrowseErrorProps = {
  onRetry: () => void;
  reason?: 'rate_limit' | 'network' | 'unknown';
  isRetrying?: boolean;
};

const REASON_COPY: Record<
  NonNullable<InlineBrowseErrorProps['reason']>,
  string
> = {
  rate_limit: 'Too many requests. Try again in a moment.',
  network: 'Network hiccup. Try again.',
  unknown: 'Something went wrong loading this page.',
};

export function InlineBrowseError({
  onRetry,
  reason = 'unknown',
  isRetrying = false,
}: InlineBrowseErrorProps) {
  const copy = REASON_COPY[reason] ?? REASON_COPY.unknown;

  return (
    <div
      data-component="InlineBrowseError"
      role="alert"
      className="mt-8 flex flex-col items-start gap-3 rounded-2xl bg-card px-5 py-6 md:px-6"
    >
      <h3 className="font-heading-display text-xl font-light tracking-[-0.01em] text-foreground">
        Pinterest didn&apos;t respond.
      </h3>
      <p className="text-sm leading-6 text-muted-foreground">{copy}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="retry-button mt-1 inline-flex min-h-touch-target items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isRetrying ? 'Retrying…' : 'Try again'}
      </button>
      <style>{`
        [data-component='InlineBrowseError'] {
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

        [data-component='InlineBrowseError'] .retry-button {
          transition:
            transform 180ms ease,
            background-color 180ms ease,
            box-shadow 220ms ease;
          will-change: transform;
        }
        [data-component='InlineBrowseError'] .retry-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -8px
            color-mix(in oklab, var(--primary) 25%, transparent);
        }
        [data-component='InlineBrowseError'] .retry-button:active {
          transform: translateY(0);
          transition-duration: 80ms;
        }

        @media (prefers-reduced-motion: reduce) {
          [data-component='InlineBrowseError'] {
            animation: none !important;
          }
          [data-component='InlineBrowseError'] .retry-button {
            transition: none !important;
          }
          [data-component='InlineBrowseError'] .retry-button:hover {
            transform: none !important;
            box-shadow: none !important;
          }
          [data-component='InlineBrowseError'] .retry-button:active {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
