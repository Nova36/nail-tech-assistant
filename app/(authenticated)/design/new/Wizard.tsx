'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createDesign } from '@/app/(authenticated)/design/actions';
import { WizardProgressStrip } from '@/components/studio/WizardProgressStrip';
import { WizardStep1Inspiration } from '@/components/studio/WizardStep1Inspiration';
import { WizardStep2Direction } from '@/components/studio/WizardStep2Direction';

import type { PinterestPin } from '@/lib/pinterest/types';
import type { NailShape, Reference } from '@/lib/types';

export type WizardProps = {
  initialPins: PinterestPin[];
};

export function Wizard({ initialPins }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [workingSet, setWorkingSet] = useState<Reference[]>([]);
  const [primary, setPrimary] = useState<Reference | null>(null);
  const [secondaryOrder] = useState<string[]>([]);
  const [promptText, setPromptText] = useState('');
  const [nailShape, setNailShape] = useState<NailShape>('almond');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function addReference(reference: Reference) {
    setError(null);
    setWorkingSet((current) => {
      if (current.some((item) => item.id === reference.id)) {
        return current;
      }

      return [...current, reference];
    });
  }

  async function handleGenerate() {
    if (!primary || pending || promptText.length > 1000) {
      return;
    }

    setPending(true);
    setError(null);

    const result = await createDesign({
      primaryReferenceId: primary.id,
      secondaryReferenceIds: secondaryOrder.filter((id) => id !== primary.id),
      promptText,
      nailShape,
    });

    if (result.ok) {
      router.push(`/design/${result.designId}`);
      return;
    }

    setError('Permission denied — please sign in again.');
    setPending(false);
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[color:var(--primary)]/30 bg-[color:var(--primary)]/10 px-4 py-3 text-sm text-foreground"
        >
          Permission denied — please sign in again.
        </div>
      ) : null}

      <WizardProgressStrip step={step} />

      {step === 1 ? (
        <WizardStep1Inspiration
          initialPins={initialPins}
          workingSet={workingSet}
          onAddReference={addReference}
          onContinue={() => {
            setError(null);
            setStep(2);
          }}
        />
      ) : (
        <WizardStep2Direction
          workingSet={workingSet}
          primary={primary}
          secondaryOrder={secondaryOrder}
          promptText={promptText}
          nailShape={nailShape}
          onMarkPrimary={(reference) => {
            setError(null);
            setPrimary(reference);
          }}
          onPromptChange={(value) => {
            setError(null);
            setPromptText(value);
          }}
          onShapeChange={(value) => {
            setError(null);
            setNailShape(value);
          }}
          onBack={() => {
            setError(null);
            setStep(1);
          }}
          onGenerate={handleGenerate}
          pending={pending}
          error={error}
        />
      )}
    </div>
  );
}
