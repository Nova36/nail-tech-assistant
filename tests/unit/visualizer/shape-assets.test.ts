import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const SHAPES = [
  'almond',
  'coffin',
  'square',
  'round',
  'oval',
  'stiletto',
] as const;

const SHAPES_DIR = resolve(process.cwd(), 'components/NailVisualizer/shapes');

function readShape(shape: string): string {
  return readFileSync(resolve(SHAPES_DIR, `${shape}.svg`), 'utf8');
}

describe('NailVisualizer shape SVG assets', () => {
  it('has exactly 6 SVG files matching the NailShape union', () => {
    const svgs = readdirSync(SHAPES_DIR).filter((f: string) =>
      f.endsWith('.svg')
    );
    expect(svgs).toHaveLength(6);
  });

  it('all 6 files share identical viewBox value', () => {
    const viewBoxes = SHAPES.map((shape) => {
      const content = readShape(shape);
      const match = content.match(/viewBox="([^"]+)"/);
      expect(match, `${shape}.svg missing viewBox attribute`).not.toBeNull();
      return match![1];
    });
    const first = viewBoxes[0];
    for (const vb of viewBoxes) {
      expect(vb).toBe(first);
    }
  });

  for (const shape of SHAPES) {
    describe(`${shape}.svg`, () => {
      it(`exists at components/NailVisualizer/shapes/${shape}.svg`, () => {
        const content = readShape(shape);
        expect(content.length).toBeGreaterThan(0);
      });

      it(`has viewBox "0 0 100 140"`, () => {
        expect(readShape(shape)).toMatch(/viewBox="0 0 100 140"/);
      });

      it(`has exactly one <clipPath element`, () => {
        const matches = readShape(shape).match(/<clipPath/g);
        expect(matches).toHaveLength(1);
      });

      it(`clipPath element carries id="nail-tip-${shape}" on the same element`, () => {
        expect(readShape(shape)).toMatch(
          new RegExp(`<clipPath[^>]*id="nail-tip-${shape}"[^>]*>`)
        );
      });
    });
  }
});
