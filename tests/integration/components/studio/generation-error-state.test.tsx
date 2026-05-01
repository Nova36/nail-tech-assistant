process.env.PINTEREST_ACCESS_TOKEN = 'test-token';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationErrorState } from '@/components/studio/GenerationErrorState';

import type { GenerateDesignErrorCode } from '@/app/(authenticated)/design/actions';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('GenerationErrorState', () => {
  it('case 12: errorCode="refusal" → specific heading and role="alert"', () => {
    render(
      <GenerationErrorState
        errorCode="refusal"
        message="declined"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText("We couldn't generate this design.")
    ).toBeInTheDocument();
  });

  it('case 13: errorCode="rate_limit" → specific heading, primary CTA "Try again"', () => {
    render(
      <GenerationErrorState
        errorCode="rate_limit"
        message="rate limited"
        onAdjust={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByText('Generation paused — too many requests.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('case 14: errorCode="network" → specific heading, primary CTA "Try again"', () => {
    render(
      <GenerationErrorState
        errorCode="network"
        message="network error"
        onAdjust={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByText("Couldn't reach the image model.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('case 15: errorCode="storage_fail" → specific heading, primary CTA "Try again"', () => {
    render(
      <GenerationErrorState
        errorCode="storage_fail"
        message="storage failure"
        onAdjust={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(
      screen.getByText("Generated, but couldn't save.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
  });

  it('case 16: errorCode="low_quality" → specific heading, primary CTA "← Back to adjust", secondary "Try again anyway"', () => {
    render(
      <GenerationErrorState
        errorCode="low_quality"
        message="low quality"
        onAdjust={vi.fn()}
        onRetry={vi.fn()}
      />
    );
    expect(screen.getByText("The result wasn't great.")).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    const backBtn = buttons.find((b) =>
      /back to adjust/i.test(b.textContent ?? '')
    );
    const retryBtn = buttons.find((b) =>
      /try again anyway/i.test(b.textContent ?? '')
    );
    expect(backBtn).toBeInTheDocument();
    expect(retryBtn).toBeInTheDocument();
  });

  it('case 17: errorCode="unauthorized" → generic heading, "← Back to adjust" CTA', () => {
    render(
      <GenerationErrorState
        errorCode="unauthorized"
        message="unauthorized"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /back to adjust/i })
    ).toBeInTheDocument();
  });

  it('case 18: errorCode="invalid_input" → generic heading', () => {
    render(
      <GenerationErrorState
        errorCode="invalid_input"
        message="invalid"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('case 19: errorCode="design_not_found" → generic heading', () => {
    render(
      <GenerationErrorState
        errorCode="design_not_found"
        message="not found"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('case 20: errorCode="design_unauthorized" → generic heading', () => {
    render(
      <GenerationErrorState
        errorCode="design_unauthorized"
        message="design unauthorized"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('case 21: errorCode="unknown" → generic heading', () => {
    render(
      <GenerationErrorState
        errorCode="unknown"
        message="unknown error"
        onAdjust={vi.fn()}
      />
    );
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('case 22: all errorCodes render role="alert" on outer wrapper', () => {
    const errorCodes: GenerateDesignErrorCode[] = [
      'refusal',
      'rate_limit',
      'network',
      'storage_fail',
      'low_quality',
      'unauthorized',
      'invalid_input',
      'design_not_found',
      'design_unauthorized',
      'unknown',
    ];

    for (const errorCode of errorCodes) {
      const { unmount } = render(
        <GenerationErrorState
          errorCode={errorCode}
          message="test"
          onAdjust={vi.fn()}
          onRetry={vi.fn()}
        />
      );
      expect(
        screen.getByRole('alert'),
        `errorCode="${errorCode}" should have role="alert"`
      ).toBeInTheDocument();
      unmount();
    }
  });
});
