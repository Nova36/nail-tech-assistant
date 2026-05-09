'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  ChatRefinementPanel,
  type ChatTurnView,
} from '@/components/ChatRefinementPanel';
import { IterationTimeline } from '@/components/IterationTimeline';
import { GenerationPending } from '@/components/LoadingStates';
import { VisualizerFrame } from '@/components/NailVisualizer';
import { RegenerateButton } from '@/components/RegenerateButton';
import { GenerationErrorState } from '@/components/studio/GenerationErrorState';
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
  initialImageUrl?: string | null;
  initialSwatchUrl?: string | null;
  initialChatTurns?: ChatTurnView[];
  designName?: string | null;
};

type GenerationState =
  | { phase: 'idle' }
  | { phase: 'pending' }
  | {
      phase: 'success';
      generationId: string;
      imageUrl: string;
      swatchUrl: string | null;
    }
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

export function Confirm({
  designId,
  promptText,
  latestGenerationId,
  initialImageUrl,
  initialSwatchUrl,
  initialChatTurns = [],
  designName,
}: ConfirmProps) {
  const router = useRouter();
  const [chatTurns] = useState<ChatTurnView[]>(initialChatTurns);
  const [viewingTurnIndex, setViewingTurnIndex] = useState<number | null>(null);
  const [state, setState] = useState<GenerationState>(
    initialImageUrl && latestGenerationId
      ? {
          phase: 'success',
          generationId: latestGenerationId,
          imageUrl: initialImageUrl,
          swatchUrl: initialSwatchUrl ?? null,
        }
      : latestGenerationId
        ? { phase: 'idle' }
        : { phase: 'pending' }
  );
  const firedRef = useRef(false);
  const errorHeadingRef = useRef<HTMLHeadingElement>(null);
  const priorSuccessRef = useRef<Extract<
    GenerationState,
    { phase: 'success' }
  > | null>(null);

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
          swatchUrl: result.nailSwatchUrl ?? null,
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
          swatchUrl: result.nailSwatchUrl ?? null,
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
  const orderedChatTurns = [...chatTurns].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );
  const selectedTurn =
    viewingTurnIndex !== null
      ? (orderedChatTurns[viewingTurnIndex] ?? null)
      : null;
  const visualizerImageUrl =
    state.phase === 'success'
      ? (selectedTurn?.imageUrl ?? state.imageUrl)
      : null;

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
        {state.phase === 'pending' ? <GenerationPending /> : null}
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
            <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)] md:items-start">
              <div className="space-y-6">
                <VisualizerFrame>
                  <div
                    data-testid="nail-visualizer"
                    className="flex justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={visualizerImageUrl ?? ''}
                      alt="Generated nail design preview"
                      className="h-auto w-full max-w-[640px] rounded-[20px] object-contain"
                    />
                  </div>
                </VisualizerFrame>

                <div className="hidden md:block">
                  <IterationTimeline
                    turns={orderedChatTurns}
                    viewingTurnIndex={viewingTurnIndex}
                    onTurnSelect={(turn) => {
                      const nextIndex = turn
                        ? orderedChatTurns.findIndex(
                            (item) => item.id === turn.id
                          )
                        : null;
                      setViewingTurnIndex(nextIndex);
                    }}
                  />
                </div>

                {promptText ? (
                  <div className="rounded-[24px] border border-border/70 bg-card/70 p-4 text-sm shadow-[0_20px_50px_rgba(61,53,48,0.08)]">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      Prompt
                    </p>
                    <p className="mt-2 text-foreground">{promptText}</p>
                  </div>
                ) : null}

                <div className="flex justify-center">
                  <RegenerateButton
                    designId={designId}
                    onStart={() => {
                      if (state.phase === 'success') {
                        priorSuccessRef.current = state;
                      }
                      setViewingTurnIndex(null);
                      setState({ phase: 'pending' });
                    }}
                    onError={() => {
                      if (priorSuccessRef.current) {
                        setState(priorSuccessRef.current);
                      }
                    }}
                    onSuccess={(payload) =>
                      setState({
                        phase: 'success',
                        generationId: payload.generationId,
                        imageUrl:
                          payload.imageUrl ??
                          priorSuccessRef.current?.imageUrl ??
                          '',
                        swatchUrl: payload.nailSwatchUrl ?? null,
                      })
                    }
                  />
                </div>

                <div className="space-y-3 text-center">
                  <div className="block text-sm text-muted-foreground md:hidden">
                    Refinement chat works best on tablet — open this design on
                    your iPad.
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/design/new')}
                    className="min-h-[44px] text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                  >
                    ← Back to adjust
                  </button>
                </div>
              </div>

              <div className="hidden md:flex">
                <ChatRefinementPanel
                  designId={designId}
                  designName={designName}
                  initialChatTurns={orderedChatTurns}
                  viewingTurnIndex={viewingTurnIndex}
                  onTurnImageSelect={(turn) => {
                    const nextIndex = turn
                      ? orderedChatTurns.findIndex(
                          (item) => item.id === turn.id
                        )
                      : null;
                    setViewingTurnIndex(nextIndex);
                  }}
                />
              </div>
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
