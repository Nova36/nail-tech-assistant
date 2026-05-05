import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { NailVisualizer } from '@/components/NailVisualizer/NailVisualizer';

import type { NailShape } from '@/lib/types';

const ALL_SHAPES: NailShape[] = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
];

describe('NailVisualizer', () => {
  describe('theme="flat" + imageUrl + nailShape=almond', () => {
    it('renders 5 clip-masked elements referencing clipPath#nail-tip-almond', () => {
      const { container } = render(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="almond"
        />
      );
      const masked = container.querySelectorAll(
        '[clip-path="url(#nail-tip-almond)"]'
      );
      expect(masked.length).toBe(5);
    });

    it('mounts class nail-visualizer-theme-flat on the root element', () => {
      const { container } = render(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="almond"
        />
      );
      expect(container.firstChild).toHaveClass('nail-visualizer-theme-flat');
    });
  });

  describe('nailShape change → almond → coffin', () => {
    it('updates all 5 clipPath references to nail-tip-coffin without re-mounting', () => {
      const { container, rerender } = render(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="almond"
        />
      );
      rerender(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="coffin"
        />
      );
      const oldMasked = container.querySelectorAll(
        '[clip-path="url(#nail-tip-almond)"]'
      );
      const newMasked = container.querySelectorAll(
        '[clip-path="url(#nail-tip-coffin)"]'
      );
      expect(oldMasked.length).toBe(0);
      expect(newMasked.length).toBe(5);
    });
  });

  describe('imageUrl={null} — fallback state', () => {
    it('renders the visualizer-fallback element without throwing', () => {
      render(
        <NailVisualizer theme="flat" imageUrl={null} nailShape="almond" />
      );
      expect(screen.getByTestId('visualizer-fallback')).toBeTruthy();
    });
  });

  describe('onImageError callback', () => {
    it('fires when the masked image element emits an error event', () => {
      const onImageError = vi.fn();
      const { container } = render(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="almond"
          onImageError={onImageError}
        />
      );
      // Fire error on the first image/image element inside the SVG
      const imgEl =
        container.querySelector('image') ??
        container.querySelector('[data-testid="nail-image"]');
      expect(imgEl).toBeTruthy();
      fireEvent.error(imgEl!);
      expect(onImageError).toHaveBeenCalledTimes(1);
    });
  });

  describe('theme="line-art"', () => {
    it('mounts class nail-visualizer-theme-line-art on the root element', () => {
      const { container } = render(
        <NailVisualizer
          theme="line-art"
          imageUrl="/placeholder.png"
          nailShape="almond"
        />
      );
      expect(container.firstChild).toHaveClass(
        'nail-visualizer-theme-line-art'
      );
    });
  });

  describe('negative: no hand/palm geometry in rendered DOM', () => {
    it('does not render any element with id or class containing "hand" or "palm"', () => {
      const { container } = render(
        <NailVisualizer
          theme="flat"
          imageUrl="/placeholder.png"
          nailShape="almond"
        />
      );
      const FORBIDDEN_IDS = ['hand-base', 'hand-stroke', 'palm'];
      for (const id of FORBIDDEN_IDS) {
        expect(container.querySelector(`#${id}`)).toBeNull();
      }
      // Any element whose id/class string includes "hand" or "palm"
      const allEls = Array.from(container.querySelectorAll('*'));
      for (const el of allEls) {
        const id = el.id ?? '';
        const cls = el.className ?? '';
        const combined =
          `${id} ${typeof cls === 'string' ? cls : ''}`.toLowerCase();
        expect(combined).not.toMatch(/\bhand\b/);
        expect(combined).not.toMatch(/\bpalm\b/);
      }
    });
  });

  describe('all 6 NailShape values render without throwing', () => {
    it.each(ALL_SHAPES)('renders nailShape="%s" without error', (shape) => {
      expect(() =>
        render(
          <NailVisualizer
            theme="flat"
            imageUrl="/placeholder.png"
            nailShape={shape}
          />
        )
      ).not.toThrow();
    });
  });
});

describe('NailVisualizer — swatch precedence', () => {
  it('nailSwatchUrl set → all 5 <image> href values reference the swatch (not imageUrl)', () => {
    const { container } = render(
      <NailVisualizer
        theme="flat"
        imageUrl="https://test/hand.png"
        nailSwatchUrl="https://test/swatch.png"
        nailShape="almond"
      />
    );
    const images = Array.from(container.querySelectorAll('image'));
    expect(images.length).toBe(5);
    for (const img of images) {
      const href =
        img.getAttribute('href') ?? img.getAttribute('xlink:href') ?? '';
      expect(href).toBe('https://test/swatch.png');
      expect(href).not.toBe('https://test/hand.png');
    }
  });

  it('nailSwatchUrl={null} + imageUrl set → falls back to imageUrl', () => {
    const { container } = render(
      <NailVisualizer
        theme="flat"
        imageUrl="https://test/hand.png"
        nailSwatchUrl={null}
        nailShape="almond"
      />
    );
    const images = Array.from(container.querySelectorAll('image'));
    expect(images.length).toBe(5);
    for (const img of images) {
      const href =
        img.getAttribute('href') ?? img.getAttribute('xlink:href') ?? '';
      expect(href).toBe('https://test/hand.png');
    }
  });

  it('nailSwatchUrl undefined + imageUrl={null} → fallback rect renders', () => {
    render(
      <NailVisualizer
        theme="flat"
        imageUrl={null}
        nailSwatchUrl={undefined}
        nailShape="almond"
      />
    );
    expect(screen.getByTestId('visualizer-fallback')).toBeTruthy();
  });
});
