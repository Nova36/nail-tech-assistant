import { getAuth } from 'firebase-admin/auth';

import { createServerFirebaseAdmin } from './server';

import type { NextRequest } from 'next/server';

export interface Session {
  uid: string;
  email: string;
}

export async function getSessionFromCookieString(
  sessionCookie: string | undefined | null
): Promise<Session | null> {
  if (!sessionCookie) {
    return null;
  }

  try {
    const app = createServerFirebaseAdmin();
    const decodedClaims = await getAuth(app).verifySessionCookie(
      sessionCookie,
      true
    );

    if (!decodedClaims.email) {
      return null;
    }

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<Session | null> {
  return getSessionFromCookieString(req.cookies.get('session')?.value);
}
