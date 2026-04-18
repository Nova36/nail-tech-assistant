/**
 * A4 test-spec stub — overwritten in implement phase.
 *
 * Real implementation: GET returns `{ ok: true, ts: <number> }` with status 200,
 * no auth, no DB, no firebase-admin imports. Allowed to run at edge runtime.
 */
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
