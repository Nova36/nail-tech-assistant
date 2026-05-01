/**
 * c3-data-model-types-converters — `Design` type contract tests.
 *
 * secondaryReferenceIds MUST be `string[]` (ordered array — locked per
 * design-discussion §3 + research-brief Open Q4). Nullable fields use
 * explicit `| null`, never optional `?: T` (Firestore stores `null` and
 * "missing field" as semantically distinct).
 */
import { describe, it, expectTypeOf } from 'vitest';

import type { Design, NailShape } from '@/lib/types';

describe('Design type', () => {
  it('accepts a design with ordered secondary references', () => {
    const design: Design = {
      id: 'd1',
      userId: 'u1',
      name: null,
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r2', 'r3', 'r4'],
      promptText: null,
      nailShape: 'almond',
      latestGenerationId: null,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    expectTypeOf(design.secondaryReferenceIds).toEqualTypeOf<string[]>();
  });

  it('rejects a non-array secondaryReferenceIds value', () => {
    const design: Design = {
      id: 'd2',
      userId: 'u1',
      name: 'My Design',
      primaryReferenceId: 'r1',
      // @ts-expect-error — secondaryReferenceIds must be string[], not string
      secondaryReferenceIds: 'r2',
      promptText: null,
      nailShape: 'almond',
      latestGenerationId: null,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    void design;
  });

  it('rejects an unknown nailShape value', () => {
    const design: Design = {
      id: 'd3',
      userId: 'u1',
      name: null,
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: null,
      // @ts-expect-error — 'badshape' not in NailShape union
      nailShape: 'badshape',
      latestGenerationId: null,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    void design;
  });

  it('reuses NailShape from lib/types.ts as the source of truth', () => {
    expectTypeOf<Design['nailShape']>().toEqualTypeOf<NailShape>();
  });

  it('latestGenerationId is `string | null` — never undefined', () => {
    expectTypeOf<Design['latestGenerationId']>().toEqualTypeOf<string | null>();
  });

  it('rejects undefined latestGenerationId (must be explicit null)', () => {
    const design: Design = {
      id: 'd4',
      userId: 'u1',
      name: null,
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: null,
      nailShape: 'almond',
      // @ts-expect-error — undefined is not assignable to `string | null`
      latestGenerationId: undefined,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    void design;
  });
});
