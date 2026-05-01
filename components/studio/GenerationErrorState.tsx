'use client';

import type { GenerateDesignErrorCode } from '@/app/(authenticated)/design/actions';

type GenerationErrorStateProps = {
  errorCode: GenerateDesignErrorCode;
  message: string;
  onAdjust: () => void;
  onRetry?: () => void;
};

const ERROR_COPY: Record<
  GenerateDesignErrorCode,
  {
    heading: string;
    body: string;
    primaryCta: string;
    secondaryCta?: string;
  }
> = {
  refusal: {
    heading: "We couldn't generate this design.",
    body: 'The image model declined the request. This sometimes happens with certain prompts or references. Try adjusting.',
    primaryCta: '← Back to adjust',
    secondaryCta: 'Use different references',
  },
  rate_limit: {
    heading: 'Generation paused — too many requests.',
    body: "We hit the model's rate limit and the auto-retry didn't recover. Try again in a moment.",
    primaryCta: 'Try again',
    secondaryCta: '← Back to adjust',
  },
  network: {
    heading: "Couldn't reach the image model.",
    body: "Network hiccup. The auto-retry didn't recover. Check your connection and try again.",
    primaryCta: 'Try again',
    secondaryCta: '← Back to adjust',
  },
  storage_fail: {
    heading: "Generated, but couldn't save.",
    body: "The image was created but we couldn't store it. Try again — your reference set is preserved.",
    primaryCta: 'Try again',
    secondaryCta: '← Back to adjust',
  },
  low_quality: {
    heading: "The result wasn't great.",
    body: "The model returned something that didn't match your references well. Adjusting your prompt or reference set usually helps.",
    primaryCta: '← Back to adjust',
    secondaryCta: 'Try again anyway',
  },
  unauthorized: {
    heading: 'Something went wrong.',
    body: "We couldn't complete this design. Adjust your inputs and try again.",
    primaryCta: '← Back to adjust',
  },
  invalid_input: {
    heading: 'Something went wrong.',
    body: "We couldn't complete this design. Adjust your inputs and try again.",
    primaryCta: '← Back to adjust',
  },
  design_not_found: {
    heading: 'Something went wrong.',
    body: "We couldn't complete this design. Adjust your inputs and try again.",
    primaryCta: '← Back to adjust',
  },
  design_unauthorized: {
    heading: 'Something went wrong.',
    body: "We couldn't complete this design. Adjust your inputs and try again.",
    primaryCta: '← Back to adjust',
  },
  unknown: {
    heading: 'Something went wrong.',
    body: "We couldn't complete this design. Adjust your inputs and try again.",
    primaryCta: '← Back to adjust',
  },
};

export function GenerationErrorState({
  errorCode,
  message,
  onAdjust,
  onRetry,
}: GenerationErrorStateProps) {
  const copy = ERROR_COPY[errorCode];
  const primaryAction = copy.primaryCta.toLowerCase().includes('try again')
    ? onRetry
    : onAdjust;
  const secondaryAction = copy.secondaryCta?.toLowerCase().includes('try again')
    ? onRetry
    : onAdjust;

  return (
    <section
      role="alert"
      className="space-y-5 rounded-[28px] border border-[color:var(--primary)]/20 bg-card/80 p-6 shadow-[0_20px_50px_rgba(61,53,48,0.08)]"
      data-message={message}
    >
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Step 3 of 3
        </p>
        <h2 className="font-heading-display text-3xl font-light tracking-[-0.03em] text-foreground md:text-4xl">
          {copy.heading}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">{copy.body}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={primaryAction}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[0_6px_16px_rgba(107,63,94,0.25)]"
        >
          {copy.primaryCta}
        </button>
        {copy.secondaryCta && secondaryAction ? (
          <button
            type="button"
            onClick={secondaryAction}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground"
          >
            {copy.secondaryCta}
          </button>
        ) : null}
      </div>
    </section>
  );
}
