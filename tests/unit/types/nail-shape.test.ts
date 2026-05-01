import { describe, it, expect, expectTypeOf } from 'vitest';

import type { NailShape } from '@/lib/types';
import { assertUnreachableShape } from '@/lib/types';

describe('NailShape union', () => {
  it('accepts almond', () => {
    const s: NailShape = 'almond';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('accepts coffin', () => {
    const s: NailShape = 'coffin';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('accepts square', () => {
    const s: NailShape = 'square';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('accepts round', () => {
    const s: NailShape = 'round';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('accepts oval', () => {
    const s: NailShape = 'oval';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('accepts stiletto', () => {
    const s: NailShape = 'stiletto';
    expectTypeOf(s).toMatchTypeOf<NailShape>();
  });

  it('rejects an invalid shape at compile time', () => {
    // @ts-expect-error 'banana' is not a valid NailShape
    const _bad: NailShape = 'banana';
    void _bad;
  });
});

describe('assertUnreachableShape', () => {
  it('is exported as a callable function (runtime guard)', () => {
    expect(typeof assertUnreachableShape).toBe('function');
  });

  it('has the correct type signature: (s: never) => never', () => {
    expectTypeOf(assertUnreachableShape).toEqualTypeOf<(s: never) => never>();
  });

  it('exhaustive switch over all 6 NailShape values compiles cleanly', () => {
    function handleShape(s: NailShape): string {
      switch (s) {
        case 'almond':
          return 'almond';
        case 'coffin':
          return 'coffin';
        case 'square':
          return 'square';
        case 'round':
          return 'round';
        case 'oval':
          return 'oval';
        case 'stiletto':
          return 'stiletto';
        default:
          return assertUnreachableShape(s);
      }
    }
    // runtime check: all 6 branches are reachable
    const shapes: NailShape[] = [
      'almond',
      'coffin',
      'square',
      'round',
      'oval',
      'stiletto',
    ];
    for (const shape of shapes) {
      expect(handleShape(shape)).toBe(shape);
    }
  });
});
