export function LibrarySkeleton() {
  return (
    <section
      data-component="LibrarySkeleton"
      className="space-y-8"
      aria-busy="true"
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <article
            key={i}
            className="overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-[0_20px_50px_rgba(61,53,48,0.08)]"
          >
            <div className="aspect-[4/3] sk-v1" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded-md bg-muted/60" />
              <div className="h-3 w-1/3 rounded-md bg-muted/40" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
