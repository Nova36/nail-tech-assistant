import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { VisualizerFrame } from '@/components/NailVisualizer/VisualizerFrame';

describe('VisualizerFrame', () => {
  it('renders its children into the DOM', () => {
    render(
      <VisualizerFrame>
        <div data-testid="child">x</div>
      </VisualizerFrame>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('root element carries the visualizer-frame class (tablet-landscape framing hook)', () => {
    const { container } = render(
      <VisualizerFrame>
        <span>content</span>
      </VisualizerFrame>
    );
    expect(container.firstChild).toHaveClass('visualizer-frame');
  });
});
