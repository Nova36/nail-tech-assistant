/**
 * d8 TDD — RegenerateButton inline regenerate UI control.
 *
 * Renders three states:
 *   - idle: clickable button labeled /regenerate/i with regen icon
 *   - regenerating: disabled, shows "Generating…" or similar; concurrent click
 *     while in flight is rejected (no second fetch)
 *   - failed: post-failure inline alert; button returns to idle for retry
 *
 * Wraps POST /api/designs/{designId}/regenerate. On success, calls onSuccess
 * callback with { generationId, imageUrl } so the design page can re-render.
 *
 * jsdom env (default).
 */
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RegenerateButton } from '@/components/RegenerateButton';

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockSuccess(payload: { generationId: string; imageUrl?: string }) {
  fetchSpy.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 'success',
        generationId: payload.generationId,
        imageUrl: payload.imageUrl ?? 'https://test/img.png',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

function mockFailure(status = 400, message = 'rate limit exceeded') {
  fetchSpy.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        status: 'failure',
        errorCode: 'rate_limit',
        message,
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

describe('RegenerateButton — idle state', () => {
  it('renders a clickable button labeled /regenerate/i', () => {
    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /regenerate/i })
    ).toBeInTheDocument();
  });

  it('has data-component attribute', () => {
    const { container } = render(
      <RegenerateButton designId="design-1" onSuccess={vi.fn()} />
    );
    expect(
      container.querySelector('[data-component="RegenerateButton"]')
    ).toBeTruthy();
  });

  it('clicking POSTs to /api/designs/:id/regenerate with empty body', async () => {
    mockSuccess({ generationId: 'gen-2' });
    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/designs/design-1/regenerate');
    expect(init.method).toBe('POST');
  });
});

describe('RegenerateButton — regenerating (in-flight) state', () => {
  it('disables the button while in flight', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchSpy.mockReturnValueOnce(pending);

    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    const button = await screen.findByRole('button');
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            status: 'success',
            generationId: 'gen-3',
            imageUrl: 'https://test/img.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      await pending;
    });
  });

  it('rejects concurrent click while in flight (no second fetch)', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchSpy.mockReturnValueOnce(pending);

    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    const button = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            status: 'success',
            generationId: 'gen-4',
            imageUrl: 'https://test/img.png',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      await pending;
    });
  });
});

describe('RegenerateButton — success path', () => {
  it('calls onSuccess with generationId on 200', async () => {
    const onSuccess = vi.fn();
    mockSuccess({ generationId: 'gen-5', imageUrl: 'https://x/y.png' });
    render(<RegenerateButton designId="design-1" onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    const arg = onSuccess.mock.calls[0][0];
    expect(arg.generationId).toBe('gen-5');
  });
});

describe('RegenerateButton — failure path', () => {
  it('renders an alert on 4xx and re-enables the button', async () => {
    mockFailure(400, 'rate limit');
    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    const button = screen.getByRole('button', { name: /regenerate/i });
    expect(button).not.toBeDisabled();
  });

  it('handles network throw without crashing', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network down'));
    render(<RegenerateButton designId="design-1" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
