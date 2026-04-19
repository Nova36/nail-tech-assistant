'use server';

import { assertAllowedEmail } from '@/lib/auth/allowlist';
import { env } from '@/lib/env';

export type LoginActionState =
  | { status: 'idle' }
  | { status: 'sent' }
  | {
      status: 'rejected';
      message: string;
      reason?: 'not_allowed' | 'invalid_format';
    };

export async function loginAction(
  prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState>;
export async function loginAction(
  formData: FormData
): Promise<LoginActionState>;
export async function loginAction(
  prevStateOrFormData: FormData | LoginActionState,
  maybeFormData?: FormData
): Promise<LoginActionState> {
  const formData =
    prevStateOrFormData instanceof FormData
      ? prevStateOrFormData
      : maybeFormData;

  if (!(formData instanceof FormData)) {
    return {
      status: 'rejected',
      message: 'Please enter a valid email address.',
      reason: 'invalid_format',
    };
  }

  const email = String(formData.get('email') ?? '').trim();
  const gate = assertAllowedEmail(email);

  if (!gate.ok) {
    if (gate.reason === 'invalid_format') {
      return {
        status: 'rejected',
        message: 'Please enter a valid email address.',
        reason: 'invalid_format',
      };
    }

    return {
      status: 'rejected',
      message: 'Only the configured email can sign in.',
    };
  }

  try {
    const { getAuth, sendSignInLinkToEmail } = await import('firebase/auth');
    const { createBrowserFirebaseClient } =
      await import('@/lib/firebase/client');
    const app = createBrowserFirebaseClient();
    const auth = getAuth(app);

    await sendSignInLinkToEmail(auth, email, {
      url: `${env.APP_URL}/login/finish`,
      handleCodeInApp: true,
    });

    return { status: 'sent' };
  } catch {
    return {
      status: 'rejected',
      message: 'Could not send the sign-in link. Please try again.',
    };
  }
}
