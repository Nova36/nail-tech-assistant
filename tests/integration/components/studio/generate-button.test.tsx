process.env.PINTEREST_ACCESS_TOKEN = 'test-token';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/(authenticated)/design/actions', () => ({
  generateDesign: vi.fn(),
}));

import { GenerateButton } from '@/components/studio/GenerateButton';

function setReducedMotion(reduce: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  setReducedMotion(false);
});

afterEach(() => {
  cleanup();
});

describe('GenerateButton', () => {
  it('case 1: canGenerate=true, pending=false → button enabled with "Generate Design"', () => {
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={true}
        pending={false}
        onGenerate={onGenerate}
      />
    );
    const btn = screen.getByRole('button', { name: /generate design/i });
    expect(btn).toBeEnabled();
    expect(btn).not.toHaveAttribute('disabled');
  });

  it('case 2: canGenerate=false → button disabled with aria-disabled="true"', () => {
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={false}
        pending={false}
        onGenerate={onGenerate}
      />
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('case 3: pending=true → button disabled, aria-busy="true", "Painting your design…" visible', () => {
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={true}
        pending={true}
        onGenerate={onGenerate}
      />
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/painting your design/i)).toBeInTheDocument();
  });

  it('case 4: prefers-reduced-motion + pending → "Generating…" text, no animate- class on SVG fill', () => {
    setReducedMotion(true);
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={true}
        pending={true}
        onGenerate={onGenerate}
      />
    );
    expect(screen.getByText(/generating…/i)).toBeInTheDocument();
    expect(screen.queryByText(/painting your design/i)).not.toBeInTheDocument();

    const svgFill = document.querySelector('.nail-fill');
    if (svgFill) {
      expect(svgFill.className).not.toMatch(/animate-/);
    }
  });

  it('case 5: click while idle → onGenerate called once', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={true}
        pending={false}
        onGenerate={onGenerate}
      />
    );
    await user.click(screen.getByRole('button', { name: /generate design/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it('case 6: click while pending → onGenerate NOT called', async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    render(
      <GenerateButton
        canGenerate={true}
        pending={true}
        onGenerate={onGenerate}
      />
    );
    await user.click(screen.getByRole('button'));
    expect(onGenerate).not.toHaveBeenCalled();
  });
});
