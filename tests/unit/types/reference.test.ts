/**
 * c3-data-model-types-converters — `Reference` type contract tests.
 *
 * Type-level assertions only. No runtime behavior is under test here — the
 * `Reference` type contract is the unit. `expectTypeOf` from vitest is the
 * checked path; `@ts-expect-error` exercises negative cases.
 */
import { describe, it, expectTypeOf } from 'vitest';

import type { Reference, ReferenceSource } from '@/lib/types';

describe('Reference type', () => {
  it('accepts a Pinterest-sourced reference', () => {
    const ref: Reference = {
      id: 'r1',
      userId: 'u1',
      source: 'pinterest',
      sourceUrl: 'https://www.pinterest.com/pin/12345/',
      storagePath: 'users/u1/references/r1.jpg',
      pinterestPinId: '12345',
      createdAt: '2026-04-29T00:00:00Z',
    };
    expectTypeOf(ref).toEqualTypeOf<Reference>();
  });

  it('accepts an upload-sourced reference with null pinterestPinId', () => {
    const ref: Reference = {
      id: 'r2',
      userId: 'u1',
      source: 'upload',
      sourceUrl: null,
      storagePath: 'users/u1/references/r2.jpg',
      pinterestPinId: null,
      createdAt: '2026-04-29T00:00:00Z',
    };
    expectTypeOf(ref).toEqualTypeOf<Reference>();
  });

  it('rejects an invalid source value', () => {
    const ref: Reference = {
      id: 'r3',
      userId: 'u1',
      // @ts-expect-error — 'invalid' is not in ReferenceSource union
      source: 'invalid',
      sourceUrl: null,
      storagePath: 'users/u1/references/r3.jpg',
      pinterestPinId: null,
      createdAt: '2026-04-29T00:00:00Z',
    };
    void ref;
  });

  it('exposes ReferenceSource as a literal union', () => {
    expectTypeOf<ReferenceSource>().toEqualTypeOf<'pinterest' | 'upload'>();
  });
});
