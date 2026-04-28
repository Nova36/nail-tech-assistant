import Link from 'next/link';
import React from 'react';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-8 pt-12 md:px-6 md:pb-10 md:pt-16 lg:pb-12 lg:pt-20">
      <section
        data-component="BoardNotFound"
        className="mx-auto max-w-md rounded-[28px] bg-card p-12 text-center"
      >
        <div className="rounded-[28px] border border-dashed border-[color:rgb(107_63_94_/_0.5)] p-8">
          <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
            Board <em className="italic text-primary">not found.</em>
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            This Pinterest board could not be loaded.
          </p>
          <Link
            href="/pinterest"
            className="mt-6 inline-flex min-h-[44px] items-center justify-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Back to all boards
          </Link>
        </div>
      </section>
    </main>
  );
}
