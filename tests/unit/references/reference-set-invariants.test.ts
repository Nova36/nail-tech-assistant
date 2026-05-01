import { describe, expect, it } from 'vitest';
import { buildReferenceSet } from '@/lib/references/reference-set';

describe('buildReferenceSet — invariants', () => {
  it('rejects empty primaryReferenceId', () => {
    const out = buildReferenceSet({
      primaryReferenceId: '',
      secondaryReferenceIds: [],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('primary_required');
    }
  });

  it('rejects whitespace-only primaryReferenceId', () => {
    const out = buildReferenceSet({
      primaryReferenceId: '   ',
      secondaryReferenceIds: [],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('primary_required');
    }
  });

  it('rejects duplicate secondary reference IDs', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ['r1', 'r1'],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('duplicate_reference_id');
      expect(out.message).toContain('r1');
    }
  });

  it('rejects primary appearing in secondary list', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'r1',
      secondaryReferenceIds: ['r1'],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe('primary_in_secondary');
    }
  });

  it('preserves secondary order verbatim — no re-sorting', () => {
    const out = buildReferenceSet({
      primaryReferenceId: 'p1',
      secondaryReferenceIds: ['c', 'a', 'b'],
      nailShape: 'almond',
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.set.secondaryReferenceIds).toEqual(['c', 'a', 'b']);
    }
  });

  it('does not mutate input', () => {
    const input = Object.freeze({
      primaryReferenceId: 'p1',
      secondaryReferenceIds: Object.freeze([
        'r2',
        'r3',
      ]) as readonly string[] as string[],
      promptText: 'x',
      nailShape: 'almond',
    });
    const out = buildReferenceSet(input);
    expect(out.ok).toBe(true);
  });
});
