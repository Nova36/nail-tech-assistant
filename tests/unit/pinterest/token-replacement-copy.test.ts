/**
 * b4-pinterest-token-remediation-views — lib/pinterest/token-replacement-copy.ts
 *
 * TDD-red: asserts the shape and content of the two copy primitive exports.
 * Fails until codex creates lib/pinterest/token-replacement-copy.ts.
 *
 * MAJOR-2: tokenInvalidCopy and insufficientScopeCopy must be textually distinct.
 */
import { describe, it, expect } from 'vitest';

import {
  tokenInvalidCopy,
  insufficientScopeCopy,
} from '../../../lib/pinterest/token-replacement-copy';

describe('tokenInvalidCopy shape', () => {
  it('has heading "Pinterest needs a fresh token"', () => {
    expect(tokenInvalidCopy.heading).toBe('Pinterest needs a fresh token');
  });

  it('has a summary string', () => {
    expect(typeof tokenInvalidCopy.summary).toBe('string');
    expect(tokenInvalidCopy.summary.length).toBeGreaterThan(0);
  });

  it('has steps array with at least 5 entries', () => {
    expect(Array.isArray(tokenInvalidCopy.steps)).toBe(true);
    expect(tokenInvalidCopy.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('pinterestPortalUrl is the correct URL', () => {
    expect(tokenInvalidCopy.pinterestPortalUrl).toBe(
      'https://developers.pinterest.com/apps/'
    );
  });

  it('has a vercelEnvLabel field', () => {
    expect(typeof tokenInvalidCopy.vercelEnvLabel).toBe('string');
    expect(tokenInvalidCopy.vercelEnvLabel.length).toBeGreaterThan(0);
  });

  it('every step references at least one required phrase', () => {
    const requiredPhrases = [
      'Pinterest developer portal',
      'Vercel',
      'Settings → Environment Variables',
      'redeploy',
      'PINTEREST_ACCESS_TOKEN',
      'Generate access token',
    ];
    for (const step of tokenInvalidCopy.steps) {
      const hasPhrase = requiredPhrases.some((phrase) => step.includes(phrase));
      expect(
        hasPhrase,
        `Step "${step}" does not reference any required phrase`
      ).toBe(true);
    }
  });

  it('steps contains "Settings → Environment Variables" somewhere', () => {
    const hasEnvLabel = tokenInvalidCopy.steps.some((s: string) =>
      s.includes('Settings → Environment Variables')
    );
    expect(hasEnvLabel).toBe(true);
  });

  it('summary does not contain "OAuth" or "bearer" (jargon-free)', () => {
    expect(tokenInvalidCopy.summary.toLowerCase()).not.toContain('oauth');
    expect(tokenInvalidCopy.summary.toLowerCase()).not.toContain('bearer');
  });

  it('no step contains "OAuth" or "bearer" (jargon-free)', () => {
    for (const step of tokenInvalidCopy.steps) {
      expect(step.toLowerCase()).not.toContain('oauth');
      expect(step.toLowerCase()).not.toContain('bearer');
    }
  });
});

describe('insufficientScopeCopy shape', () => {
  it('has heading "Pinterest needs broader access"', () => {
    expect(insufficientScopeCopy.heading).toBe(
      'Pinterest needs broader access'
    );
  });

  it('has a summary string', () => {
    expect(typeof insufficientScopeCopy.summary).toBe('string');
    expect(insufficientScopeCopy.summary.length).toBeGreaterThan(0);
  });

  it('has steps array with at least 5 entries', () => {
    expect(Array.isArray(insufficientScopeCopy.steps)).toBe(true);
    expect(insufficientScopeCopy.steps.length).toBeGreaterThanOrEqual(5);
  });

  it('pinterestPortalUrl is the correct URL', () => {
    expect(insufficientScopeCopy.pinterestPortalUrl).toBe(
      'https://developers.pinterest.com/apps/'
    );
  });

  it('has a vercelEnvLabel field', () => {
    expect(typeof insufficientScopeCopy.vercelEnvLabel).toBe('string');
    expect(insufficientScopeCopy.vercelEnvLabel.length).toBeGreaterThan(0);
  });

  it('every step references at least one required phrase', () => {
    const requiredPhrases = [
      'Pinterest developer portal',
      'Vercel',
      'Settings → Environment Variables',
      'redeploy',
      'PINTEREST_ACCESS_TOKEN',
      'Generate access token',
    ];
    for (const step of insufficientScopeCopy.steps) {
      const hasPhrase = requiredPhrases.some((phrase) => step.includes(phrase));
      expect(
        hasPhrase,
        `Step "${step}" does not reference any required phrase`
      ).toBe(true);
    }
  });

  it('steps contains "Settings → Environment Variables" somewhere', () => {
    const hasEnvLabel = insufficientScopeCopy.steps.some((s: string) =>
      s.includes('Settings → Environment Variables')
    );
    expect(hasEnvLabel).toBe(true);
  });

  it('summary does not contain "OAuth" or "bearer" (jargon-free)', () => {
    expect(insufficientScopeCopy.summary.toLowerCase()).not.toContain('oauth');
    expect(insufficientScopeCopy.summary.toLowerCase()).not.toContain('bearer');
  });

  it('no step contains "OAuth" or "bearer" (jargon-free)', () => {
    for (const step of insufficientScopeCopy.steps) {
      expect(step.toLowerCase()).not.toContain('oauth');
      expect(step.toLowerCase()).not.toContain('bearer');
    }
  });
});

describe('tokenInvalidCopy vs insufficientScopeCopy distinctness (MAJOR-2)', () => {
  it('summaries are distinct', () => {
    expect(tokenInvalidCopy.summary).not.toBe(insufficientScopeCopy.summary);
  });

  it('steps arrays are distinct (no copy-paste)', () => {
    expect(JSON.stringify(tokenInvalidCopy.steps)).not.toBe(
      JSON.stringify(insufficientScopeCopy.steps)
    );
  });
});
