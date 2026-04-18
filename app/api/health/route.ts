/**
 * A4 test-spec stub — overwritten in implement phase.
 *
 * Real implementation: GET returns `{ ok: true, ts: <number> }` with status 200,
 * no auth, no DB, no firebase-admin imports. Allowed to run at edge runtime.
 */
export async function GET(): Promise<Response> {
  throw new Error('TODO(a4.implement): health route not yet implemented');
}
