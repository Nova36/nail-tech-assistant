#!/usr/bin/env node
/**
 * Sets the Firebase Auth displayName on the configured ALLOWED_EMAIL user.
 * Email-link sign-in does not populate displayName automatically; this script
 * lets you set it once. Once set, the Firebase session cookie carries `name`
 * as a claim and the dashboard greeting + sidebar profile use it directly.
 *
 * Usage:
 *   node scripts/set-display-name.mjs "Don Matthews"
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_JSON (or the split triplet) and ALLOWED_EMAIL
 * from .env.local. After a successful run, sign out and back in once so the
 * fresh session cookie carries the new claim.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import admin from 'firebase-admin';

function loadDotEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function hydrateFromServiceAccountJson() {
  const blob = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!blob) return;
  const parsed = JSON.parse(blob);
  if (!process.env.FIREBASE_PROJECT_ID && parsed.project_id) {
    process.env.FIREBASE_PROJECT_ID = parsed.project_id;
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL && parsed.client_email) {
    process.env.FIREBASE_CLIENT_EMAIL = parsed.client_email;
  }
  if (!process.env.FIREBASE_PRIVATE_KEY && parsed.private_key) {
    process.env.FIREBASE_PRIVATE_KEY = parsed.private_key;
  }
}

async function main() {
  loadDotEnvLocal();
  hydrateFromServiceAccountJson();

  const newName = process.argv[2]?.trim();
  if (!newName) {
    console.error('Usage: node scripts/set-display-name.mjs "First Last"');
    process.exit(1);
  }

  const email = process.env.ALLOWED_EMAIL?.trim();
  if (!email) {
    console.error('ALLOWED_EMAIL not set in .env.local');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Missing Firebase admin credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or the split triplet.'
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().updateUser(user.uid, { displayName: newName });

  console.log(
    `Updated displayName for ${email} (uid=${user.uid}) → "${newName}"`
  );
  console.log(
    'Sign out and back in once so a fresh session cookie carries the name claim.'
  );
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
