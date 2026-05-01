'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { NailVisualizer, VisualizerFrame } from '@/components/NailVisualizer';
import { GenerateButton } from '@/components/studio/GenerateButton';
import { GenerationErrorState } from '@/components/studio/GenerationErrorState';
import { ShapeSelector } from '@/components/studio/ShapeSelector';
import { WizardProgressStrip } from '@/components/studio/WizardProgressStrip';

import type {
  GenerateDesignErrorCode,
  GenerateDesignResult,
} from '@/app/(authenticated)/design/actions';
import type { NailShape } from '@/lib/types';

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

export function Confirm({
  designId,
  nailShape,
  promptText,
  latestGenerationId,
}: ConfirmProps) {
  const router = useRouter();
  const initialShape = (nailShape ?? 'almond') as NailShape;
  const [state, setState] = useState<GenerationState>(
    latestGenerationId ? { phase: 'idle' } : { phase: 'pending' }
  );
  const [activeShape, setActiveShape] = useState<NailShape>(initialShape);
  const [shapeUpdateError, setShapeUpdateError] = useState<string | null>(null);
  const firedRef = useRef(false);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const shapeRequestIdRef = useRef(0);

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

  useEffect(() => {
    if (state.phase === 'failure') {
      errorHeadingRef.current?.focus();
    }
  }, [state.phase]);

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

  async function onShapeChange(nextShape: NailShape) {
    if (state.phase !== 'success' || nextShape === activeShape) {
      return;
    }

    const previousShape = activeShape;
    const requestId = shapeRequestIdRef.current + 1;
    shapeRequestIdRef.current = requestId;
    setShapeUpdateError(null);
    setActiveShape(nextShape);

    try {
      const response = await fetch(`/api/designs/${designId}/shape`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nailShape: nextShape }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('[design-page] shape patch failed', {
          code: response.status,
          message: responseText || response.statusText,
        });

        if (shapeRequestIdRef.current === requestId) {
          setActiveShape(previousShape);
          setShapeUpdateError('Shape update failed');
        }
      }
    } catch (error) {
      console.error('[design-page] shape patch failed', {
        code: 'network_error',
        message: error instanceof Error ? error.message : String(error),
      });

      if (shapeRequestIdRef.current === requestId) {
        setActiveShape(previousShape);
        setShapeUpdateError('Shape update failed');
      }
    }
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
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Step 3 of 3
              </p>
              <h2 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground md:text-5xl">
                Here&apos;s your design.
              </h2>
              <p className="mx-auto max-w-prose text-sm text-muted-foreground">
                Save it to your Library, try another version, or step back and
                adjust.
              </p>
            </div>

            <VisualizerFrame>
              {/* sr-only off-screen img for screen readers; the visualizer
                  SVG above is aria-hidden. Next/Image not used because LCP
                  is irrelevant for sr-only content. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.imageUrl}
                alt="Generated nail design preview"
                className="sr-only"
              />
              <div data-testid="nail-visualizer" aria-hidden="true">
                <NailVisualizer
                  theme="flat"
                  imageUrl={state.imageUrl}
                  nailShape={activeShape}
                />
              </div>
              <div data-testid="shape-selector">
                <ShapeSelector value={activeShape} onChange={onShapeChange} />
              </div>
            </VisualizerFrame>

            {promptText ? (
              <div className="rounded-[24px] border border-border/70 bg-card/70 p-4 text-sm shadow-[0_20px_50px_rgba(61,53,48,0.08)]">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Prompt
                </p>
                <p className="mt-2 text-foreground">{promptText}</p>
              </div>
            ) : null}

            {shapeUpdateError ? (
              <p role="alert" className="text-sm text-destructive">
                {shapeUpdateError}
              </p>
            ) : null}

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => router.push('/design/new')}
                className="min-h-[44px] text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
              >
                ← Back to adjust
              </button>
            </div>
          </div>
        ) : null}
        {state.phase === 'failure' ? (
          <GenerationErrorState
            errorCode={state.errorCode}
            message={state.message}
            onAdjust={() => router.push('/design/new')}
            onRetry={retry}
            headingRef={errorHeadingRef}
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
