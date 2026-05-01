process.env.PINTEREST_ACCESS_TOKEN = 'test-token';

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationPreview } from '@/components/studio/GenerationPreview';

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('GenerationPreview', () => {
  it('case 7: renders <img> with src containing the imageUrl prop', () => {
    const onAdjust = vi.fn();
    render(
      <GenerationPreview
        imageUrl="https://example.com/nail-design.png"
        onAdjust={onAdjust}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute(
      'src',
      expect.stringContaining('https://example.com/nail-design.png')
    );
  });

  it('case 8: alt includes nailShape when provided — "almond shape"', () => {
    const onAdjust = vi.fn();
    render(
      <GenerationPreview
        imageUrl="https://example.com/nail-design.png"
        nailShape="almond"
        onAdjust={onAdjust}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', expect.stringContaining('almond shape'));
  });

  it('case 9: alt includes truncated promptText (first 60 chars)', () => {
    const onAdjust = vi.fn();
    const promptText =
      'soft mauve french with chrome accent and tiny pearl detail at base';
    render(
      <GenerationPreview
        imageUrl="https://example.com/nail-design.png"
        promptText={promptText}
        onAdjust={onAdjust}
      />
    );
    const img = screen.getByRole('img');
    const altValue = img.getAttribute('alt') ?? '';
    expect(altValue).toContain(promptText.slice(0, 60));
  });

  it('case 10: heading "Here\'s your design." is visible', () => {
    const onAdjust = vi.fn();
    render(
      <GenerationPreview
        imageUrl="https://example.com/nail-design.png"
        onAdjust={onAdjust}
      />
    );
    expect(screen.getByText(/here's your design\./i)).toBeInTheDocument();
  });

  it('case 11: "← Back to adjust" button visible; click calls onAdjust', async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(
      <GenerationPreview
        imageUrl="https://example.com/nail-design.png"
        onAdjust={onAdjust}
      />
    );
    const btn = screen.getByRole('button', { name: /back to adjust/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(onAdjust).toHaveBeenCalledTimes(1);
  });
});
