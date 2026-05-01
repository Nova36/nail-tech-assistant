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

describe('NailVisualizer shape SVG assets', () => {
  it('has exactly 6 SVG files matching the NailShape union', () => {
    const dir = resolve(process.cwd(), 'components/NailVisualizer/shapes');
    const svgs = readdirSync(dir).filter((f: string) => f.endsWith('.svg'));
    expect(svgs).toHaveLength(6);
  });

  for (const shape of SHAPES) {
    describe(`${shape}.svg`, () => {
      let content: string;

      it(`exists at components/NailVisualizer/shapes/${shape}.svg`, () => {
        const path = resolve(
          process.cwd(),
          `components/NailVisualizer/shapes/${shape}.svg`
        );
        content = readFileSync(path, 'utf8');
        expect(content.length).toBeGreaterThan(0);
      });

      it(`has viewBox "0 0 100 140"`, () => {
        const path = resolve(
          process.cwd(),
          `components/NailVisualizer/shapes/${shape}.svg`
        );
        content = readFileSync(path, 'utf8');
        expect(content).toMatch(/viewBox="0 0 100 140"/);
      });

      it(`has exactly one clipPath element`, () => {
        const path = resolve(
          process.cwd(),
          `components/NailVisualizer/shapes/${shape}.svg`
        );
        content = readFileSync(path, 'utf8');
        const matches = content.match(/<clipPath/g);
        expect(matches).toHaveLength(1);
      });

      it(`clipPath id is "nail-tip-${shape}"`, () => {
        const path = resolve(
          process.cwd(),
          `components/NailVisualizer/shapes/${shape}.svg`
        );
        content = readFileSync(path, 'utf8');
        expect(content).toMatch(new RegExp(`id="nail-tip-${shape}"`));
      });

      it(`clipPath contains exactly one path element`, () => {
        const path = resolve(
          process.cwd(),
          `components/NailVisualizer/shapes/${shape}.svg`
        );
        content = readFileSync(path, 'utf8');
        const clipPathMatch = content.match(
          /<clipPath[^>]*>([\s\S]*?)<\/clipPath>/
        );
        expect(clipPathMatch).not.toBeNull();
        const inner = clipPathMatch![1];
        const pathElements = inner.match(/<path/g);
        expect(pathElements).toHaveLength(1);
      });
    });
  }
});
