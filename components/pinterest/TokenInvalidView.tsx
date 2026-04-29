import React from 'react';

import { tokenInvalidCopy } from '@/lib/pinterest/token-replacement-copy';

export function TokenInvalidView() {
  return (
    <section
      data-component="TokenInvalidView"
      role="status"
      aria-live="polite"
      aria-labelledby="token-invalid-heading"
      className="b4-mount-fade mx-auto max-w-xl px-6 py-12"
    >
      <div className="mb-6 flex justify-center">
        <svg
          data-role="glyph"
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 13a5 5 0 0 0 0 7l2.5 2.5" />
          <path d="M10.5 17.5l-2.5 2.5a5 5 0 0 0 7 7" />
          <path d="M26 27a5 5 0 0 0 0-7l-2.5-2.5" />
          <path d="M29.5 22.5l2.5-2.5a5 5 0 0 0-7-7" />
          <path d="M18 11l1.5 1.5M22 11l-1.5 1.5" strokeWidth="1" />
          <path d="M18 29l1.5-1.5M22 29l-1.5-1.5" strokeWidth="1" />
        </svg>
      </div>

      <h1
        id="token-invalid-heading"
        className="text-center font-heading-display text-4xl font-light leading-[1.08] tracking-[-0.025em] text-foreground"
      >
        <span className="sr-only">{tokenInvalidCopy.heading}</span>
        Pinterest needs a <em className="italic text-primary">fresh token</em>
      </h1>

      <p className="mx-auto mt-5 max-w-md text-center text-sm leading-6 text-muted-foreground">
        {tokenInvalidCopy.summary}
      </p>

      <ol data-component="RemediationSteps" className="mt-10 space-y-5">
        {tokenInvalidCopy.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-5">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary text-[13px] font-medium text-primary"
            >
              {index + 1}
            </span>
            <p className="pt-1 text-sm leading-6 text-foreground">{step}</p>
          </li>
        ))}
      </ol>

      <a
        className="link-action mt-8 inline-block py-1 text-primary"
        href={tokenInvalidCopy.pinterestPortalUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Pinterest developer portal <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
