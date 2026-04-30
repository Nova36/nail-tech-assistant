'use client';

type PromptInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PromptInput({ value, onChange }: PromptInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="prompt-input"
        className="text-sm font-medium text-foreground"
      >
        Prompt
      </label>
      <textarea
        id="prompt-input"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        maxLength={1000}
        rows={5}
        className="w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        placeholder="Chrome accents, milky base, celestial shimmer..."
      />
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>Optional. Add notes — text overrides visual cues from references.</p>
        <p>{value.length} / 1000</p>
      </div>
    </div>
  );
}
