/**
 * b1-pinterest-client-token-boundary — .env.example hygiene regression guard
 *
 * AC-6: .env.example must NOT contain PINTEREST_APP_ID (stale, removed in b1).
 *       .env.example MUST contain PINTEREST_ACCESS_TOKEN (authoritative contract).
 *
 * This is a regression guard — it's pre-satisfied after the b1 cleanup,
 * but must stay green to prevent drift from re-introducing the stale var.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const ENV_EXAMPLE_PATH = path.resolve(process.cwd(), '.env.example');

describe('.env.example hygiene (AC-6)', () => {
  it('.env.example exists at the project root', () => {
    expect(
      fs.existsSync(ENV_EXAMPLE_PATH),
      `.env.example not found at ${ENV_EXAMPLE_PATH}`
    ).toBe(true);
  });

  it('does NOT contain PINTEREST_APP_ID (stale var removed in b1)', () => {
    const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    expect(
      content,
      'REGRESSION: PINTEREST_APP_ID found in .env.example — this stale variable was removed in b1 ' +
        'and must not be re-introduced. Runtime env contract is authoritative in lib/env.ts.'
    ).not.toContain('PINTEREST_APP_ID');
  });

  it('contains PINTEREST_ACCESS_TOKEN (authoritative token var)', () => {
    const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
    expect(
      content,
      'PINTEREST_ACCESS_TOKEN is missing from .env.example — this must be present as a reference ' +
        'for operators configuring the integration.'
    ).toContain('PINTEREST_ACCESS_TOKEN');
  });
});
