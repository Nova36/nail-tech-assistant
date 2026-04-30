/**
 * c3-data-model-types-converters — `referenceConverter` runtime tests.
 *
 * Pure converter — no Firestore SDK side effects. Mocked snapshots only.
 */
import { describe, it, expect } from 'vitest';

import { referenceConverter } from '@/lib/firestore/converters/references';

import type { Reference } from '@/lib/types';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const mockSnapshot = (
  id: string,
  data: Record<string, unknown>
): QueryDocumentSnapshot =>
  ({ id, data: () => data }) as unknown as QueryDocumentSnapshot;

describe('referenceConverter', () => {
  const sample: Reference = {
    id: 'r1',
    userId: 'u1',
    source: 'pinterest',
    sourceUrl: 'https://www.pinterest.com/pin/12345/',
    storagePath: 'users/u1/references/r1.jpg',
    pinterestPinId: '12345',
    createdAt: '2026-04-29T00:00:00Z',
  };

  it('toFirestore strips the id (id is the document key, not a field)', () => {
    const out = referenceConverter.toFirestore(sample);
    expect(out).not.toHaveProperty('id');
    expect(out).toEqual({
      userId: 'u1',
      source: 'pinterest',
      sourceUrl: 'https://www.pinterest.com/pin/12345/',
      storagePath: 'users/u1/references/r1.jpg',
      pinterestPinId: '12345',
      createdAt: '2026-04-29T00:00:00Z',
    });
  });

  it('fromFirestore injects snapshot.id and returns a typed Reference', () => {
    const snap = mockSnapshot('r1', {
      userId: 'u1',
      source: 'upload',
      sourceUrl: null,
      storagePath: 'users/u1/references/r1.jpg',
      pinterestPinId: null,
      createdAt: '2026-04-29T00:00:00Z',
    });
    const out = referenceConverter.fromFirestore(snap);
    expect(out.id).toBe('r1');
    expect(out.source).toBe('upload');
    expect(out.pinterestPinId).toBeNull();
  });

  it('round-trip preserves all field values (id injected on fromFirestore)', () => {
    const wire = referenceConverter.toFirestore(sample);
    const snap = mockSnapshot(sample.id, wire);
    const out = referenceConverter.fromFirestore(snap);
    expect(out).toEqual(sample);
  });

  it('throws when source is outside the literal union', () => {
    const snap = mockSnapshot('r2', {
      userId: 'u1',
      source: 'instagram',
      sourceUrl: null,
      storagePath: 'users/u1/references/r2.jpg',
      pinterestPinId: null,
      createdAt: '2026-04-29T00:00:00Z',
    });
    expect(() => referenceConverter.fromFirestore(snap)).toThrow(
      /referenceConverter.*source.*instagram/
    );
  });
});
