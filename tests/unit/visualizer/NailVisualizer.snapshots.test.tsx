import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

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

describe('NailVisualizer snapshots — theme=flat per shape', () => {
  it.each(ALL_SHAPES)('snapshot nailShape="%s"', (shape) => {
    const { container } = render(
      <NailVisualizer
        theme="flat"
        imageUrl="https://example.com/x.png"
        nailShape={shape}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
