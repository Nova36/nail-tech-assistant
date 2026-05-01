'use client';

import Image from 'next/image';

import type { Reference } from '@/lib/types';

type ReferenceCardProps = {
  reference: Reference;
  isPrimary: boolean;
  previewUrl?: string;
  onMarkPrimary?: () => void;
  onRemove?: () => void;
};

export function ReferenceCard({
  reference,
  isPrimary,
  previewUrl,
  onMarkPrimary,
}: ReferenceCardProps) {
  const imageSrc = previewUrl ?? reference.sourceUrl ?? null;
  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative aspect-square w-full bg-muted">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`Reference ${reference.id}`}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Uploaded reference
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium capitalize text-foreground">
            {reference.source}
          </p>
          {isPrimary ? (
            <span className="rounded-full bg-[color:var(--primary)] px-3 py-1 text-xs font-medium text-[color:var(--primary-foreground)]">
              Primary
            </span>
          ) : null}
        </div>

        {!isPrimary ? (
          <button
            type="button"
            onClick={onMarkPrimary}
            className="rounded-full border border-border px-4 py-2 text-sm text-foreground"
          >
            Mark as primary
          </button>
        ) : null}
      </div>
    </article>
  );
}
