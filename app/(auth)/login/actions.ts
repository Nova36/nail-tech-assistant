/**
 * STUB — created by the A3 tester only so the failing tests parse and the
 * pre-commit typecheck hook succeeds. Developer (Codex) will replace this
 * with the real server action in the `implement` phase.
 *
 * Running against this stub, every test in tests/unit/auth/login-action.test.ts
 * fails at runtime with the TODO error below — which is the intended
 * red-phase signal.
 */

export type LoginActionResult =
  | { status: 'sent' }
  | { status: 'rejected'; message?: string; reason?: string };

export async function loginAction(
  formData: FormData
): Promise<LoginActionResult> {
  void formData;
  throw new Error('TODO(a3.implement): loginAction not yet implemented');
}
