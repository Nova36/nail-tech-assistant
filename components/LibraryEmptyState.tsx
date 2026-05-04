import Link from 'next/link';

export function LibraryEmptyState() {
  return (
    <section
      data-component="LibraryEmptyState"
      className="rounded-[32px] border border-border/70 bg-card/70 px-6 py-12 text-center shadow-[0_20px_50px_rgba(61,53,48,0.08)] sm:px-10"
    >
      <h2 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground md:text-4xl">
        No designs yet
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        Start with a fresh idea and save the looks you want to revisit.
      </p>
      <Link
        href="/design/new"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[color:var(--primary)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_30%,transparent)] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
      >
        Start a new design
      </Link>
    </section>
  );
}
