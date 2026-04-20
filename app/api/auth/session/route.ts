import { getAuth } from 'firebase-admin/auth';
import { NextResponse, type NextRequest } from 'next/server';

import { assertAllowedEmail } from '@/lib/auth/allowlist';
import { createServerFirebaseAdmin } from '@/lib/firebase/server';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'session';
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_S = 5 * 24 * 60 * 60;

interface CreateSessionBody {
  idToken?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json(
      { error: 'invalid_body', message: 'Request body must be JSON.' },
      { status: 400 }
    );
  }

  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return NextResponse.json(
      {
        error: 'missing_id_token',
        message: 'idToken is required in the request body.',
      },
      { status: 400 }
    );
  }

  const app = createServerFirebaseAdmin();
  const auth = getAuth(app);

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/auth/session] verifyIdToken failed', { code, message });
    return NextResponse.json(
      {
        error: 'invalid_id_token',
        message: 'The sign-in token is invalid or expired.',
      },
      { status: 401 }
    );
  }

  const email = decoded.email ?? '';
  const gate = assertAllowedEmail(email);
  if (!gate.ok) {
    console.error('[api/auth/session] allowlist rejection', {
      reason: gate.reason,
      email_domain: email.split('@')[1] ?? null,
    });
    return NextResponse.json(
      {
        error: 'not_allowed',
        message: 'This account is not allowed to sign in.',
      },
      { status: 403 }
    );
  }

  let sessionCookie: string;
  try {
    sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    });
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    const message = error instanceof Error ? error.message : String(error);
    console.error('[api/auth/session] createSessionCookie failed', {
      code,
      message,
    });
    return NextResponse.json(
      {
        error: 'session_cookie_failed',
        message: 'Could not establish a session. Please try again.',
      },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: sessionCookie,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: FIVE_DAYS_S,
  });
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
