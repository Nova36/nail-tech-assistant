# Regenerate visualizer baselines after intentional visual changes:

pnpm exec playwright test --update-snapshots tests/e2e/visualizer-snapshots.spec.ts
