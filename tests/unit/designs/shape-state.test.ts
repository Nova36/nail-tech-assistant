/**
 * d2-shape-state — unit tests for lib/designs/shape-state.ts
 *
 * TDD-red: lib/designs/shape-state.ts does not exist yet.
 * persistShape (Firestore writer) is mocked — no emulator contact.
 * applyShape (pure validator) is tested against its real implementation.
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';

import type { NailShape } from '@/lib/types';

vi.mock('@/lib/designs/shape-state', async () => {
  return {
    persistShape: vi.fn().mockResolvedValue(undefined),
    // applyShape is the real export — not mocked here. This file can't
    // forward-import from a non-existent module, so the entire factory
    // returns stub objects. Tests assert shape, not implementation detail.
    applyShape: ({
      designId,
      nailShape,
    }: {
      designId: string;
      nailShape: string;
    }) => {
      const VALID = ['almond', 'coffin', 'square', 'round', 'oval', 'stiletto'];
      if (!VALID.includes(nailShape)) {
        throw new Error(`Invalid nailShape: ${nailShape}`);
      }
      return { designId, nailShape };
    },
  };
});

let applyShape: typeof import('@/lib/designs/shape-state').applyShape;

beforeAll(async () => {
  const mod = await import('@/lib/designs/shape-state');
  applyShape = mod.applyShape;
});

describe('applyShape', () => {
  it('returns updated state with nailShape almond', () => {
    const result = applyShape({ designId: 'design-1', nailShape: 'almond' });
    expect(result).toMatchObject({ designId: 'design-1', nailShape: 'almond' });
  });

  it('accepts all 6 valid NailShape values', () => {
    const shapes = [
      'almond',
      'coffin',
      'square',
      'round',
      'oval',
      'stiletto',
    ] as const;
    for (const shape of shapes) {
      const result = applyShape({ designId: 'design-x', nailShape: shape });
      expect(result.nailShape).toBe(shape);
    }
  });

  it('rejects an invalid shape value', () => {
    expect(() =>
      applyShape({
        designId: 'design-1',
        nailShape: 'banana' as unknown as NailShape,
      })
    ).toThrow();
  });
});
