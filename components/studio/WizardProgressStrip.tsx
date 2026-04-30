'use client';

type WizardProgressStripProps = {
  step: 1 | 2 | 3;
};

const STEPS = [
  { value: 1, label: '1 Inspiration' },
  { value: 2, label: '2 Direction' },
  { value: 3, label: '3 Confirm' },
] as const;

export function WizardProgressStrip({ step }: WizardProgressStripProps) {
  return (
    <div className="flex flex-wrap gap-3" aria-label="Wizard progress">
      {STEPS.map((item) => {
        const isCurrent = item.value === step;
        const isDisabled = item.value !== 1;

        return (
          <button
            key={item.value}
            type="button"
            className={`rounded-full border px-4 py-2 text-sm transition ${
              isCurrent
                ? 'border-[color:var(--primary)] bg-[color:var(--primary)] text-[color:var(--primary-foreground)]'
                : 'border-border bg-background text-muted-foreground'
            }`}
            {...(isCurrent ? { 'aria-current': 'step' as const } : {})}
            disabled={isDisabled}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
