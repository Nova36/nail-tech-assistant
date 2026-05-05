'use client';

import Link from 'next/link';
import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';

import { DesignNameField } from '@/components/DesignNameField';
import { NailVisualizer } from '@/components/NailVisualizer/NailVisualizer';

import type { Design } from '@/lib/types';

function formatRelativeTime(isoString: string): string {
  const parsed = new Date(isoString);

  if (Number.isNaN(parsed.getTime())) {
    return 'Recently updated';
  }

  const diffMs = parsed.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const weekMs = 7 * dayMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;

  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (absMs < hourMs) {
    value = Math.round(diffMs / minuteMs);
    unit = 'minute';
  } else if (absMs < dayMs) {
    value = Math.round(diffMs / hourMs);
    unit = 'hour';
  } else if (absMs < weekMs) {
    value = Math.round(diffMs / dayMs);
    unit = 'day';
  } else if (absMs < monthMs) {
    value = Math.round(diffMs / weekMs);
    unit = 'week';
  } else if (absMs < yearMs) {
    value = Math.round(diffMs / monthMs);
    unit = 'month';
  } else {
    value = Math.round(diffMs / yearMs);
    unit = 'year';
  }

  if (value === 0) {
    return 'Just now';
  }

  return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
    value,
    unit
  );
}

function stopCardNavigation(
  event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>
) {
  event.stopPropagation();
}

function stopKeyboardCardNavigation(event: KeyboardEvent<HTMLElement>) {
  event.stopPropagation();
}

type Props = {
  design: Design;
  latestImageUrl: string | null;
};

export function DesignCard({ design, latestImageUrl }: Props) {
  const hasName = Boolean(design.name && design.name.trim().length > 0);
  const unnamedFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hasName) {
      return;
    }

    const input = unnamedFieldRef.current?.querySelector('input');
    if (input && !input.getAttribute('aria-label')) {
      input.setAttribute('aria-label', 'Name this design');
    }
  }, [hasName]);

  return (
    <article
      data-component="DesignCard"
      data-testid={`DesignCard-${design.id}`}
      className="group relative overflow-hidden rounded-[28px] border border-border/70 bg-card/70 shadow-[0_20px_50px_rgba(61,53,48,0.08)] transition-transform duration-200 hover:-translate-y-1"
    >
      <Link
        href={`/design/${design.id}`}
        aria-label={
          hasName ? `Open ${design.name}` : `Open design ${design.id}`
        }
        className="absolute inset-0 z-10"
      />

      <div>
        <div className="aspect-[4/3] overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(244,235,229,0.55)_58%,rgba(232,221,212,0.75))] p-4">
          <NailVisualizer
            theme="flat"
            imageUrl={latestImageUrl}
            nailShape={design.nailShape}
          />
        </div>

        <div className="space-y-3 p-5">
          {hasName ? (
            <p className="font-heading-display text-2xl font-light tracking-[-0.03em] text-foreground">
              {design.name}
            </p>
          ) : (
            <div
              ref={unnamedFieldRef}
              className="relative z-20"
              onClickCapture={stopCardNavigation}
              onPointerDownCapture={stopCardNavigation}
              onKeyDownCapture={stopKeyboardCardNavigation}
            >
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Unnamed design
              </p>
              <DesignNameField designId={design.id} initialName={design.name} />
            </div>
          )}

          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Updated{' '}
            <time dateTime={design.updatedAt}>
              {formatRelativeTime(design.updatedAt)}
            </time>
          </p>
        </div>
      </div>
    </article>
  );
}
