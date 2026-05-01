import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('buildReferenceSet — purity', () => {
  it('source file imports no SDK / server-only / firebase / firestore / storage modules', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'lib/references/reference-set.ts'),
      'utf8'
    );
    expect(src).not.toContain("'server-only'");
    expect(src).not.toContain('firebase');
    expect(src).not.toContain('firestore');
    expect(src).not.toContain('storage');
  });
});
