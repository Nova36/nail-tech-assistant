/**
 * b1-pinterest-client-token-boundary — Secret-boundary bundle-grep proof
 *
 * AC-5: After `pnpm build`, the string `pina_` must be absent from all
 *       .next/static/**\/*.js files (client chunks).
 *
 * GUARD: If .next/static does not exist, FAIL LOUDLY — never skip silently.
 * A false-green here means the architect's security:plan-audit is unresolved.
 *
 * Run via: pnpm test:security  (NOT part of `pnpm test` glob)
 * Script: "next build && vitest run tests/security/bundle-grep.test.ts"
 *
 * Note: *.map sourcemap files are excluded to avoid false positives.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const NEXT_STATIC_DIR = path.resolve(process.cwd(), '.next/static');
const CANARY_STRING = 'pina_';

function walkJsFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.endsWith('.js') &&
      !entry.name.endsWith('.map')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('Bundle-grep security proof — pina_ absent from client chunks', () => {
  it('GUARD: .next/static directory must exist (run `pnpm build` first)', () => {
    const exists = fs.existsSync(NEXT_STATIC_DIR);
    expect(
      exists,
      `SECURITY TEST FAILED: .next/static does not exist.\n` +
        `This test requires a production build before running.\n` +
        `Run: pnpm build && pnpm exec vitest run tests/security/bundle-grep.test.ts\n` +
        `A missing build directory must FAIL, never be skipped — false-green is a security hazard.`
    ).toBe(true);
  });

  it('no .next/static/**/*.js file contains the Pinterest token prefix "pina_"', () => {
    // If the guard above failed, .next/static doesn't exist — this will also fail clearly.
    if (!fs.existsSync(NEXT_STATIC_DIR)) {
      expect.fail(
        `SECURITY TEST FAILED: .next/static does not exist — cannot scan client chunks for "${CANARY_STRING}". ` +
          `Run pnpm build first.`
      );
    }

    const jsFiles = walkJsFiles(NEXT_STATIC_DIR);

    expect(
      jsFiles.length,
      'Expected at least one .js file in .next/static after build'
    ).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const filePath of jsFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(CANARY_STRING)) {
        violations.push(path.relative(process.cwd(), filePath));
      }
    }

    expect(
      violations,
      `SECURITY VIOLATION: Pinterest token prefix "${CANARY_STRING}" found in client chunks:\n` +
        violations.map((f) => `  - ${f}`).join('\n') +
        `\n\nThis means the Pinterest access token may be leaking to the browser.\n` +
        `Verify that lib/pinterest/client.ts starts with \`import 'server-only';\`\n` +
        `and that no client component imports from lib/pinterest/.`
    ).toHaveLength(0);
  });
});
