'use client';

export interface ErrorSurfaceProps {
  title: string;
  message: string;
  recoveryAction?: {
    label: string;
    action: () => void;
  };
}

export function ErrorSurface({
  title,
  message,
  recoveryAction,
}: ErrorSurfaceProps) {
  return (
    <section
      role="alert"
      className="space-y-5 rounded-[28px] border border-[color:var(--primary)]/20 bg-card/80 p-6 shadow-[0_20px_50px_rgba(61,53,48,0.08)]"
    >
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          </svg>
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-foreground">{title}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      {recoveryAction ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={recoveryAction.action}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[0_6px_16px_rgba(107,63,94,0.25)] focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
          >
            {recoveryAction.label}
          </button>
        </div>
      ) : null}
    </section>
  );
}
