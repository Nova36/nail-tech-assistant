'use client';

import Image from 'next/image';

type GenerationPreviewProps = {
  imageUrl: string;
  nailShape?: string | null;
  promptText?: string | null;
  onAdjust: () => void;
};

export function GenerationPreview({
  imageUrl,
  nailShape,
  promptText,
  onAdjust,
}: GenerationPreviewProps) {
  const alt = `Generated nail design — ${nailShape ?? 'almond'} shape${
    promptText ? `, ${promptText.slice(0, 60)}` : ''
  }`;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Step 3 of 3
        </p>
        <h2 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
          Here&apos;s your design.
        </h2>
        <p className="mx-auto max-w-prose text-sm text-muted-foreground">
          Save it to your Library, try another version, or step back and adjust.
        </p>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card/70 p-3 shadow-[0_20px_50px_rgba(61,53,48,0.08)] md:p-5">
        <div className="relative aspect-square overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,_rgb(250_247_242),_rgb(240_235_227)_55%,_rgb(214_196_188))]">
          <Image
            src={imageUrl}
            overrideSrc={imageUrl}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 720px, 100vw"
            className="object-cover motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-[0.96] motion-safe:duration-200"
          />
        </div>
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onAdjust}
          className="min-h-[44px] text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
        >
          ← Back to adjust
        </button>
      </div>
    </div>
  );
}
