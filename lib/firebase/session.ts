import { getAuth } from 'firebase-admin/auth';
import { cookies } from 'next/headers';

import { createServerFirebaseAdmin } from './server';

import type { NextRequest } from 'next/server';

export interface Session {
  uid: string;
  email: string;
  /**
   * Firebase user's displayName claim, when set on the auth record. Email-link
   * sign-in does not populate this automatically — set it once via the
   * Firebase Console (Authentication → Users → edit user → Display name) or
   * via the Admin SDK's `updateUser({ displayName })`.
   */
  name: string | null;
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

    const rawName = (decodedClaims as { name?: unknown }).name;
    const name =
      typeof rawName === 'string' && rawName.trim().length > 0
        ? rawName.trim()
        : null;

    return {
      uid: decodedClaims.uid,
      email: decodedClaims.email,
      name,
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

export async function getSessionForServerAction(): Promise<Session | null> {
  return getSessionFromCookieString((await cookies()).get('session')?.value);
}
