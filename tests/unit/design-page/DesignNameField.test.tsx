/**
 * d7 TDD — DesignNameField inline name editor
 *
 * Renders three states:
 *   - unnamed (initialName=null/''): inline input with placeholder
 *   - named idle: name shown as text + edit button (pencil)
 *   - editing: input with current value + save/cancel
 *
 * Submission posts to /api/designs/[id]/save with optimistic UI update.
 * Failure reverts to prior value and surfaces error inline.
 *
 * jsdom env (default). No FormData used → safe.
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

import { DesignNameField } from '@/components/DesignNameField';

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function mockSaveOk(name: string | null) {
  fetchSpy.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ status: 'saved', designId: 'design-1', name }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  );
}

function mockSaveFail(status = 400) {
  fetchSpy.mockResolvedValueOnce(
    new Response(JSON.stringify({ status: 'invalid', message: 'too long' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

describe('DesignNameField — unnamed state', () => {
  it('renders an inline input with placeholder when initialName is null', () => {
    render(<DesignNameField designId="design-1" initialName={null} />);
    const input = screen.getByPlaceholderText(/name this design/i);
    expect(input).toBeInTheDocument();
  });

  it('renders an inline input when initialName is empty string', () => {
    render(<DesignNameField designId="design-1" initialName="" />);
    expect(
      screen.getByPlaceholderText(/name this design/i)
    ).toBeInTheDocument();
  });

  it('submits name on Enter and posts to /api/designs/:id/save', async () => {
    mockSaveOk('My Floral');
    render(<DesignNameField designId="design-1" initialName={null} />);
    const input = screen.getByPlaceholderText(
      /name this design/i
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'My Floral' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/designs/design-1/save');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ name: 'My Floral' });
  });

  it('updates rendered name optimistically before fetch resolves', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    fetchSpy.mockReturnValueOnce(pending);

    render(<DesignNameField designId="design-1" initialName={null} />);
    const input = screen.getByPlaceholderText(
      /name this design/i
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Optimistic' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('Optimistic')).toBeInTheDocument();
    });

    await act(async () => {
      resolveFetch(
        new Response(
          JSON.stringify({
            status: 'saved',
            designId: 'design-1',
            name: 'Optimistic',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      await pending;
    });
  });
});

describe('DesignNameField — named state', () => {
  it('renders the name as text plus an edit affordance', () => {
    render(<DesignNameField designId="design-1" initialName="Floral" />);
    expect(screen.getByText('Floral')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /edit|rename/i })
    ).toBeInTheDocument();
  });

  it('clicking edit reveals an input prefilled with the current name', () => {
    render(<DesignNameField designId="design-1" initialName="Floral" />);
    fireEvent.click(screen.getByRole('button', { name: /edit|rename/i }));
    const input = screen.getByDisplayValue('Floral') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it('Escape cancels editing and restores prior name', () => {
    render(<DesignNameField designId="design-1" initialName="Floral" />);
    fireEvent.click(screen.getByRole('button', { name: /edit|rename/i }));
    const input = screen.getByDisplayValue('Floral') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Changed but unsubmitted' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('Floral')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('DesignNameField — error path', () => {
  it('reverts optimistic update + shows error when save fails', async () => {
    mockSaveFail(400);
    render(<DesignNameField designId="design-1" initialName="Original" />);

    fireEvent.click(screen.getByRole('button', { name: /edit|rename/i }));
    const input = screen.getByDisplayValue('Original') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TooLongMaybe' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // After failure, name reverts to "Original"
    await waitFor(() => {
      expect(screen.getByText('Original')).toBeInTheDocument();
    });

    // And an error message is shown
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('DesignNameField — accessibility', () => {
  it('has data-component attribute', () => {
    const { container } = render(
      <DesignNameField designId="design-1" initialName={null} />
    );
    expect(
      container.querySelector('[data-component="DesignNameField"]')
    ).toBeTruthy();
  });
});
