/**
 * c5-server-storage-helper — grep guard against parallel storage path
 * construction.
 *
 * The helper centralizes `users/{uid}/...` path construction. This test
 * scans `app/**` and `lib/**` (excluding the helper itself) for any literal
 * `users/` followed by a template-variable (e.g., `users/${...}`) inside a
 * TypeScript template literal — a heuristic for "someone hand-rolled a
 * storage path."
 *
 * False negatives are acceptable (heuristic). False positives (this test
 * fails when no real violation exists) require updating the allowlist below.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Files allowed to construct `users/${...}` paths (the helper itself; tests
// exercising the helper; rules tests that simulate paths the helper would
// produce, etc.). Add to this allowlist sparingly and only with reviewer
// sign-off.
const ALLOWLIST = new Set<string>([path.join('lib', 'firebase', 'storage.ts')]);

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip __fixtures__ and __mocks__ — they may contain path-like literals
      // that are fixture data, not runtime construction.
      if (entry.name.startsWith('__')) continue;
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      out.push(...listSourceFiles(full));
      continue;
    }
    if (!/\.(ts|tsx|mjs|js)$/.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

const TEMPLATE_PATH_PATTERN = /`(?:[^`\\]|\\.)*users\/\$\{/;

describe('storage path grep guard', () => {
  it('only the helper constructs `users/${...}` template paths', () => {
    const files = [
      ...listSourceFiles(path.join(REPO_ROOT, 'app')),
      ...listSourceFiles(path.join(REPO_ROOT, 'lib')),
    ];

    const violations: string[] = [];
    for (const file of files) {
      const rel = path.relative(REPO_ROOT, file);
      if (ALLOWLIST.has(rel)) continue;
      const contents = fs.readFileSync(file, 'utf8');
      if (TEMPLATE_PATH_PATTERN.test(contents)) {
        violations.push(rel);
      }
    }

    expect(violations).toEqual([]);
  });
});
