import { env } from '@/lib/env';

export type AllowlistResult =
  | { ok: true }
  | { ok: false; reason: 'not_allowed' | 'invalid_format' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertAllowedEmail(email: string): AllowlistResult {
  if (typeof email !== 'string') {
    return { ok: false, reason: 'invalid_format' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return { ok: false, reason: 'invalid_format' };
  }

  const allowedEmail = env.ALLOWED_EMAIL.trim().toLowerCase();

  if (normalizedEmail !== allowedEmail) {
    return { ok: false, reason: 'not_allowed' };
  }

  return { ok: true };
}
