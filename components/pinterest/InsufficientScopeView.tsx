import React from 'react';

import { insufficientScopeCopy } from '@/lib/pinterest/token-replacement-copy';

export function InsufficientScopeView() {
  return (
    <section
      data-component="InsufficientScopeView"
      role="status"
      aria-live="polite"
      aria-labelledby="insufficient-scope-heading"
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
          <circle cx="20" cy="13" r="4" />
          <path d="M15 18l-4 2.5v4l-1.5 1.5 1.5 1.5M11 23h-1.5" />
          <path d="M25 18l4 2.5v4l1.5 1.5-1.5 1.5M29 23h1.5" />
          <path d="M17 18l1 4a2 2 0 1 1-1.5 3" strokeDasharray="2.5 2.5" />
          <circle
            cx="20"
            cy="28"
            r="0.8"
            fill="var(--muted-foreground)"
            stroke="none"
          />
        </svg>
      </div>

      <h1
        id="insufficient-scope-heading"
        className="text-center font-heading-display text-4xl font-light leading-[1.08] tracking-[-0.025em] text-foreground"
      >
        <span className="sr-only">{insufficientScopeCopy.heading}</span>
        Pinterest needs <em className="italic text-primary">broader access</em>
      </h1>

      <p className="mx-auto mt-5 max-w-md text-center text-sm leading-6 text-muted-foreground">
        {insufficientScopeCopy.summary}
      </p>

      <ol data-component="RemediationSteps" className="mt-10 space-y-5">
        {insufficientScopeCopy.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-5">
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent text-[13px] font-medium text-primary"
            >
              {index + 1}
            </span>
            <p className="pt-1 text-sm leading-6 text-foreground">{step}</p>
          </li>
        ))}
      </ol>

      <a
        className="link-action mt-8 inline-block py-1 text-primary"
        href={insufficientScopeCopy.pinterestPortalUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Pinterest developer portal <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}
