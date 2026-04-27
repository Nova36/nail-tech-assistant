// Vitest stub for the `server-only` package.
// The real package throws when imported from a client bundle; in tests we
// want server-only modules to be importable without crashing the runner.
export {};
