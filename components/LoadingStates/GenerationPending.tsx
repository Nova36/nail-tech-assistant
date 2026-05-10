import { GenerateButton } from '@/components/studio/GenerateButton';

export function GenerationPending() {
  return (
    <div className="space-y-6 rounded-[28px] border border-border/70 bg-card/70 p-6 shadow-[0_20px_50px_rgba(61,53,48,0.08)]">
      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Step 3 of 3
        </p>
        <h2 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
          Painting your design.
        </h2>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          We&apos;re turning your references and direction into a fresh result.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-[24px] border border-[color:var(--primary)]/12 bg-[linear-gradient(180deg,rgba(250,247,242,0.96),rgba(240,235,227,0.92))] px-6 py-8">
          <div className="relative h-40 w-28 overflow-hidden rounded-[999px] border border-[color:var(--primary)]/15 bg-[linear-gradient(180deg,rgba(107,63,94,0.08),rgba(107,63,94,0.02))]">
            <div className="absolute inset-x-4 bottom-4 top-4 rounded-[999px] bg-[color:var(--primary)]/10" />
            <div
              aria-hidden="true"
              className="nail-fill absolute inset-x-5 bottom-4 top-4 overflow-hidden rounded-[999px]"
            >
              <div className="absolute inset-0 rounded-[999px] bg-[color:var(--primary)] motion-safe:[transform:scaleY(0)] motion-safe:[transform-origin:bottom_center] motion-safe:[animation:nail-rise_4s_ease-in-out_infinite]" />
              <div className="pointer-events-none absolute inset-y-0 left-[-30%] w-[60%] -skew-x-12 bg-[linear-gradient(120deg,transparent_30%,rgba(255,255,255,0.55)_50%,transparent_70%)] mix-blend-overlay motion-safe:[animation:glimmer-sweep_3.6s_ease-in-out_infinite]" />
            </div>
          </div>
          <GenerateButton
            canGenerate={true}
            pending={true}
            onGenerate={() => undefined}
          />
        </div>
      </div>
    </div>
  );
}
