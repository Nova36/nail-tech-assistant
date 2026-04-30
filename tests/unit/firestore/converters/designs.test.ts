/**
 * c3-data-model-types-converters — `designConverter` runtime tests.
 *
 * fromFirestore defaults missing fields to empty/null per AC. Validates the
 * NailShape closure. Order of secondaryReferenceIds is preserved on the wire.
 */
import { describe, it, expect } from 'vitest';

import { designConverter } from '@/lib/firestore/converters/designs';

import type { Design } from '@/lib/types';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const mockSnapshot = (
  id: string,
  data: Record<string, unknown>
): QueryDocumentSnapshot =>
  ({ id, data: () => data }) as unknown as QueryDocumentSnapshot;

describe('designConverter', () => {
  const sample: Design = {
    id: 'd1',
    userId: 'u1',
    name: 'Spring Pastels',
    primaryReferenceId: 'r1',
    secondaryReferenceIds: ['r2', 'r3', 'r4'],
    promptText: 'soft pinks, minimal',
    nailShape: 'almond',
    latestGenerationId: 'g7',
    createdAt: '2026-04-29T00:00:00Z',
    updatedAt: '2026-04-29T01:00:00Z',
  };

  it('toFirestore strips id and preserves secondaryReferenceIds order', () => {
    const out = designConverter.toFirestore(sample);
    expect(out).not.toHaveProperty('id');
    const wire = out as { secondaryReferenceIds: string[] };
    expect(wire.secondaryReferenceIds).toEqual(['r2', 'r3', 'r4']);
    expect(wire.secondaryReferenceIds[0]).toBe('r2');
    expect(wire.secondaryReferenceIds[2]).toBe('r4');
  });

  it('fromFirestore defaults missing optional fields (empty array, nulls)', () => {
    const snap = mockSnapshot('d2', {
      userId: 'u1',
      primaryReferenceId: 'r1',
      nailShape: 'coffin',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
      // secondaryReferenceIds, promptText, latestGenerationId, name MISSING
    });
    const out = designConverter.fromFirestore(snap);
    expect(out.secondaryReferenceIds).toEqual([]);
    expect(out.promptText).toBeNull();
    expect(out.latestGenerationId).toBeNull();
    expect(out.name).toBeNull();
    expect(out.id).toBe('d2');
  });

  it('round-trip preserves field order and all values', () => {
    const wire = designConverter.toFirestore(sample);
    const snap = mockSnapshot(sample.id, wire as Record<string, unknown>);
    const out = designConverter.fromFirestore(snap);
    expect(out).toEqual(sample);
  });

  it('throws when nailShape is outside the NailShape union', () => {
    const snap = mockSnapshot('d3', {
      userId: 'u1',
      primaryReferenceId: 'r1',
      nailShape: 'unknown',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    expect(() => designConverter.fromFirestore(snap)).toThrow(
      /designConverter.*nailShape.*unknown/
    );
  });
});
