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
});

export function getEnv(): Env {
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
