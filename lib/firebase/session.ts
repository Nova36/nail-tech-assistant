// STUB — Codex implements in step 3. Export signature only.
import type { NextRequest } from 'next/server';

export interface Session {
  uid: string;
  email: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getSession(req: NextRequest): Promise<Session | null> {
  throw new Error('NOT IMPLEMENTED');
}
