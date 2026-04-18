'use client';

import { useActionState, useEffect, useRef, useState } from 'react';

import { loginAction, type LoginActionState } from './actions';

const initialState: LoginActionState = { status: 'idle' };

function BrandMark() {
  return (
    <svg
      viewBox="0 0 240 80"
      aria-hidden="true"
      className="h-auto w-[168px]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g transform="translate(8, 4)">
        <rect x="5" y="0" width="14" height="9" rx="2" fill="#D4A5A8" />
        <rect x="8" y="9" width="8" height="7" fill="#6B3F5E" />
        <polygon
          points="3,16 0,22 0,68 12,72 24,68 24,22 21,16"
          fill="#6B3F5E"
        />
        <polygon
          points="12,18 21,22 24,68 12,72"
          fill="rgba(250,247,242,0.1)"
        />
      </g>
      <text
        x="36"
        y="42"
        fill="#6B3F5E"
        fontFamily="'Fraunces',Georgia,serif"
        fontSize="18"
        fontWeight="400"
      >
        Nail
      </text>
      <text
        x="36"
        y="63"
        fill="#6B3F5E"
        fontFamily="'Fraunces',Georgia,serif"
        fontSize="18"
        fontWeight="400"
      >
        Tech Assistant
      </text>
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    (currentState: LoginActionState, formData: FormData) =>
      loginAction(currentState, formData),
    initialState
  );
  const [email, setEmail] = useState('');
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === 'sent') {
      localStorage.setItem('emailForSignIn', email.trim());
      sentHeadingRef.current?.focus();
      return;
    }

    if (state.status === 'rejected') {
      emailInputRef.current?.focus();
    }
  }, [email, state.status]);

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[color:rgb(212_203_197_/_0.7)] bg-background/85 shadow-[0_20px_60px_rgba(61,53,48,0.14)] backdrop-blur-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(232,213,224,0.88)_0%,rgba(201,180,201,0.55)_40%,rgba(212,168,176,0.4)_70%,rgba(232,201,160,0.45)_100%)]"
      />
      <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(201,169,110,0.9),transparent)]" />

      <div className="relative flex flex-col gap-8 px-7 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="rounded-full bg-background/80 p-4 shadow-[0_8px_24px_rgba(61,53,48,0.08)] ring-1 ring-[color:rgb(212_203_197_/_0.8)]">
            <BrandMark />
          </div>
          <div className="space-y-3">
            <p className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              Private Studio Access
            </p>
            <h1 className="font-heading-display text-4xl font-light tracking-[-0.03em] text-foreground sm:text-[44px]">
              Welcome <span className="italic text-primary">back.</span>
            </h1>
            <p className="mx-auto max-w-sm font-body text-sm leading-6 text-muted-foreground">
              Sign in with your email link to continue into your curated nail
              design studio.
            </p>
          </div>
        </div>

        {state.status === 'sent' ? (
          <div className="rounded-[24px] border border-[color:rgb(201_169_110_/_0.35)] bg-background/90 p-6 text-center shadow-[0_12px_32px_rgba(61,53,48,0.08)]">
            <p className="mb-3 font-body text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
              Sign-In Link Sent
            </p>
            <h2
              ref={sentHeadingRef}
              tabIndex={-1}
              className="font-heading-display text-3xl font-normal text-foreground outline-none"
            >
              Check your inbox
            </h2>
            <p className="mt-4 font-body text-sm leading-6 text-muted-foreground">
              Check your email for a secure sign-in link. The link expires in
              about an hour.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block font-body text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Email
              </label>
              <input
                ref={emailInputRef}
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-[color:rgb(212_203_197_/_0.95)] bg-white px-4 py-3 font-body text-[15px] text-foreground shadow-[0_1px_3px_rgba(61,53,48,0.06)] outline-none transition focus:border-primary focus:ring-2 focus:ring-[color:rgb(107_63_94_/_0.18)]"
                placeholder="you@example.com"
              />
            </div>

            <div aria-live="polite" className="min-h-6">
              {state.status === 'rejected' ? (
                <p className="font-body text-sm text-destructive">
                  {state.message}
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-body text-sm font-medium tracking-[0.08em] text-primary-foreground transition hover:bg-[color:rgb(91_50_79)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(107_63_94_/_0.28)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Sending link…' : 'Send Sign-In Link'}
            </button>

            <p className="text-center font-body text-[12px] leading-5 text-muted-foreground">
              We&apos;ll email a magic link tied to the configured address only.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
