/**
 * c5-server-storage-helper — pure path constructor tests.
 *
 * `referencePath` / `generationPath` are the only sanctioned producers of
 * `users/{uid}/...` strings (per c4 storage.rules and c5 grep-guard test).
 * Extension normalization is centralized here so call sites cannot drift.
 */
import { describe, it, expect } from 'vitest';

import { referencePath, generationPath } from '@/lib/firebase/storage';

describe('referencePath', () => {
  it('returns canonical reference path for a JPEG', () => {
    expect(referencePath('alice-uid', 'r1', 'jpg')).toBe(
      'users/alice-uid/references/r1.jpg'
    );
  });

  it('normalizes uppercase extension to lowercase', () => {
    expect(referencePath('alice-uid', 'r1', 'JPEG')).toBe(
      'users/alice-uid/references/r1.jpeg'
    );
  });

  it('strips a leading dot from the extension', () => {
    expect(referencePath('alice-uid', 'r1', '.jpg')).toBe(
      'users/alice-uid/references/r1.jpg'
    );
  });

  it('throws when uid is empty', () => {
    expect(() => referencePath('', 'r1', 'jpg')).toThrow(/uid/);
  });

  it('throws when refId is empty', () => {
    expect(() => referencePath('alice-uid', '', 'jpg')).toThrow(/refId/);
  });
});

describe('generationPath', () => {
  it('returns canonical generation path for a PNG', () => {
    expect(generationPath('alice-uid', 'g1', 'png')).toBe(
      'users/alice-uid/generations/g1.png'
    );
  });

  it('normalizes uppercase extension to lowercase', () => {
    expect(generationPath('alice', 'g1', 'PNG')).toBe(
      'users/alice/generations/g1.png'
    );
  });

  it('throws when uid is empty', () => {
    expect(() => generationPath('', 'g1', 'png')).toThrow(/uid/);
  });

  it('throws when genId is empty', () => {
    expect(() => generationPath('alice', '', 'png')).toThrow(/genId/);
  });
});
