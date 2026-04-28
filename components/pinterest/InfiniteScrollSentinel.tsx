'use client';

import React, { useEffect, useRef } from 'react';

type InfiniteScrollSentinelProps = {
  bookmark: string | null;
  isFetching: boolean;
  onTrigger: (bookmark: string) => Promise<void>;
};

export function InfiniteScrollSentinel({
  bookmark,
  isFetching,
  onTrigger,
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const lastFiredBookmark = useRef<string | null>(null);
  const onTriggerRef = useRef(onTrigger);

  useEffect(() => {
    loadingRef.current = isFetching;
  }, [isFetching]);

  useEffect(() => {
    onTriggerRef.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (!bookmark) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry?.isIntersecting) {
        return;
      }

      if (loadingRef.current || lastFiredBookmark.current === bookmark) {
        return;
      }

      loadingRef.current = true;
      lastFiredBookmark.current = bookmark;

      try {
        await onTriggerRef.current(bookmark);
      } finally {
        loadingRef.current = false;
      }
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [bookmark]);

  const className = isFetching ? 'sentinel fetching' : 'sentinel';

  return (
    <>
      <div className="mt-10 flex justify-center md:mt-16">
        <div
          ref={ref}
          aria-hidden="true"
          data-component="InfiniteScrollSentinel"
          className={className}
        />
      </div>
      <style>{`
        .sentinel {
          width: 10px;
          height: 10px;
          border-radius: 9999px;
          background: var(--accent);
          opacity: 0.55;
        }

        .sentinel.fetching {
          animation: breathe 2.2s ease-in-out infinite;
        }

        @keyframes breathe {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.9);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.25);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sentinel.fetching {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
