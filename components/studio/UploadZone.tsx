'use client';

import { useId, useState } from 'react';

import type { Reference } from '@/lib/types';

type UploadZoneProps = {
  onAdd: (reference: Reference) => void;
  onError?: (reason: string, message: string) => void;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadZone({ onAdd, onError }: UploadZoneProps) {
  const inputId = useId();
  const [pending, setPending] = useState(false);

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    if (file.size > MAX_BYTES) {
      onError?.('file_too_large', 'max 10 MB');
      return;
    }

    setPending(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/references/upload', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as
        | { ok: true; reference: Reference }
        | { ok: false; reason: string; message: string };

      if (result.ok) {
        onAdd(result.reference);
      } else {
        onError?.(result.reason, result.message);
      }
    } catch (error) {
      onError?.(
        'network',
        error instanceof Error ? error.message : 'upload failed'
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <label
      htmlFor={inputId}
      className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card px-6 py-8 text-center"
    >
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/heif"
        className="sr-only"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0] ?? null;
          void handleFileChange(file);
          event.currentTarget.value = '';
        }}
      />
      <span className="text-sm font-medium text-foreground">
        {pending ? 'Uploading…' : 'Upload reference'}
      </span>
      <span className="mt-2 text-sm text-muted-foreground">
        JPEG, PNG, HEIC, or HEIF up to 10 MB.
      </span>
    </label>
  );
}
