import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16 text-center">
      <h1 className="font-fraunces text-4xl font-light text-[color:var(--primary)]">
        Library
      </h1>
      <p className="mt-4 text-base text-muted-foreground">
        Your saved designs will appear here. Start a new design to begin.
      </p>
      <Link
        href="/design/new"
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-[color:var(--primary)] px-6 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_30%,transparent)] transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
      >
        New Design
      </Link>
    </main>
  );
}
