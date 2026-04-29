'use client';

import React from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PinterestErrorBoundary({ error, reset }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <section
        data-component="PinterestErrorBoundary"
        className="mx-auto max-w-xl rounded-[28px] bg-card px-6 py-12 text-center"
      >
        <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
          Something went wrong loading Pinterest
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {error.message}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex min-h-touch-target items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
