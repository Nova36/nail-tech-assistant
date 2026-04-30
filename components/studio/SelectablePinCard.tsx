'use client';

import Image from 'next/image';
import { useState } from 'react';

import { selectPinterestPin } from '@/app/(authenticated)/design/actions';

import type { PinterestPin } from '@/lib/pinterest/types';
import type { Reference } from '@/lib/types';

type SelectablePinCardProps = {
  pin: PinterestPin;
  onAdd: (reference: Reference) => void;
  onError?: (reason: string, message: string) => void;
};

function getPinImageUrl(pin: PinterestPin): string {
  return (
    pin.media?.images?.['600x']?.url ??
    Object.values(pin.media?.images ?? {}).find((image) => image?.url)?.url ??
    ''
  );
}

export function SelectablePinCard({
  pin,
  onAdd,
  onError,
}: SelectablePinCardProps) {
  const [pending, setPending] = useState(false);
  const title = pin.title || pin.alt_text || 'pin';
  const imageUrl = getPinImageUrl(pin);

  async function handleSelect() {
    if (pending) {
      return;
    }

    setPending(true);
    const result = await selectPinterestPin(pin.id);

    if (result.ok) {
      onAdd(result.reference);
    } else {
      onError?.(result.reason, result.message);
    }

    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleSelect()}
      disabled={pending}
      aria-label={`Select ${title}`}
      className="group overflow-hidden rounded-3xl border border-border bg-card text-left disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="relative aspect-square w-full bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition group-hover:scale-[1.01]"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No preview
          </div>
        )}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Pinterest
        </p>
      </div>
    </button>
  );
}
