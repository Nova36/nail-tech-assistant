'use client';

import { useRef, useState } from 'react';

type Props = {
  designId: string;
  onSuccess: (payload: {
    generationId: string;
    imageUrl?: string;
    nailSwatchUrl?: string | null;
  }) => void;
};

type ResponseBody = {
  status?: string;
  generationId?: string;
  imageUrl?: string;
  nailSwatchUrl?: string | null;
  message?: string;
};

export function RegenerateButton({ designId, onSuccess }: Props) {
  const [mode, setMode] = useState<'idle' | 'regenerating' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  async function handleClick() {
    if (mode === 'regenerating' || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setMode('regenerating');
    setError(null);

    try {
      const response = await fetch(`/api/designs/${designId}/regenerate`, {
        method: 'POST',
      });

      let body: ResponseBody | null = null;
      try {
        body = (await response.json()) as ResponseBody;
      } catch {
        body = null;
      }

      if (!response.ok) {
        setMode('failed');
        setError(body?.message || "Couldn't regenerate");
        return;
      }

      if (body?.status === 'success' && body.generationId) {
        onSuccess({
          generationId: body.generationId,
          imageUrl: body.imageUrl,
          nailSwatchUrl: body.nailSwatchUrl,
        });
        setMode('idle');
        return;
      }

      setMode('failed');
      setError(body?.message || "Couldn't regenerate");
    } catch {
      setMode('failed');
      setError("Couldn't regenerate");
    } finally {
      inFlightRef.current = false;
    }
  }

  const isRegenerating = mode === 'regenerating';

  return (
    <div data-component="RegenerateButton" className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRegenerating}
        aria-busy={isRegenerating ? 'true' : undefined}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-transparent bg-[color:var(--primary)] px-4 py-3 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[0_6px_16px_rgba(107,63,94,0.25)] transition-transform duration-200 hover:translate-y-[-1px] focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {isRegenerating ? 'Generating…' : 'Regenerate'}
      </button>
      {mode === 'failed' && error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
