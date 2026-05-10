import { LibrarySkeleton } from '@/components/LoadingStates';

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-6 md:px-6 md:py-10 lg:py-12">
      <header className="mb-8 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Saved designs
        </p>
        <h2 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
          Library
        </h2>
      </header>
      <LibrarySkeleton />
    </main>
  );
}
