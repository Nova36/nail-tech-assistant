'use client';

import { useState } from 'react';

type Props = { designId: string; initialName: string | null };
type Mode = 'idle-named' | 'idle-unnamed' | 'editing';

function normalizeClientName(name: string): string | null {
  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

export function DesignNameField({ designId, initialName }: Props) {
  const initialNormalizedName =
    initialName && initialName.trim().length > 0 ? initialName : null;

  const [mode, setMode] = useState<Mode>(
    initialNormalizedName ? 'idle-named' : 'idle-unnamed'
  );
  const [currentName, setCurrentName] = useState<string | null>(
    initialNormalizedName
  );
  const [priorName, setPriorName] = useState<string | null>(
    initialNormalizedName
  );
  const [draftName, setDraftName] = useState(initialNormalizedName ?? '');
  const [error, setError] = useState<string | null>(null);

  async function submitName(rawName: string) {
    const nextName = normalizeClientName(rawName);
    const previousName = currentName;

    setPriorName(previousName);
    setCurrentName(nextName);
    setMode(nextName ? 'idle-named' : 'idle-unnamed');
    setError(null);

    try {
      const response = await fetch(`/api/designs/${designId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName }),
      });

      if (response.ok) {
        setDraftName(nextName ?? '');
        setError(null);
        return;
      }
    } catch {
      // Network failures should follow the same user-facing recovery path.
    }

    setCurrentName(previousName);
    setPriorName(previousName);
    setDraftName(previousName ?? '');
    setMode(previousName ? 'idle-named' : 'idle-unnamed');
    setError('Unable to save design name.');
  }

  function beginEditing() {
    setPriorName(currentName);
    setDraftName(currentName ?? '');
    setError(null);
    setMode('editing');
  }

  function cancelEditing() {
    setCurrentName(priorName);
    setDraftName(priorName ?? '');
    setError(null);
    setMode(priorName ? 'idle-named' : 'idle-unnamed');
  }

  function renderInput(placeholder?: string) {
    return (
      <input
        type="text"
        value={draftName}
        placeholder={placeholder}
        onChange={(event) => setDraftName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void submitName(draftName);
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            if (mode === 'editing') {
              cancelEditing();
              return;
            }

            setDraftName('');
            setError(null);
          }
        }}
        className="min-h-[44px] w-full rounded-full border border-border/70 bg-background px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
      />
    );
  }

  return (
    <section
      data-component="DesignNameField"
      className="mb-6 rounded-[24px] border border-border/70 bg-card/70 p-4 shadow-[0_20px_50px_rgba(61,53,48,0.08)]"
    >
      {mode === 'idle-unnamed' ? (
        <div className="space-y-2">
          {renderInput('Name this design…')}
          <p className="text-sm text-muted-foreground">
            Press Enter to save name
          </p>
        </div>
      ) : null}

      {mode === 'idle-named' && currentName ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-heading-display text-2xl font-light tracking-[-0.03em] text-foreground">
            {currentName}
          </span>
          <button
            type="button"
            onClick={beginEditing}
            className="min-h-[44px] rounded-full border border-border/70 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
          >
            Rename
          </button>
        </div>
      ) : null}

      {mode === 'editing' ? (
        <div className="space-y-3">
          {renderInput()}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitName(draftName)}
              className="min-h-[44px] rounded-full bg-foreground px-4 text-sm text-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="min-h-[44px] rounded-full border border-border/70 px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
