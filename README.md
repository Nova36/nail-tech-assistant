# Nail Tech Assistant

A single-user web app built as a personal gift. Bridges Pinterest inspiration to AI-generated nail-design previews on a five-nail hand visualizer.

**Not distributed. Not commercial. Not accepting sign-ups.** One user only.

## What it does

- Single-user email-allowlisted login
- Connects to the user's own Pinterest account to browse her boards and pins
- Accepts uploaded reference photos alongside Pinterest pins
- Generates a nail-design preview image from the chosen reference(s) and optional text prompt
- Renders the design on a 2D five-nail hand preview with shape selection (almond, coffin, square, stiletto)
- Saves designs to a personal library for later viewing and regeneration

## Prerequisites

- Node 20+ (`node --version`)
- pnpm 10.22+ (`pnpm --version`; install via `npm i -g pnpm@10.22.0`)
- Firebase CLI (`firebase --version`; install via `npm i -g firebase-tools`)
- Java 21 (required for Firebase Auth emulator; `java --version`)

## Setup

```bash
git clone git@github.com:Nova36/nail-tech-assistant.git
cd nail-tech-assistant
pnpm install
cp .env.local.example .env.local
# then populate .env.local — see Environment variables below
```

## Environment variables

Obtain Firebase credentials from the [Firebase Console](https://console.firebase.google.com/) under Project Settings; the Vercel deployment uses the same values via the project's Environment Variables panel.

| Variable                                   | Required                          | Description                                                                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Yes                               | Web SDK API key from Firebase Console > Project Settings > General > Your apps > Web SDK config.                                                                                                                                                            |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Yes                               | Firebase Auth domain (typically `<project-id>.firebaseapp.com`).                                                                                                                                                                                            |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Yes                               | Firebase project ID.                                                                                                                                                                                                                                        |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Yes                               | Cloud Storage bucket (typically `<project-id>.appspot.com`).                                                                                                                                                                                                |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes                               | FCM sender ID; required by Firebase Web SDK init even though messaging is unused.                                                                                                                                                                           |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Yes                               | Firebase App ID from the Web SDK config.                                                                                                                                                                                                                    |
| `FIREBASE_SERVICE_ACCOUNT_JSON`            | Yes                               | Server-only. Full JSON service-account key as a single-line string. Authenticates Firebase Admin AND Vertex AI (Gemini 2.5 Flash Image). Generate via Firebase Console > Project Settings > Service accounts > Generate new private key. Treat as a secret. |
| `FIREBASE_PROJECT_ID`                      | Yes                               | Server-only. Same project ID; some server helpers read this name.                                                                                                                                                                                           |
| `FIREBASE_CLIENT_EMAIL`                    | No                                | Server-only. Alternative to `FIREBASE_SERVICE_ACCOUNT_JSON`; used together with `FIREBASE_PRIVATE_KEY`.                                                                                                                                                     |
| `FIREBASE_PRIVATE_KEY`                     | No                                | Server-only. Alternative to `FIREBASE_SERVICE_ACCOUNT_JSON`.                                                                                                                                                                                                |
| `ALLOWED_EMAIL`                            | Yes                               | Comma-separated allowlist of permitted sign-in email addresses. Single-user app — list one or more values.                                                                                                                                                  |
| `APP_URL`                                  | Yes                               | Canonical base URL of the app (for example, `http://localhost:3000` for dev, or the Vercel production URL in production).                                                                                                                                   |
| `PINTEREST_ACCESS_TOKEN`                   | Yes, unless `PINTEREST_MOCK=true` | Required for Pinterest browse. Static Pinterest API v5 access token from your Pinterest Developer app. See [Pinterest setup](#pinterest-setup).                                                                                                             |
| `PINTEREST_API_BASE`                       | No                                | Default `https://api.pinterest.com/v5`. Override for testing.                                                                                                                                                                                               |
| `PINTEREST_MOCK`                           | No                                | Set to `true` to bypass real Pinterest calls and use canned fixtures.                                                                                                                                                                                       |
| `FIREBASE_AUTH_EMULATOR_HOST`              | No                                | Dev-only. Set automatically by `pnpm test:rules` and `pnpm dev:e2e`; do not set manually for `pnpm dev`.                                                                                                                                                    |
| `FIREBASE_STORAGE_EMULATOR_HOST`           | No                                | Dev-only. Same as above.                                                                                                                                                                                                                                    |
| `STORAGE_EMULATOR_HOST`                    | No                                | Dev-only. Alternative emulator hint used by some helpers.                                                                                                                                                                                                   |

## Firebase setup

- Go to Firebase Console > Authentication > Settings > Authorized Domains.
- Add `localhost` (so port 3000 dev sign-in links work).
- Add the production Vercel domain (for example, `nail-tech-assistant.vercel.app`).
- Without this, email-link sign-in returns a continueUrl error.

## Pinterest setup

- Create a Pinterest Developer app at https://developers.pinterest.com/.
- Generate a long-lived access token for the test user (the wife / single user).
- Store it as `PINTEREST_ACCESS_TOKEN` in `.env.local` and in Vercel project env.
- Tokens are valid ~1 year; rotate annually.
- To bypass Pinterest entirely during local dev, set `PINTEREST_MOCK=true` to use canned fixtures.

## Running locally

```bash
pnpm dev          # port 3000, real Firebase services, Turbopack
pnpm dev:e2e      # port 3000 (no Turbopack), used by Playwright e2e harness
```

Note: emulator-backed dev uses `pnpm test:rules` for unit-rules tests; the regular dev server hits real Firebase per the project's environment variables.

## Testing

```bash
pnpm test                        # vitest unit suite (jsdom + node lanes)
pnpm test:rules                  # Firestore + Storage rules tests against the emulator
pnpm test:security               # security-focused vitest config (post-build)
pnpm test:e2e                    # Playwright e2e against the running dev server
pnpm test:e2e --project=ipad-landscape   # tablet-viewport e2e (added in story f5)
```

## Deploy

- Push to `epic-*` or `main` triggers a preview / production Vercel deploy automatically.
- Set every env var above in Vercel > Project > Settings > Environment Variables for the appropriate environments (Preview / Production).
- `FIREBASE_SERVICE_ACCOUNT_JSON` must be the entire JSON value as a single-line string, not a file path.
- After updating env vars in Vercel, redeploy the latest commit to pick them up.

## Privacy

See [PRIVACY.md](./PRIVACY.md).
