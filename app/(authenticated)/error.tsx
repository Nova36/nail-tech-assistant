'use client';

import { useEffect } from 'react';

import { ErrorSurface } from '@/components/ErrorSurface';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Authenticated route error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <ErrorSurface
        title="Something went wrong"
        message={
          error.message ||
          "We couldn't load this view. Try again, or head back to the dashboard."
        }
        recoveryAction={{ label: 'Try again', action: reset }}
      />
    </div>
  );
}
