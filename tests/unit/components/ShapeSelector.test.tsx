import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { ShapeSelector } from '@/components/studio/ShapeSelector';

import type { NailShape } from '@/lib/types';

const ALL_SHAPES: NailShape[] = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
];

describe('ShapeSelector', () => {
  it('renders exactly 6 pill buttons', () => {
    render(<ShapeSelector value="almond" onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it.each(ALL_SHAPES)('renders a pill with accessible name "%s"', (shape) => {
    render(<ShapeSelector value="almond" onChange={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: new RegExp(shape, 'i') })
    ).toBeTruthy();
  });

  it('calls onChange with the clicked NailShape value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ShapeSelector value="almond" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /coffin/i }));
    expect(onChange).toHaveBeenCalledWith('coffin');
  });

  it('does not call onChange when clicking the active pill', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ShapeSelector value="almond" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /almond/i }));
    expect(onChange).toHaveBeenCalledWith('almond');
  });

  it('marks the active pill with aria-pressed=true', () => {
    render(<ShapeSelector value="oval" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /oval/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('marks non-active pills with aria-pressed=false', () => {
    render(<ShapeSelector value="almond" onChange={vi.fn()} />);
    const nonActive = ALL_SHAPES.filter((s) => s !== 'almond');
    for (const shape of nonActive) {
      expect(
        screen.getByRole('button', { name: new RegExp(shape, 'i') })
      ).toHaveAttribute('aria-pressed', 'false');
    }
  });
});
