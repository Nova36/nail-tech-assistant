/**
 * b1-pinterest-client-token-boundary — discriminated union shape tests
 *
 * Verifies the 6-arm PinterestError union from lib/pinterest/errors.ts:
 *   invalid_token | insufficient_scope | not_found | rate_limit | network | unknown
 *
 * These tests are type-level + runtime shape assertions. They do NOT depend on
 * fetch or external APIs — pure type-narrowing and value checks.
 */
import { describe, it, expect } from 'vitest';

// ─── Minimal inline type declarations ──────────────────────────────────────
// Mirrors what lib/pinterest/errors.ts will export.
// Allows typecheck to pass before implementation exists.
type PinterestError =
  | { reason: 'invalid_token' }
  | { reason: 'insufficient_scope' }
  | { reason: 'not_found' }
  | { reason: 'rate_limit'; retryAfterMs?: number }
  | { reason: 'network' }
  | { reason: 'unknown'; status?: number };

// ─── Exhaustiveness helper ──────────────────────────────────────────────────
// TypeScript will error here at compile time if PinterestError grows a new arm
// that isn't handled in the switch — proving exhaustive narrowing works.
function describeError(e: PinterestError): string {
  switch (e.reason) {
    case 'invalid_token':
      return 'Token is invalid or missing';
    case 'insufficient_scope':
      return 'Token lacks required scopes';
    case 'not_found':
      return 'Resource not found';
    case 'rate_limit':
      return `Rate limited${e.retryAfterMs != null ? `, retry after ${e.retryAfterMs}ms` : ''}`;
    case 'network':
      return 'Network error';
    case 'unknown':
      return `Unknown error${e.status != null ? ` (HTTP ${e.status})` : ''}`;
    // No default — exhaustiveness guaranteed by TypeScript
  }
}

describe('PinterestError discriminated union', () => {
  // ── Arm: invalid_token ───────────────────────────────────────────────────
  it('invalid_token arm exists with reason="invalid_token" and no extra fields', () => {
    const err: PinterestError = { reason: 'invalid_token' };
    expect(err.reason).toBe('invalid_token');
    expect(Object.keys(err)).toEqual(['reason']);
  });

  // ── Arm: insufficient_scope ──────────────────────────────────────────────
  it('insufficient_scope arm exists and is distinct from invalid_token', () => {
    const err: PinterestError = { reason: 'insufficient_scope' };
    expect(err.reason).toBe('insufficient_scope');
    expect(err.reason).not.toBe('invalid_token');
  });

  // ── Arm: not_found ───────────────────────────────────────────────────────
  it('not_found arm exists', () => {
    const err: PinterestError = { reason: 'not_found' };
    expect(err.reason).toBe('not_found');
  });

  // ── Arm: rate_limit (with optional retryAfterMs) ──────────────────────────
  it('rate_limit arm exists with optional retryAfterMs', () => {
    const errNoRetry: PinterestError = { reason: 'rate_limit' };
    expect(errNoRetry.reason).toBe('rate_limit');

    const errWithRetry: PinterestError = {
      reason: 'rate_limit',
      retryAfterMs: 30000,
    };
    expect(errWithRetry.reason).toBe('rate_limit');
    if (errWithRetry.reason === 'rate_limit') {
      expect(errWithRetry.retryAfterMs).toBe(30000);
    }
  });

  // ── Arm: network ─────────────────────────────────────────────────────────
  it('network arm exists with no extra fields', () => {
    const err: PinterestError = { reason: 'network' };
    expect(err.reason).toBe('network');
    expect(Object.keys(err)).toEqual(['reason']);
  });

  // ── Arm: unknown (with optional status) ──────────────────────────────────
  it('unknown arm exists with optional status field', () => {
    const errNoStatus: PinterestError = { reason: 'unknown' };
    expect(errNoStatus.reason).toBe('unknown');

    const errWithStatus: PinterestError = { reason: 'unknown', status: 500 };
    expect(errWithStatus.reason).toBe('unknown');
    if (errWithStatus.reason === 'unknown') {
      expect(errWithStatus.status).toBe(500);
    }
  });

  // ── All 6 reasons are distinct ────────────────────────────────────────────
  it('all 6 arms have distinct reason strings', () => {
    const reasons = [
      'invalid_token',
      'insufficient_scope',
      'not_found',
      'rate_limit',
      'network',
      'unknown',
    ];
    const unique = new Set(reasons);
    expect(unique.size).toBe(6);
  });

  // ── Type-narrowing: exhaustive switch compiles without default ────────────
  it('exhaustive switch on reason narrows to correct type per arm', () => {
    const errors: PinterestError[] = [
      { reason: 'invalid_token' },
      { reason: 'insufficient_scope' },
      { reason: 'not_found' },
      { reason: 'rate_limit', retryAfterMs: 5000 },
      { reason: 'network' },
      { reason: 'unknown', status: 503 },
    ];

    const descriptions = errors.map(describeError);
    expect(descriptions).toHaveLength(6);
    expect(descriptions[0]).toBe('Token is invalid or missing');
    expect(descriptions[1]).toBe('Token lacks required scopes');
    expect(descriptions[2]).toBe('Resource not found');
    expect(descriptions[3]).toBe('Rate limited, retry after 5000ms');
    expect(descriptions[4]).toBe('Network error');
    expect(descriptions[5]).toBe('Unknown error (HTTP 503)');
  });
});

// ─── normalizePinterestResponse shape contract ──────────────────────────────
// These tests import the real implementation. They MUST fail until the module exists.
describe('normalizePinterestResponse (from lib/pinterest/errors)', () => {
  it('returns null for 200', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 200 });
    expect(normalizePinterestResponse(res)).toBeNull();
  });

  it('returns { reason: "invalid_token" } for 401', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 401 });
    const err = normalizePinterestResponse(res);
    expect(err).toEqual({ reason: 'invalid_token' });
  });

  it('returns { reason: "insufficient_scope" } for 403', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 403 });
    const err = normalizePinterestResponse(res);
    expect(err).toEqual({ reason: 'insufficient_scope' });
  });

  it('returns { reason: "not_found" } for 404', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 404 });
    const err = normalizePinterestResponse(res);
    expect(err).toEqual({ reason: 'not_found' });
  });

  it('returns { reason: "rate_limit" } for 429', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 429 });
    const err = normalizePinterestResponse(res);
    expect(err?.reason).toBe('rate_limit');
  });

  it('returns { reason: "unknown" } for unrecognized status', async () => {
    const { normalizePinterestResponse } =
      await import('../../../lib/pinterest/errors');
    const res = new Response(null, { status: 500 });
    const err = normalizePinterestResponse(res);
    expect(err?.reason).toBe('unknown');
  });
});
