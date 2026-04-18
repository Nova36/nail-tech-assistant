import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

const CI_WORKFLOW_PATH = join(process.cwd(), '.github', 'workflows', 'ci.yml');

describe('CI workflow', () => {
  it('ci.yml file exists', () => {
    expect(existsSync(CI_WORKFLOW_PATH)).toBe(true);
  });

  it('ci.yml parses as valid YAML', () => {
    const raw = readFileSync(CI_WORKFLOW_PATH, 'utf-8');
    const doc = parse(raw);
    expect(doc).toBeTruthy();
  });

  it('top-level jobs key is present', () => {
    const raw = readFileSync(CI_WORKFLOW_PATH, 'utf-8');
    const doc = parse(raw) as Record<string, unknown>;
    expect(doc).toHaveProperty('jobs');
  });

  it('at least one job runs typecheck, lint, and test via pnpm', () => {
    const raw = readFileSync(CI_WORKFLOW_PATH, 'utf-8');
    const doc = parse(raw) as {
      jobs: Record<string, { steps?: Array<{ run?: string }> }>;
    };
    const jobs = Object.values(doc.jobs ?? {});

    const allStepRuns = jobs.flatMap((job) =>
      (job.steps ?? []).map((s) => s.run ?? '').filter(Boolean)
    );

    const hasTypecheck = allStepRuns.some(
      (r) => r.includes('pnpm') && r.includes('typecheck')
    );
    const hasLint = allStepRuns.some(
      (r) => r.includes('pnpm') && r.includes('lint')
    );
    const hasTest = allStepRuns.some(
      (r) => r.includes('pnpm') && r.includes('test')
    );

    expect(hasTypecheck).toBe(true);
    expect(hasLint).toBe(true);
    expect(hasTest).toBe(true);
  });
});
