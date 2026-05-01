'use client';

import Image from 'next/image';

import { SelectablePinCard } from '@/components/studio/SelectablePinCard';
import { UploadZone } from '@/components/studio/UploadZone';

import type { PinterestPin } from '@/lib/pinterest/types';
import type { Reference } from '@/lib/types';

type WizardStep1InspirationProps = {
  initialPins: PinterestPin[];
  workingSet: Reference[];
  previewUrls: Record<string, string>;
  onAddReference: (reference: Reference, previewUrl: string) => void;
  onRemoveReference: (referenceId: string) => void;
  onContinue: () => void;
};

export function WizardStep1Inspiration({
  initialPins,
  workingSet,
  previewUrls,
  onAddReference,
  onRemoveReference,
  onContinue,
}: WizardStep1InspirationProps) {
  const countLabel = `${workingSet.length} reference${workingSet.length === 1 ? '' : 's'}`;

  return (
    <section className="space-y-5" aria-labelledby="wizard-step-1-heading">
      <div className="space-y-1">
        <h2
          id="wizard-step-1-heading"
          className="text-2xl font-semibold text-foreground"
        >
          Inspiration
        </h2>
        <p className="text-sm text-muted-foreground">{countLabel}</p>
      </div>

      {workingSet.length > 0 ? (
        <div
          className="flex gap-3 overflow-x-auto rounded-2xl border border-border bg-card/50 p-3"
          aria-label="Selected references"
        >
          {workingSet.map((reference) => {
            const src =
              previewUrls[reference.id] ?? reference.sourceUrl ?? null;
            return (
              <div
                key={reference.id}
                className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted"
              >
                {src ? (
                  <Image
                    src={src}
                    alt={`Selected reference ${reference.id}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveReference(reference.id)}
                  aria-label={`Remove reference ${reference.id}`}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/85 text-foreground shadow ring-1 ring-border hover:bg-background"
                >
                  <span aria-hidden="true" className="text-xs leading-none">
                    ×
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialPins.map((pin) => (
          <SelectablePinCard key={pin.id} pin={pin} onAdd={onAddReference} />
        ))}
        <UploadZone onAdd={onAddReference} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={workingSet.length === 0}
          className="rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm text-[color:var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue →
        </button>
      </div>
    </section>
  );
}
