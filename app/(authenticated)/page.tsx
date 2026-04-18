export default function AuthenticatedHomePage() {
  return (
    <section className="space-y-8">
      <div className="grid gap-6 rounded-[32px] border border-[color:rgb(212_203_197_/_0.7)] bg-[color:rgb(240_235_227_/_0.55)] p-6 shadow-[0_16px_48px_rgba(61,53,48,0.08)] md:grid-cols-[240px_1fr] md:p-8">
        <div className="rounded-[28px] bg-card p-6">
          <p className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
            Dashboard
          </p>
          <h1 className="mt-4 font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
            Your design
            <span className="block italic text-primary">studio.</span>
          </h1>
          <p className="mt-4 max-w-xs font-body text-sm leading-6 text-muted-foreground">
            Start a fresh concept or return to saved work from the same
            protected shell.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <a
            href="#"
            data-state="placeholder"
            aria-disabled="true"
            className="group relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[28px] p-7 text-left shadow-[0_18px_44px_rgba(61,53,48,0.12)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.22)]"
            style={{ background: 'var(--gradient-signature)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full bg-primary px-4 py-4 text-primary-foreground shadow-[0_8px_20px_rgba(61,53,48,0.12)]">
                <span
                  aria-hidden="true"
                  className="block text-2xl leading-none"
                >
                  +
                </span>
              </span>
              <span className="rounded-full border border-[color:rgb(250_247_242_/_0.65)] bg-background/70 px-3 py-1 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
                Coming soon
              </span>
            </div>

            <div className="space-y-4">
              <h2 className="font-heading-display text-5xl font-light tracking-[-0.04em] text-foreground sm:text-6xl">
                New <span className="italic text-primary">design</span>
              </h2>
              <p className="max-w-sm font-body text-sm leading-6 text-[color:rgb(61_53_48_/_0.82)]">
                Begin a new concept from the placeholder tile that later epics
                will connect to the creation flow.
              </p>
            </div>
          </a>

          <a
            href="#"
            data-state="placeholder"
            aria-disabled="true"
            className="flex min-h-[320px] flex-col justify-between rounded-[28px] border border-dashed border-primary/50 bg-card p-7 text-left shadow-[0_12px_32px_rgba(61,53,48,0.08)] outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[color:rgb(107_63_94_/_0.2)]"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Library
              </p>
              <span className="rounded-full border border-[color:rgb(107_63_94_/_0.16)] bg-background px-3 py-1 font-body text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Stable slot
              </span>
            </div>

            <div className="space-y-4">
              <h2 className="font-heading-display text-5xl font-light tracking-[-0.04em] text-foreground sm:text-[56px]">
                My <span className="italic text-primary">designs</span>
              </h2>
              <p className="max-w-sm font-body text-sm leading-6 text-muted-foreground">
                Revisit saved work and future collections from the same anchored
                dashboard entry point.
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
