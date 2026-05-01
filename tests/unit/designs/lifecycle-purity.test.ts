/**
 * c15 — lifecycle purity guard.
 * lib/designs/lifecycle.ts MUST NOT import the AI provider — it takes
 * the GenerateResult outcome from c14 and persists; never calls the SDK.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('lib/designs/lifecycle.ts — purity', () => {
  it('does not import the AI provider or Gemini SDK', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'lib/designs/lifecycle.ts'),
      'utf8'
    );
    expect(src).not.toContain('@/lib/ai/provider');
    expect(src).not.toContain('@google/generative-ai');
    expect(src).not.toContain('@google/genai');
  });
});
