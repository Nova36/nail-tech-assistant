/**
 * c3-data-model-types-converters — `Generation` type contract tests.
 *
 * Lifecycle: pending → success | failure (no cancelled / queued / streaming).
 * Error codes: refusal | rate_limit | network | unknown. Pre-flight payload
 * archival uses `requestJson: unknown` intentionally — Gemini request shape
 * is provider-specific and stays opaque to the row.
 */
import { describe, it, expectTypeOf } from 'vitest';

import type {
  Generation,
  GenerationStatus,
  GenerationErrorCode,
} from '@/lib/types';

describe('Generation type', () => {
  it('accepts a pending generation with all-null terminal fields', () => {
    const gen: Generation = {
      id: 'g1',
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
    };
    expectTypeOf(gen.status).toEqualTypeOf<GenerationStatus>();
  });

  it('accepts a failure generation with a valid errorCode', () => {
    const gen: Generation = {
      id: 'g2',
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      resultStoragePath: null,
      nailSwatchStoragePath: null,
      providerResponseMetadata: null,
      status: 'failure',
      errorCode: 'refusal',
      errorMessage: 'Prompt refused for content policy reasons',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    expectTypeOf(gen.errorCode).toEqualTypeOf<GenerationErrorCode | null>();
  });

  it('rejects an unknown errorCode value', () => {
    const gen: Generation = {
      id: 'g3',
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      resultStoragePath: null,
      nailSwatchStoragePath: null,
      providerResponseMetadata: null,
      status: 'failure',
      // @ts-expect-error — 'cancelled' not in GenerationErrorCode union
      errorCode: 'cancelled',
      errorMessage: 'cancelled by user',
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    void gen;
  });

  it('rejects an unknown status value', () => {
    const gen: Generation = {
      id: 'g4',
      designId: 'd1',
      userId: 'u1',
      requestJson: {},
      resultStoragePath: null,
      nailSwatchStoragePath: null,
      providerResponseMetadata: null,
      // @ts-expect-error — 'queued' is not a Generation status
      status: 'queued',
      errorCode: null,
      errorMessage: null,
      createdAt: '2026-04-29T00:00:00Z',
      updatedAt: '2026-04-29T00:00:00Z',
    };
    void gen;
  });

  it('exposes GenerationStatus as a 3-member literal union', () => {
    expectTypeOf<GenerationStatus>().toEqualTypeOf<
      'pending' | 'success' | 'failure'
    >();
  });

  it('exposes GenerationErrorCode as a 4-member literal union', () => {
    expectTypeOf<GenerationErrorCode>().toEqualTypeOf<
      'refusal' | 'rate_limit' | 'network' | 'unknown'
    >();
  });

  it('requestJson accepts arbitrary shapes (provider-opaque)', () => {
    expectTypeOf<Generation['requestJson']>().toEqualTypeOf<unknown>();
  });
});
