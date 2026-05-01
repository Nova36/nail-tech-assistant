'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { GenerateButton } from '@/components/studio/GenerateButton';
import { GenerationErrorState } from '@/components/studio/GenerationErrorState';
import { GenerationPreview } from '@/components/studio/GenerationPreview';
import { WizardProgressStrip } from '@/components/studio/WizardProgressStrip';

import type {
  GenerateDesignErrorCode,
  GenerateDesignResult,
} from '@/app/(authenticated)/design/actions';

type ConfirmProps = {
  designId: string;
  nailShape?: string | null;
  promptText?: string | null;
  latestGenerationId?: string | null;
};

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | { phase: 'success'; generationId: string; imageUrl: string }
  | {
      phase: 'failure';
      errorCode: GenerateDesignErrorCode;
      message: string;
    };

const STATUS_COPY: Record<'pending' | 'success', string> = {
  pending: 'Generating · ~10s',
  success: 'Result ready',
};

const FAILURE_STATUS_COPY: Record<GenerateDesignErrorCode, string> = {
  refusal: "Couldn't generate",
  rate_limit: 'Generation paused',
  network: "Couldn't reach the model",
  storage_fail: "Couldn't save",
  low_quality: "Result wasn't great",
  unauthorized: 'Something went wrong',
  invalid_input: 'Something went wrong',
  design_not_found: 'Something went wrong',
  design_unauthorized: 'Something went wrong',
  unknown: 'Something went wrong',
};

async function runGenerateDesign(
  designId: string
): Promise<GenerateDesignResult> {
  const { generateDesign } =
    await import('@/app/(authenticated)/design/actions');
  return generateDesign({ designId });
}

function PendingView() {
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
            <div className="nail-fill absolute inset-x-5 bottom-4 top-1/2 rounded-[999px] bg-[color:var(--primary)] motion-safe:animate-pulse" />
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

export function Confirm({
  designId,
  nailShape,
  promptText,
  latestGenerationId,
}: ConfirmProps) {
  const router = useRouter();
  const [state, setState] = useState<GenerationState>(
    latestGenerationId ? { phase: 'idle' } : { phase: 'pending' }
  );
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current || latestGenerationId) {
      return;
    }

    firedRef.current = true;

    void (async () => {
      const result = await runGenerateDesign(designId);
      if (result.status === 'success') {
        setState({
          phase: 'success',
          generationId: result.generationId,
          imageUrl: result.imageUrl,
        });
        return;
      }

      setState({
        phase: 'failure',
        errorCode: result.errorCode,
        message: result.message,
      });
    })();
  }, [designId, latestGenerationId]);

  function retry() {
    firedRef.current = true;
    setState({ phase: 'pending' });

    void (async () => {
      const result = await runGenerateDesign(designId);
      if (result.status === 'success') {
        setState({
          phase: 'success',
          generationId: result.generationId,
          imageUrl: result.imageUrl,
        });
        return;
      }

      setState({
        phase: 'failure',
        errorCode: result.errorCode,
        message: result.message,
      });
    })();
  }

  const statusText =
    state.phase === 'pending'
      ? STATUS_COPY.pending
      : state.phase === 'success'
        ? STATUS_COPY.success
        : state.phase === 'failure'
          ? FAILURE_STATUS_COPY[state.errorCode]
          : 'Result already generated';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <WizardProgressStrip step={3} />
        <span
          className="ml-auto text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          aria-live="polite"
        >
          {statusText}
        </span>
      </div>

      <div
        role="region"
        aria-label="Result"
        aria-busy={state.phase === 'pending' ? 'true' : 'false'}
      >
        {state.phase === 'pending' ? <PendingView /> : null}
        {state.phase === 'success' ? (
          <GenerationPreview
            imageUrl={state.imageUrl}
            nailShape={nailShape}
            promptText={promptText}
            onAdjust={() => router.push('/design/new')}
          />
        ) : null}
        {state.phase === 'failure' ? (
          <GenerationErrorState
            errorCode={state.errorCode}
            message={state.message}
            onAdjust={() => router.push('/design/new')}
            onRetry={retry}
          />
        ) : null}
        {state.phase === 'idle' ? (
          <div className="rounded-[28px] border border-border/70 bg-card/70 p-6 text-sm text-muted-foreground shadow-[0_20px_50px_rgba(61,53,48,0.08)]">
            Result already generated.
          </div>
        ) : null}
      </div>
    </section>
  );
}
