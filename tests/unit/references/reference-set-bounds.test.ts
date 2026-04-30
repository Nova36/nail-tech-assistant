import { describe, expect, it } from 'vitest';
import { buildReferenceSet } from '@/lib/references/reference-set';

describe('buildReferenceSet — bounds', () => {
  it('accepts promptText exactly 1000 chars', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: 'a'.repeat(1000),
      nailShape: 'almond',
    });
    expect(out.ok).toBe(true);
  });

  it('rejects promptText 1001 chars', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      promptText: 'a'.repeat(1001),
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('prompt_too_long');
      expect(out.message).toContain('1000');
    }
  });

  it('accepts secondaryReferenceIds length 50', () => {
    const ids = Array.from({ length: 50 }, (_, i) => `r${i + 1}`);
    const out = buildReferenceSet({
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ids,
      nailShape: 'almond',
    });
    expect(out.ok).toBe(true);
  });

  it('rejects secondary IDs containing empty string', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ['r1', ''],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('invalid_reference_id');
    }
  });

  it('rejects nailShape "stiletto" (not in union)', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      nailShape: 'stiletto',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('invalid_nail_shape');
    }
  });

  it('rejects nailShape with case mismatch — case-sensitive enum', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: [],
      nailShape: 'ALMOND',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('invalid_nail_shape');
    }
  });
});
