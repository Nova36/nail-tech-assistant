/**
 * b4-pinterest-token-remediation-views — app/(authenticated)/pinterest/error.tsx
 *
 * TDD-red: asserts the Pinterest error boundary renders "Something went wrong"
 * UI with a "Try again" button that calls reset(). Fails until codex implements
 * error.tsx.
 *
 * MAJOR-1 invariant: error.tsx must NOT render TokenInvalidView or
 * InsufficientScopeView content — those branches short-circuit at page level.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import PinterestErrorBoundary from '../../../app/(authenticated)/pinterest/error';

describe('PinterestErrorBoundary (error.tsx)', () => {
  it('renders "Something went wrong" heading when given an error', () => {
    const mockReset = vi.fn();
    render(
      React.createElement(PinterestErrorBoundary, {
        error: new Error('boom'),
        reset: mockReset,
      })
    );

    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
  });

  it('renders a "Try again" button', () => {
    const mockReset = vi.fn();
    render(
      React.createElement(PinterestErrorBoundary, {
        error: new Error('boom'),
        reset: mockReset,
      })
    );

    expect(screen.getByRole('button', { name: /Try again/i })).toBeTruthy();
  });

  it('"Try again" button calls reset() on click', () => {
    const mockReset = vi.fn();
    render(
      React.createElement(PinterestErrorBoundary, {
        error: new Error('boom'),
        reset: mockReset,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    expect(mockReset).toHaveBeenCalled();
  });

  it('does NOT render TokenInvalidView content (MAJOR-1)', () => {
    const mockReset = vi.fn();
    render(
      React.createElement(PinterestErrorBoundary, {
        error: new Error('boom'),
        reset: mockReset,
      })
    );

    expect(
      document.querySelector('[data-component="TokenInvalidView"]')
    ).toBeNull();
  });

  it('does NOT render InsufficientScopeView content (MAJOR-1)', () => {
    const mockReset = vi.fn();
    render(
      React.createElement(PinterestErrorBoundary, {
        error: new Error('boom'),
        reset: mockReset,
      })
    );

    expect(
      document.querySelector('[data-component="InsufficientScopeView"]')
    ).toBeNull();
  });
});
