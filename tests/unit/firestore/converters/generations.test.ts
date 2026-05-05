/**
 * c3-data-model-types-converters — `generationConverter` runtime tests.
 *
 * Discriminated lifecycle: pending → terminal fields all null; success →
 * resultStoragePath set; failure → errorCode required (one of 4 union members).
 */
import { describe, it, expect } from 'vitest';

import { generationConverter } from '@/lib/firestore/converters/generations';

import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';

const mockSnapshot = (
  id: string,
  data: Record<string, unknown>
): QueryDocumentSnapshot =>
  ({ id, data: () => data }) as unknown as QueryDocumentSnapshot;

describe('generationConverter', () => {
  it('fromFirestore: pending row has all terminal fields null', () => {
    const snap = mockSnapshot('g1', {
      designId: 'd1',
      userId: 'u1',
      requestJson: { contents: [] },
      providerResponseMetadata: null,
      status: 'pending',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    const out = generationConverter.fromFirestore(snap);
    expect(out.status).toBe('pending');
    expect(out.resultStoragePath).toBeNull();
    expect(out.errorCode).toBeNull();
    expect(out.errorMessage).toBeNull();
  });

  it('fromFirestore: success row has resultStoragePath, no errorCode', () => {
    const snap = mockSnapshot('g2', {
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      providerResponseMetadata: null,
      status: 'success',
      resultStoragePath: 'users/u1/generations/g2.png',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    const out = generationConverter.fromFirestore(snap);
    expect(out.status).toBe('success');
    expect(out.resultStoragePath).toBe('users/u1/generations/g2.png');
    expect(out.errorCode).toBeNull();
    expect(out.errorMessage).toBeNull();
  });

  it('fromFirestore: failure row carries a valid errorCode', () => {
    const snap = mockSnapshot('g3', {
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      providerResponseMetadata: null,
      status: 'failure',
      errorCode: 'rate_limit',
      errorMessage: '429',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    const out = generationConverter.fromFirestore(snap);
    expect(out.status).toBe('failure');
    expect(out.errorCode).toBe('rate_limit');
    expect(out.errorMessage).toBe('429');
  });

  it('throws when status is outside the lifecycle union', () => {
    const snap = mockSnapshot('g4', {
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      status: 'cancelled',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    expect(() => generationConverter.fromFirestore(snap)).toThrow(
      /generationConverter.*status.*cancelled/
    );
  });

  it('throws when failure status has missing or invalid errorCode', () => {
    const missingCode = mockSnapshot('g5', {
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      status: 'failure',
      errorMessage: 'oops',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    expect(() => generationConverter.fromFirestore(missingCode)).toThrow(
      /generationConverter.*errorCode/
    );

    const invalidCode = mockSnapshot('g6', {
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      status: 'failure',
      errorCode: 'cancelled',
      errorMessage: 'oops',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    expect(() => generationConverter.fromFirestore(invalidCode)).toThrow(
      /generationConverter.*errorCode.*cancelled/
    );
  });

  it('toFirestore strips id', () => {
    const wire = generationConverter.toFirestore({
      id: 'g7',
      designId: 'd1',
      userId: 'u1',
      requestJson: { contents: [] },
      resultStoragePath: null,
      nailSwatchStoragePath: null,
      providerResponseMetadata: null,
      status: 'pending',
      errorCode: null,
      errorMessage: null,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    });
    expect(wire).not.toHaveProperty('id');
  });
});
