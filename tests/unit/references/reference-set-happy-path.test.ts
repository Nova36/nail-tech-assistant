import { describe, expect, it } from 'vitest';
import { buildReferenceSet } from '@/lib/references/reference-set';
import type { NailShape } from '@/lib/types';

describe('buildReferenceSet — happy path', () => {
  it('accepts valid input with prompt + 2 secondaries', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r2', 'r3'],
      promptText: 'rose gold matte',
      nailShape: 'almond',
    });
    expect(out).toEqual({
      ok: true,
      set: {
        primaryReferenceId: 'r1',
        secondaryReferenceIds: ['r2', 'r3'],
        promptText: 'rose gold matte',
        nailShape: 'almond',
      },
    });
  });

  it('accepts valid input with no secondaries', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: 'simple',
      nailShape: 'coffin',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.set.secondaryReferenceIds).toEqual([]);
    }
  });

  it('normalizes missing promptText to null', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      nailShape: 'square',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.set.promptText).toBeNull();
    }
  });

  it('normalizes empty-string promptText to null', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: '',
      nailShape: 'round',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.set.promptText).toBeNull();
    }
  });

  it('accepts all 5 NailShape values', () => {
    const shapes: NailShape[] = ['almond', 'coffin', 'square', 'round', 'oval'];
    for (const shape of shapes) {
      const out = buildReferenceSet({
        primaryReferenceId: 'r1',
        secondaryReferenceIds: [],
        nailShape: shape,
      });
      expect(out.ok).toBe(true);
    }
  });
});
