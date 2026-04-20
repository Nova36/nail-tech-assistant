'use client';

import { useEffect, useRef, useState } from 'react';

type FinishState =
  | { status: 'pending' }
  | { status: 'awaiting_email' }
  | { status: 'exchanging' }
  | { status: 'redirecting' }
  | { status: 'rejected'; message: string };

const STORAGE_KEY = 'emailForSignIn';

export default function LoginFinishPage() {
  const [state, setState] = useState<FinishState>({ status: 'pending' });
  const [emailInput, setEmailInput] = useState('');
  const ranOnceRef = useRef(false);

  useEffect(() => {
    if (ranOnceRef.current) return;
    ranOnceRef.current = true;

    void completeSignIn(null, setState);
  }, []);

  function onSubmitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    void completeSignIn(email, setState);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-[color:rgb(212_203_197_/_0.7)] bg-background/85 p-8 shadow-[0_20px_60px_rgba(61,53,48,0.14)] backdrop-blur-sm sm:p-10">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(135deg,rgba(232,213,224,0.6)_0%,rgba(212,168,176,0.3)_70%,rgba(232,201,160,0.35)_100%)]"
      />
      <div className="relative space-y-6 text-center">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Completing sign-in
        </p>

        {state.status === 'pending' || state.status === 'exchanging' ? (
          <>
            <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
              One moment…
            </h1>
            <p className="font-body text-sm leading-6 text-muted-foreground">
              {state.status === 'exchanging'
                ? 'Establishing your session.'
                : 'Verifying your sign-in link.'}
            </p>
          </>
        ) : null}

        {state.status === 'redirecting' ? (
          <>
            <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
              Welcome back.
            </h1>
            <p className="font-body text-sm leading-6 text-muted-foreground">
              Redirecting you into the studio.
            </p>
          </>
        ) : null}

        {state.status === 'awaiting_email' ? (
          <form onSubmit={onSubmitEmail} className="space-y-5 text-left">
            <div className="text-center">
              <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
                Confirm your email
              </h1>
              <p className="mt-3 font-body text-sm leading-6 text-muted-foreground">
                You opened this link on a different browser. Re-enter the email
                you used to request the sign-in link.
              </p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="finish-email"
                className="block font-body text-[12px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
              >
                Email
              </label>
              <input
                id="finish-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                value={emailInput}
                onChange={(event) => setEmailInput(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-[color:rgb(212_203_197_/_0.95)] bg-white px-4 py-3 font-body text-[15px] text-foreground shadow-[0_1px_3px_rgba(61,53,48,0.06)] outline-none transition focus:border-primary focus:ring-2 focus:ring-[color:rgb(107_63_94_/_0.18)]"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 font-body text-sm font-medium tracking-[0.08em] text-primary-foreground transition hover:bg-[color:rgb(91_50_79)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(107_63_94_/_0.28)]"
            >
              Complete sign-in
            </button>
          </form>
        ) : null}

        {state.status === 'rejected' ? (
          <>
            <h1 className="font-heading-display text-3xl font-light tracking-[-0.02em] text-foreground">
              Sign-in failed
            </h1>
            <p className="font-body text-sm leading-6 text-destructive">
              {state.message}
            </p>
            <a
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-body text-sm font-medium tracking-[0.08em] text-primary-foreground transition hover:bg-[color:rgb(91_50_79)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(107_63_94_/_0.28)]"
            >
              Back to sign-in
            </a>
          </>
        ) : null}
      </div>
    </section>
  );
}

async function completeSignIn(
  emailOverride: string | null,
  setState: (s: FinishState) => void
): Promise<void> {
  try {
    const { getAuth, isSignInWithEmailLink, signInWithEmailLink } =
      await import('firebase/auth');
    const { createBrowserFirebaseClient } =
      await import('@/lib/firebase/client');

    const app = createBrowserFirebaseClient();
    const auth = getAuth(app);
    const href = window.location.href;

    if (!isSignInWithEmailLink(auth, href)) {
      setState({
        status: 'rejected',
        message: 'This sign-in link is invalid or has already been used.',
      });
      return;
    }

    const storedEmail = window.localStorage.getItem(STORAGE_KEY);
    const email = (emailOverride ?? storedEmail ?? '').trim();
    if (!email) {
      setState({ status: 'awaiting_email' });
      return;
    }

    setState({ status: 'exchanging' });

    const credential = await signInWithEmailLink(auth, email, href);
    const idToken = await credential.user.getIdToken();

    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;
      setState({
        status: 'rejected',
        message:
          payload?.message ??
          'Could not establish a session. Please try again.',
      });
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    setState({ status: 'redirecting' });
    window.location.replace('/');
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[loginFinish] completeSignIn failed', { code, message });
    setState({
      status: 'rejected',
      message: friendlyMessage(code, message),
    });
  }
}

function friendlyMessage(code: string | undefined, rawMessage: string): string {
  switch (code) {
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This sign-in link has expired or has already been used. Request a fresh one.';
    case 'auth/invalid-email':
      return 'The email you entered does not match the sign-in link.';
    case 'auth/network-request-failed':
      return 'A network error blocked sign-in. Check your connection and try again.';
    default:
      return rawMessage || 'Sign-in could not be completed. Please try again.';
  }
}
