/**
 * STUB — created by the A3 tester only so the failing tests parse and the
 * pre-commit typecheck hook succeeds. Developer (Codex) will replace this
 * with the real implementation in the `implement` phase.
 *
 * Running against this stub, every test in tests/unit/auth/allowlist.test.ts
 * fails at runtime with the TODO error below — which is the intended
 * red-phase signal.
 */

export type AllowlistResult =
  | { ok: true }
  | { ok: false; reason: 'not_allowed' | 'invalid_format' };

export function assertAllowedEmail(email: string): AllowlistResult {
  void email;
  throw new Error('TODO(a3.implement): assertAllowedEmail not yet implemented');
}
