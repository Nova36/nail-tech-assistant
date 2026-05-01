'use client';

import { useEffect, useState } from 'react';

type GenerateButtonProps = {
  canGenerate: boolean;
  pending: boolean;
  onGenerate: () => void;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
    };
  }, []);

  return prefersReducedMotion;
}

export function GenerateButton({
  canGenerate,
  pending,
  onGenerate,
}: GenerateButtonProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const disabled = pending || !canGenerate;
  const isMuted = !pending && !canGenerate;
  const pendingCopy = prefersReducedMotion
    ? 'Generating…'
    : 'Painting your design…';

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onGenerate}
      disabled={disabled}
      aria-busy={pending ? 'true' : undefined}
      aria-disabled={disabled && !pending ? 'true' : undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-transform duration-200 motion-reduce:transition-none ${
        isMuted
          ? 'cursor-not-allowed border-transparent bg-[rgb(140_126_120_/_0.25)] text-muted-foreground shadow-none'
          : 'border-transparent bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[0_6px_16px_rgba(107,63,94,0.25)] hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:hover:translate-y-0'
      }`}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            className={`nail-fill inline-flex h-5 w-5 items-center justify-center ${
              prefersReducedMotion ? '' : 'animate-pulse'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path
                d="M8 3.5C6.9 4.8 6.4 7.2 6.4 10.2V20.5H17.6V10.2C17.6 7.2 17.1 4.8 16 3.5C15 2.3 13.7 2 12 2C10.3 2 9 2.3 8 3.5Z"
                className="fill-current opacity-90"
              />
              <path
                d="M8 3.5C6.9 4.8 6.4 7.2 6.4 10.2V20.5H17.6V10.2C17.6 7.2 17.1 4.8 16 3.5C15 2.3 13.7 2 12 2C10.3 2 9 2.3 8 3.5Z"
                className="stroke-current/80"
                strokeWidth="1.4"
              />
            </svg>
          </span>
          <span>{pendingCopy}</span>
        </>
      ) : (
        <span>Generate Design</span>
      )}
    </button>
  );
}
