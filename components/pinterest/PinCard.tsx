'use client';

import Image from 'next/image';
import React from 'react';

import type { PinterestPin } from '@/lib/pinterest/types';

const COVER_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f0ebe3'/%3E%3Cstop offset='100%25' stop-color='%23d4a5a8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='400' fill='url(%23g)'/%3E%3C/svg%3E";

function getPinImageUrl(pin: PinterestPin): string {
  const images = pin.media?.images;

  return (
    images?.['600x']?.url ??
    images?.['400x300']?.url ??
    images?.['150x150']?.url ??
    Object.values(images ?? {})[0]?.url ??
    COVER_DATA_URI
  );
}

function getPinTitle(pin: PinterestPin): string {
  return pin.title?.trim() || pin.alt_text?.trim() || 'Pinterest pin';
}

export function PinCard({ pin }: { pin: PinterestPin }) {
  const title = getPinTitle(pin);
  const href = pin.link || `https://www.pinterest.com/pin/${pin.id}`;

  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${title} - opens in Pinterest`}
        data-component="PinCard"
        className="block min-h-[44px] overflow-hidden rounded-[28px] border border-transparent bg-card shadow-[0_12px_32px_rgba(61,53,48,0.08)] outline-none transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-[color:color-mix(in_oklab,var(--primary-tint)_55%,transparent)] hover:shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--primary)_20%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <div className="relative aspect-square overflow-hidden rounded-t-[28px] bg-secondary">
          <Image
            src={getPinImageUrl(pin)}
            alt={title}
            fill
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 50vw, 33vw"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="p-5">
          <h3 className="line-clamp-2 font-heading-display text-lg font-medium leading-snug text-foreground">
            {title}
          </h3>
        </div>
      </a>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [data-component='PinCard'],
          [data-component='PinCard']:hover {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </>
  );
}
