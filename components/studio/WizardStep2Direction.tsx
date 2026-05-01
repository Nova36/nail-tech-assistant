'use client';

import { PromptInput } from '@/components/studio/PromptInput';
import { ReferenceCard } from '@/components/studio/ReferenceCard';
import { ShapeSelector } from '@/components/studio/ShapeSelector';

import type { NailShape, Reference } from '@/lib/types';

type WizardStep2DirectionProps = {
  workingSet: Reference[];
  previewUrls: Record<string, string>;
  primary: Reference | null;
  secondaryOrder: string[];
  promptText: string;
  nailShape: NailShape;
  onMarkPrimary: (reference: Reference) => void;
  onPromptChange: (value: string) => void;
  onShapeChange: (value: NailShape) => void;
  onBack: () => void;
  onGenerate: () => void | Promise<void>;
  pending: boolean;
  error: string | null;
};

export function WizardStep2Direction({
  workingSet,
  previewUrls,
  primary,
  secondaryOrder,
  promptText,
  nailShape,
  onMarkPrimary,
  onPromptChange,
  onShapeChange,
  onBack,
  onGenerate,
  pending,
}: WizardStep2DirectionProps) {
  const canGenerate = Boolean(primary) && !pending && promptText.length <= 1000;

  return (
    <section className="space-y-6" aria-labelledby="wizard-step-2-heading">
      <div className="space-y-1">
        <h2
          id="wizard-step-2-heading"
          className="text-2xl font-semibold text-foreground"
        >
          Direction
        </h2>
        <p className="text-sm text-muted-foreground">
          Choose the lead reference and add optional prompt guidance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workingSet.map((reference) => (
          <ReferenceCard
            key={reference.id}
            reference={reference}
            previewUrl={previewUrls[reference.id]}
            isPrimary={primary?.id === reference.id}
            onMarkPrimary={() => onMarkPrimary(reference)}
          />
        ))}
      </div>

      <PromptInput value={promptText} onChange={onPromptChange} />
      <ShapeSelector value={nailShape} onChange={onShapeChange} />

      <input
        type="hidden"
        value={secondaryOrder.join(',')}
        readOnly
        aria-hidden="true"
      />

      {!primary ? (
        <p className="text-sm text-muted-foreground">
          Pick a primary reference to enable generation.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-border px-5 py-2.5 text-sm text-foreground"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={!canGenerate}
          className="rounded-full bg-[color:var(--primary)] px-5 py-2.5 text-sm text-[color:var(--primary-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Generating…' : 'Generate →'}
        </button>
      </div>
    </section>
  );
}
