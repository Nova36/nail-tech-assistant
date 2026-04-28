import { z } from 'zod';

export interface Env {
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  ALLOWED_EMAIL: string;
  APP_URL: string;
  PINTEREST_ACCESS_TOKEN: string;
  PINTEREST_MOCK?: 'ok' | 'invalid_token' | 'insufficient_scope' | 'network';
}

class EnvValidationError extends Error {
  constructor(missingKeys: string[]) {
    const label =
      missingKeys.length === 1
        ? 'environment variable'
        : 'environment variables';
    super(`Missing required ${label}: ${missingKeys.join(', ')}`);
    this.name = 'EnvValidationError';
  }
}

const requiredString = z.string().trim().min(1, 'Required');

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: requiredString,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: requiredString,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: requiredString,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: requiredString,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: requiredString,
  NEXT_PUBLIC_FIREBASE_APP_ID: requiredString,
  FIREBASE_PROJECT_ID: requiredString,
  FIREBASE_CLIENT_EMAIL: requiredString,
  FIREBASE_PRIVATE_KEY: requiredString.transform((value) =>
    value.replace(/\\n/g, '\n')
  ),
  ALLOWED_EMAIL: requiredString,
  APP_URL: requiredString,
  PINTEREST_ACCESS_TOKEN: requiredString,
  PINTEREST_MOCK: z
    .enum(['ok', 'invalid_token', 'insufficient_scope', 'network'])
    .optional(),
});

/**
 * If FIREBASE_SERVICE_ACCOUNT_JSON is set (a single JSON blob from the Firebase
 * Console "Generate new private key" download), derive the three admin-side
 * env vars from it. Explicit split vars take precedence if the user set them.
 *
 * This lets Vercel/hosting config use one environment variable instead of three
 * — avoids the PEM-newline-escaping trap on FIREBASE_PRIVATE_KEY.
 */
function hydrateFromServiceAccountJson(source: NodeJS.ProcessEnv): void {
  const blob = source.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!blob) return;

  try {
    const parsed = JSON.parse(blob) as Partial<{
      project_id: string;
      client_email: string;
      private_key: string;
    }>;

    if (!source.FIREBASE_PROJECT_ID && parsed.project_id) {
      source.FIREBASE_PROJECT_ID = parsed.project_id;
    }
    if (!source.FIREBASE_CLIENT_EMAIL && parsed.client_email) {
      source.FIREBASE_CLIENT_EMAIL = parsed.client_email;
    }
    if (!source.FIREBASE_PRIVATE_KEY && parsed.private_key) {
      source.FIREBASE_PRIVATE_KEY = parsed.private_key;
    }
  } catch {
    // Parse failed — zod validation below will surface the missing split vars
    // with a precise error message. Do not throw here; keep a single error
    // surface.
  }
}

export function getEnv(): Env {
  hydrateFromServiceAccountJson(process.env);

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const missingKeys = [
      ...new Set(
        parsed.error.issues.map((issue) => issue.path.join('.')).filter(Boolean)
      ),
    ];
    throw new EnvValidationError(missingKeys);
  }

  return parsed.data;
}

export const env: Env = getEnv();
