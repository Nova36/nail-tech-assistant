/**
 * c13-ai-env-provider-boundary — purity grep.
 * Provider module MUST NOT import firebase-admin or any lib/firebase /
 * lib/firestore boundary code. Single SDK ↔ ProviderResult translator.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('lib/ai/provider.ts — purity', () => {
  it('imports only @google/genai + server-only + node:buffer-style stdlib', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'lib/ai/provider.ts'),
      'utf8'
    );
    // Forbidden imports
    expect(src).not.toContain('firebase-admin');
    expect(src).not.toContain('@/lib/firebase');
    expect(src).not.toContain('@/lib/firestore');
    expect(src).not.toContain('getFirestore');
    expect(src).not.toContain('getStorage');
  });

  it('imports server-only at the top of the file', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'lib/ai/provider.ts'),
      'utf8'
    );
    expect(src).toMatch(/import ['"]server-only['"]/);
  });
});
