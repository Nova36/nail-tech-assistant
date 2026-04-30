'use client';

import { SelectablePinCard } from '@/components/studio/SelectablePinCard';
import { UploadZone } from '@/components/studio/UploadZone';

import type { PinterestPin } from '@/lib/pinterest/types';
import type { Reference } from '@/lib/types';

type WizardStep1InspirationProps = {
  initialPins: PinterestPin[];
  workingSet: Reference[];
  onAddReference: (reference: Reference) => void;
  onContinue: () => void;
};

export function WizardStep1Inspiration({
  initialPins,
  workingSet,
  onAddReference,
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
