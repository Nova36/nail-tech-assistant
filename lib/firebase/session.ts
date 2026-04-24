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
      console.error(
        '[getSessionFromCookieString] decoded claims missing email',
        { uid: decodedClaims.uid }
      );
      return null;
    }

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
    };
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[getSessionFromCookieString] verifySessionCookie failed', {
      code,
      message,
    });
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<Session | null> {
  return getSessionFromCookieString(req.cookies.get('session')?.value);
}
