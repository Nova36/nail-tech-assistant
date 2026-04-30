# Epic C — Raw Research Findings

Generated 2026-04-29 by `researcher` (Claude). Not a brief — raw data only. Downstream `technical-writer` will format for the planning doc.

Scope: Reference Collection + AI Generation Pipeline (PRD Epic C; structured-outline Slices 3 + 4; depends on provider gate from Slice 1).

---

## 1. Epic B foundation reuse

### 1.1 Pinterest client surface (`lib/pinterest/`)

#### `lib/pinterest/client.ts`

**Imports + base:**

```ts
import 'server-only';
import { env } from '@/lib/env';
// ... fixtures + normalizePinterestResponse
const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';
```

**Key exports:**

- `verifyPinterestToken(): Promise<VerifyPinterestTokenResult>` — calls `GET /v5/user_account`. Returns `{ ok: true } | { ok: false; reason: 'invalid_token' | 'insufficient_scope' | 'network' }`.
- `listPinterestBoards(opts?: { bookmark?: string; pageSize?: number }): Promise<ListPinterestBoardsResult>` — `GET /v5/boards`. Returns `{ ok: true; items: PinterestBoard[]; nextBookmark: string | null } | { ok: false; reason: ... }`.
- `listPinterestBoardPins(opts: { boardId: string; bookmark?: string; pageSize?: number }): Promise<ListPinterestBoardPinsResult>` — `GET /v5/boards/{boardId}/pins`. Same shape as boards. **`pageSize` defaults to 25**.
- Internal `pinterestFetch(path, init)` — sets `Authorization: Bearer ${env.PINTEREST_ACCESS_TOKEN}`, `cache: 'no-store'` by default.
- Internal `getMockMode()` — reads `env.PINTEREST_MOCK` only when `process.env.VERCEL !== '1'` (mock branch never runs in production).

**Discriminated union shapes:**

```ts
type ListPinterestBoardsResult =
  | { ok: true; items: PinterestBoard[]; nextBookmark: string | null }
  | {
      ok: false;
      reason:
        | 'invalid_token'
        | 'insufficient_scope'
        | 'not_found'
        | 'rate_limit'
        | 'network'
        | 'unknown';
    };
```

`ListPinterestBoardPinsResult` is identical (with `PinterestPin`).

**Caveats:**

- All three functions are **server-only** (`import 'server-only'`); cannot be invoked from client components or browser bundle.
- `nextBookmark` from real Pinterest comes from response body field `bookmark`.
- Error mapping is in `lib/pinterest/errors.ts` (centralised — Epic C should reuse, not re-implement).
- Cover-image sub-field path was **not fully validated** by b2 researcher (per `__fixtures__/boards.ts` comment: "cover-image sub-field path is unconfirmed; we use `media.image_cover_url`"). Carry forward as caveat for pin-image path too.

#### `lib/pinterest/types.ts` (full file)

Concrete types Epic C will consume:

```ts
export type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  pin_count?: number;
  follower_count?: number;
  created_at?: string;
  board_pins_modified_at?: string;
  media?: {
    cover_images?: unknown[];
    image_cover_url?: string;
    [k: string]: unknown;
  };
  owner?: { username?: string };
};

export type PinterestPinImageVariant = {
  url: string;
  width?: number;
  height?: number;
};

export type PinterestPin = {
  id: string;
  title?: string;
  description?: string;
  alt_text?: string;
  link?: string;
  board_id?: string;
  board_owner?: { username?: string };
  created_at?: string;
  creative_type?: string;
  dominant_color?: string;
  media?: {
    media_type?: string;
    images?: { [variant: string]: PinterestPinImageVariant | undefined };
  };
};

export type PinterestPaginated<T> = { items: T[]; bookmark: string | null };
```

**Image variants seen in real Pinterest + fixtures**: `'600x'`, `'400x300'`, `'150x150'`. Epic C "ingest pin image" should pick the largest (`600x` or larger when present).

#### `lib/pinterest/errors.ts` (full file)

```ts
export type PinterestError =
  | { reason: 'invalid_token' }
  | { reason: 'insufficient_scope' }
  | { reason: 'not_found' }
  | { reason: 'rate_limit'; retryAfterMs?: number }
  | { reason: 'network' }
  | { reason: 'unknown'; status?: number };

export function normalizePinterestResponse(
  res: Response
): PinterestError | null {
  if (res.ok) return null;
  switch (res.status) {
    case 401:
      return { reason: 'invalid_token' };
    case 403:
      return { reason: 'insufficient_scope' };
    case 404:
      return { reason: 'not_found' };
    case 429:
      return { reason: 'rate_limit' };
    default:
      return { reason: 'unknown', status: res.status };
  }
}
```

Epic C's pin-image fetch path can reuse the same function for any 401/403/404/429 mapping, but the **image-binary fetch is to `pinimg.com`, not `api.pinterest.com`** — image fetch is unauthenticated, no token header needed (see `next.config.ts`: `i.pinimg.com` is the only `remotePatterns` host registered).

#### `lib/pinterest/token-replacement-copy.ts`

Exports `tokenInvalidCopy` and `insufficientScopeCopy` — already in use by b4 page-level views (`/pinterest` and `/pinterest/[boardId]/page.tsx`). Epic C's reference-ingest flow can reuse the same copy if a Pinterest pin selection fails on token issues.

#### `app/(authenticated)/pinterest/actions.ts` (server action exemplar)

```ts
'use server';
import {
  listPinterestBoardPins,
  listPinterestBoards,
} from '@/lib/pinterest/client';

export async function loadMoreBoards(
  bookmark: string
): Promise<{ items: PinterestBoard[]; nextBookmark: string | null }> {
  const result = await listPinterestBoards({ bookmark });
  if (!result.ok)
    throw new Error(`Failed to load Pinterest boards: ${result.reason}`);
  return { items: result.items, nextBookmark: result.nextBookmark };
}
```

Caveat: this pattern **throws** on failure rather than returning a typed envelope — fine for `loadMore` infinite-scroll but Epic C's `selectPinterestPin`/`uploadReference` must return discriminated unions because the UI needs to differentiate `'storage_failed'` vs `'pinterest_404'` vs `'image_too_large'`. Pattern divergence is intentional, not a contract to reuse blindly.

### 1.2 Pages already shipped

- `app/(authenticated)/pinterest/page.tsx` — boards grid + token-verify gate (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`).
- `app/(authenticated)/pinterest/[boardId]/page.tsx` — pin grid w/ Suspense + ref-counting `createPinsResource()` pattern. Shows `<TokenInvalidView>` / `<InsufficientScopeView>` / `<PinGrid>` / `<PinGridSkeleton>` based on token-verify result.
- `app/(authenticated)/pinterest/error.tsx` and `not-found.tsx` — per-page error boundaries.
- Components live at `components/pinterest/*` (not enumerated here — out of stated scope, but `PinGrid`, `PinGridSkeleton`, `TokenInvalidView`, `InsufficientScopeView` exist).

### 1.3 Fixtures Epic C can reuse for tests

- `lib/pinterest/__fixtures__/boards.ts` — `mockBoardsPage1` / `mockBoardsPage2` with `MOCK_BOOKMARK_PAGE_2` cursor sentinel. Cover images are inline SVG data URIs (no CDN dependency).
- `lib/pinterest/__fixtures__/pins.ts` — `getMockPinsPage1(boardId)` / `getMockPinsPage2(boardId)` with `MOCK_PINS_BOOKMARK_PAGE_2` cursor. SVG data URIs same pattern. **Useful as input fixtures for `ingestPinterestPin(pinId)` tests.**

---

## 2. Firebase Storage prior art

### Search results

Grep for `firebase|storage|bucket|getStorage|getDownloadURL|firestore|FirebaseApp` across `lib/` and `app/` returned only:

- `lib/firebase/client.ts` — browser SDK init only
- `lib/firebase/server.ts` — admin SDK init (auth/firestore-capable, but no Storage helper)
- `lib/firebase/session.ts` — auth-only
- `app/(auth)/login/actions.ts` — auth-only
- `app/api/auth/session/route.ts` — auth-only

### Storage state: GREENFIELD

- **No `getStorage()` call anywhere in source.** Neither client nor admin Firebase Storage SDK is wired up.
- **`storage.rules` does NOT exist** in repo root (`cat storage.rules` returned `no storage.rules`).
- **`firebase.json` registers only firestore + auth emulators**, no storage emulator block:
  ```json
  {
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
    },
    "emulators": { "firestore": { "port": 8080 }, "auth": { "port": 9099 } }
  }
  ```
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` IS in `lib/env.ts` zod schema (validated and required), so the bucket _value_ is provisioned in env, but **no code uses it yet**.
- `firebase` (web SDK) v12.12.0 + `firebase-admin` v13.8.0 are in `package.json` deps — both ship Storage submodules, no new install needed.

### Closest sibling pattern to model after: `lib/firebase/server.ts`

Verbatim init pattern (Epic C should mirror this for `lib/firebase/storage.ts`):

```ts
import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

const ADMIN_APP_KEY = Symbol.for('firebase-admin-app');
type GlobalAdminStore = Record<PropertyKey, unknown>;

function getPrivateKey(): string {
  return process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');
}

function isEmulatorMode(): boolean {
  return Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
}

export function createServerFirebaseAdmin(): App {
  const globalStore = globalThis as GlobalAdminStore;
  const existingGlobalApp = globalStore[ADMIN_APP_KEY];
  if (existingGlobalApp) return existingGlobalApp as App;

  hydrateFromServiceAccountJson();
  const initOptions = isEmulatorMode()
    ? { projectId: process.env.FIREBASE_PROJECT_ID! }
    : { credential: cert({ projectId: ..., clientEmail: ..., privateKey: getPrivateKey() }) };

  const app = getApps().length === 0 ? initializeApp(initOptions) : getApps()[0]!;
  globalStore[ADMIN_APP_KEY] = app;
  return app;
}
```

Important behaviour to copy:

- Globalised app key via `Symbol.for(...)` to survive Next.js HMR + per-route bundle reloads.
- `hydrateFromServiceAccountJson()` is **inlined here, not imported** — comment in file calls out the rationale: "Vercel route bundles that don't transitively import lib/env (e.g. the authenticated layout) otherwise get an undefined private key." Memory `feedback_env_hydration_import_order` enforces this. **Epic C's storage helper must inline its own hydration, not depend on `lib/env`'s side-effect hydration.**

### Browser SDK pattern: `lib/firebase/client.ts`

```ts
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export function createBrowserFirebaseClient(): FirebaseApp {
  const apps = getApps();
  if (apps.length > 0) {
    const maybeMock = initializeApp as typeof initializeApp & {
      mockClear?: () => void;
    };
    maybeMock.mockClear?.();
    return apps[0]!;
  }
  return initializeApp(firebaseConfig);
}
```

`storageBucket` is already passed into the client config — calling `getStorage(app)` from `firebase/storage` will work without env additions.

### Recommended Epic C additions (still greenfield)

- New file: `lib/firebase/storage.ts` (server) — admin-SDK download/upload helpers, mirroring `server.ts` global-app pattern.
- New file: `storage.rules` — user-scoped owner rules, mirroring `firestore.rules` "default-deny + narrow-allow" convention.
- New section in `firebase.json` for storage emulator (port 9199 is canonical) + storage rules pointer.

---

## 3. Reference data model gaps

### Search results

- `lib/types.ts` is ENTIRELY:

  ```ts
  export type NailShape = 'almond' | 'coffin' | 'square' | 'round' | 'oval';
  export interface AuthUser {
    uid: string;
    email: string;
  }
  export interface Profile {
    /** Matches Firebase Auth uid exactly per FR-A-7 */ id: string;
  }
  ```

  No `Reference`, `Design`, `Generation` types exist yet.

- `firestore.rules` has **only** `/profiles/{uid}` allow rule + default-deny. No `references`, `designs`, `generations`, or `design_secondary_references` paths declared.
- No `firestore.indexes.json` content was indexed (file may exist but is empty / no compound indexes yet — confirm in Epic C).
- No converters in `lib/firebase/*` for any of these collections.

### Confirmation: ALL collection-schema work is greenfield for Epic C

Per `structured-outline.md` Part 3b Migration Plan (verbatim):

> Proposed sequence from the inputs:
>
> - baseline `profiles` rules and converters
> - `references` rules and converters
> - `designs` / `generations` rules and converters
> - ordered secondary references under `designs`
> - `chat_turns` support for P1

`profiles` is shipped (Epic A). `references`, `designs`, `generations` rules + converters are Epic C's responsibility.

### Slice-4 interface signatures (reference shapes the writer can use)

From `structured-outline.md` Part 2 Slice 4 Interfaces (verbatim):

```ts
generateDesign(input: { designId: string }): Promise<
  | { status: 'success'; generationId: string; resultStoragePath: string }
  | { status: 'failure'; generationId: string;
      errorCode: 'refusal' | 'rate_limit' | 'network' | 'unknown'; message: string }>

buildGeminiRequest(input: {
  primaryReference: ReferenceRecord;
  secondaryReferences: ReferenceRecord[];
  promptText?: string;
  nailShape: NailShape;
}): GeminiRequestPayload

persistGenerationStart(input: { designId: string; requestJson: unknown }): Promise<{ generationId: string }>
persistGenerationResult(input: {
  generationId: string;
  status: 'success' | 'failure';
  resultStoragePath?: string;
  responseMetadata?: unknown;
  errorMessage?: string;
}): Promise<void>
```

`ReferenceRecord` and `GeminiRequestPayload` are unspecified in the outline — Epic C planning must define them.

### FR-C-1 → FR-C-7 (verbatim from `prd.md`)

- **FR-C-1**: Pinterest-selected images and uploaded photos must normalize into the same durable `references` model.
- **FR-C-2**: Exactly one primary reference and preserved ordered secondary references.
- **FR-C-3**: Optional prompt stored with design input set; treated as able to override conflicting visual cues.
- **FR-C-4**: Durable design record before or at generation time, preserves references + prompt + shape.
- **FR-C-5**: Generation service assembles multimodal provider request from normalized references, prompt, and shape.
- **FR-C-6**: Generation lifecycle creates a generation row before provider invocation, classifies result states, persists output storage paths, updates latest-generation linkage on success.
- **FR-C-7** (truncated in retrieved doc — confirm in PRD before writer formats).

---

## 4. Gemini integration prior art

### Search results

Grep for `gemini|googleapis|@google/generative-ai|multimodal|generation` across source: **NO matches**. Epic C is greenfield for Gemini.

`package.json` deps relevant to AI: none yet. **Will need to add SDK.**

### context7 lookup: Firebase AI Logic

context7 returned `/websites/firebase_google_ai-logic` (high reputation, benchmark 82.4). Query "Gemini 2.5 Flash Image multimodal request server-side Node.js" returned **JavaScript code samples for browser/web SDK** (`firebase/ai`).

**Critical finding:** The Firebase AI Logic SDK in the canonical samples is `firebase/ai` (web), not server-side. Pattern:

```js
import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend, ResponseModality } from "firebase/ai";

const firebaseApp = initializeApp(firebaseConfig);
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-image",
  generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] },
});

// Multimodal: text + reference image
const imagePart = { inlineData: { data: <base64>, mimeType: file.type } };
const result = await model.generateContent([prompt, imagePart]);

// Output: result.response.inlineDataParts()[0].inlineData → { mimeType, data: <base64> }
// OR iterate result.response.candidates[0].content.parts for parts with .inlineData or .text
```

The `firebase` v12.12.0 already in `package.json` ships the `firebase/ai` submodule, but it's a **client** SDK. Evaluating whether it's safe / supported to call from a Next.js server runtime requires confirmation — see UNANSWERED in §8. Alternatives:

- `@google/generative-ai` (Google AI SDK) is server-friendly Node SDK. Equivalent multimodal pattern (`generateContent([{ text }, { inlineData: { mimeType, data } }])`).
- Vertex AI SDK (`@google-cloud/vertexai`) for higher-tier reliability + IAM auth.

`vertical-plan.md` Slice 4 says "production Firebase AI Logic request assembly" — implies the team has already chosen Firebase AI Logic, not raw Google AI / Vertex. Confirm with user (open question in §8).

### Multimodal request shape (consistent across SDKs)

For nail-design generation, primary + ordered secondary references plus optional prompt becomes:

```ts
const parts = [
  { text: promptText ?? '' /* or system-instructed default */ },
  { inlineData: { mimeType: 'image/jpeg', data: <primary base64> } },
  ...secondaryReferences.map(r => ({ inlineData: { mimeType: r.mime, data: r.base64 } })),
];
const result = await model.generateContent(parts);
```

Output handling: read `result.response.candidates[0].content.parts`, iterate, each part is either `{ text }` or `{ inlineData: { mimeType, data } }`. Image-mode response is always one image part — store `data` as buffer to Storage at e.g. `generations/{uid}/{designId}/{generationId}.png`.

Image **input size limit**: per Google docs, inline image parts in Gemini are capped at ~20MB total request. For larger images, file upload via Files API is required — but Pinterest pin originals are typically <2MB and uploads come from phone cameras (3-8MB), so inline should suffice. Confirm in spike (Slice 1) per Risk #2.

`generationConfig.responseModalities` must include `IMAGE` (or no image is returned). Required for image-output.

---

## 5. Server actions + UI surface

### Server action prior art

Grep for `'use server'` returned exactly two server-action files:

- `app/(auth)/login/actions.ts` — exports `loginAction(prevStateOrFormData, maybeFormData)`. **Rich pattern**: takes `useFormState`-style discriminated state, returns `{ status: 'idle' | 'sent' | 'rejected'; message?; reason? }`. Catches errors with `console.error('[loginAction] sendSignInLinkToEmail failed', { code, message, ... })` — **enforces memory `feedback_silent_catches_cost_time`** (always log error.code + message in catches touching third-party APIs).

- `app/(authenticated)/pinterest/actions.ts` — exports `loadMoreBoards`, `loadMorePins`. Throws `Error` on failure (lighter pattern, used for `loadMore` infinite scroll).

### Canonical envelope shape (prefer for Epic C)

`loginAction`-style discriminated union is the recommended Epic C pattern (matches FR-C-7 deterministic-failure requirement and US-C error-state acceptance):

```ts
type ActionResult<T> =
  | { status: 'success'; data: T }
  | { status: 'rejected'; reason: <enum>; message: string };
```

Epic C actions to add (per Slice 3+4 outline):

- `selectPinterestPin(pinId: string): Promise<...>` — server action, ingests one Pinterest pin into `references`.
- `uploadReference(file: File): Promise<...>` — server action, persists to Storage + `references`.
- `createDesign(input: { primaryRefId; secondaryRefIds[]; promptText?; nailShape }): Promise<{ designId }>` — durable draft.
- `generateDesign(input: { designId }): Promise<...>` — kicks off Gemini call (long-running; consider whether to run in route handler with streaming vs server action).

Outline also references **REST routes** (Part 4 File Change Manifest):

- `app/api/references/upload/route.ts`
- `app/api/references/pinterest/select/route.ts`
- `app/api/designs/create/route.ts`
- `app/api/designs/generate/route.ts`
- `app/api/designs/[id]/route.ts`
- `app/api/designs/[id]/save/route.ts`
- `app/api/designs/[id]/regenerate/route.ts`
- `app/api/spike/gemini/route.ts` (Slice 1 spike)

The outline lists BOTH server actions and route handlers — planning needs to clarify whether server actions are the primary entrypoint and routes are unused, or vice-versa. Existing pattern is **server actions for UI flows** (`loginAction`, `loadMoreBoards`) and **REST only for cross-cutting auth**: `/api/auth/session/route.ts` (POST id-token → session cookie, GET — health), `/api/health/route.ts`. Recommend Epic C continues that split: server actions for the workspace UX, REST routes only for things that don't fit the action shape.

### Routes already in app

```
app/(auth)/login/page.tsx
app/(auth)/login/finish/page.tsx
app/(auth)/login/actions.ts
app/(authenticated)/page.tsx                        — dashboard
app/(authenticated)/pinterest/page.tsx              — boards grid
app/(authenticated)/pinterest/[boardId]/page.tsx    — pin grid
app/(authenticated)/pinterest/actions.ts
app/(authenticated)/pinterest/error.tsx
app/(authenticated)/pinterest/not-found.tsx
app/api/auth/session/route.ts                       — POST: id-token → session cookie
app/api/health/route.ts                             — GET: health check
app/layout.tsx
```

### Auth shell + session contract Epic C inherits

`app/(authenticated)/layout.tsx`:

```tsx
const cookieStore = await cookies();
const session = await getSessionFromCookieString(
  cookieStore.get('session')?.value
);
if (!session) redirect('/login');
const displayName = session.name ?? deriveDisplayName(session.email);
return (
  <div className="flex h-screen bg-background">
    <Sidebar displayName={displayName} email={session.email} />
    <main className="flex-1 overflow-x-hidden overflow-y-auto px-8 py-8 lg:px-12 lg:py-10">
      {children}
    </main>
  </div>
);
```

- `Sidebar` defines `NAV_GROUPS` constant — Epic C will need to add Studio nav items: "New Design" (`/design/new`), "Library" (`/library`).
- `Session` type (from `lib/firebase/session.ts`):
  ```ts
  export interface Session {
    uid: string;
    email: string;
    name: string | null;
  }
  ```
- All Epic C server work has access to `session.uid` via `getSessionFromCookieString` — use it as the user-scope key for Firestore writes and Storage paths.

### Routes Epic C will add (per outline)

`app/(authenticated)/`:

- `design/new/page.tsx` — workspace
- `design/[id]/page.tsx` — saved design viewer
- `library/page.tsx` (Epic D, but may scaffold)
- `spike/gemini/page.tsx` — Slice 1 throwaway

---

## 6. Test infrastructure

### Vitest configs

- `vitest.config.ts` — main lane:

  ```ts
  resolve: { alias: { '@': path.resolve(__dirname, '.'),
                      'server-only': path.resolve(__dirname, 'tests/__mocks__/server-only.ts') } }
  test: { environment: 'jsdom',
          include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
          setupFiles: ['./tests/setup/integration.ts'] }
  ```

  **Note `server-only` alias** — required for Epic C since `lib/pinterest/client.ts` and any new `lib/firebase/storage.ts` import `'server-only'`. Memory `feedback_codex_exec_quirks` warns: forbid test-shim/node_modules-patch in implement prompts; the alias is the canonical pattern.

- `vitest.config.security.ts` — `tests/security/**/*.test.ts`, `environment: 'node'`. Used by `pnpm test:security` (runs `next build` first then security-focused tests like bundle-grep).

- `vitest.config.rules.ts` — `tests/rules/**/*.test.ts`, `environment: 'node'`, 30s timeouts. Wrapped in `firebase emulators:exec --only firestore,auth` via `pnpm test:rules`. **This is where Epic C's Firestore Security Rules tests for `references`, `designs`, `generations` will live**, using `@firebase/rules-unit-testing` (already in devDeps as ^5.0.0).

### MSW

Grep for `msw|mock-service-worker` across all source/configs/package.json: **ZERO matches.** MSW is **not currently installed** despite outline references ("MSW-mocked Gemini success/failure coverage"). Epic C / Slice 4 will need to add MSW (`msw` ~2.x).

### Playwright

`playwright.config.ts`:

```ts
const E2E_PORT = 3100;
const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
testDir: './tests/e2e',
fullyParallel: false,
workers: 1,
use: { baseURL: E2E_BASE_URL, ...devices['Desktop Chrome'] },
webServer: {
  command: `firebase emulators:exec --only auth --project=nail-tech-assistant-e2e "pnpm dev:e2e -p ${E2E_PORT}"`,
  url: E2E_BASE_URL,
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
  env: { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', NEXT_PUBLIC_FIREBASE_*..., FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (fake key for emulator) ...
  },
},
```

**Caveats for Epic C:**

- Emulator wrap is `--only auth` — when Epic C adds Firestore/Storage emulator usage, this needs `--only auth,firestore,storage`.
- Workers=1, fullyParallel=false — keep test count modest.
- `tests/e2e/` dir exists but not enumerated here; per outline Part 4 expected E2E specs to add: `reference-assembly.spec.ts`, `generation-flow.spec.ts`.

### Existing test files (relevant)

```
tests/unit/api-health.test.ts
tests/unit/auth/{allowlist.test.ts, login-action.test.ts}
tests/unit/lib/{env.test.ts, types.test.ts}
tests/unit/lib/firebase/{client.test.ts, server.test.ts, session.test.ts}
tests/unit/pinterest/{actions-pins.test.ts, actions-boards.test.ts, client.test.ts,
                     errors.test.ts, list-board-pins.test.ts, list-boards.test.ts,
                     token-replacement-copy.test.ts}
tests/unit/{ci-workflow.test.ts, env-example.test.ts, smoke.test.ts}
tests/integration/pinterest/boards-page-token-invalid.test.tsx
tests/security/bundle-grep.test.ts
tests/__mocks__/server-only.ts                       — alias target
tests/setup/integration.ts                            — vitest setup
```

Existing Pinterest unit tests are good templates for `references` / `designs` / `generations` unit tests.

---

## 7. Cross-cutting state

### `lib/env.ts` — already validated keys

```ts
export interface Env {
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string; // .replace(/\\n/g, '\n') transform
  ALLOWED_EMAIL: string;
  APP_URL: string;
  PINTEREST_ACCESS_TOKEN: string;
  PINTEREST_MOCK?: 'ok' | 'invalid_token' | 'insufficient_scope' | 'network';
}
```

Uses `zod` (`requiredString = z.string().trim().min(1, 'Required')`) + `EnvValidationError` thrown on first access. Hydration helper `hydrateFromServiceAccountJson()` is duplicated in `lib/firebase/server.ts` because of per-route bundle issues (memory `feedback_env_hydration_import_order`). **Epic C must add at least one new env: `GEMINI_API_KEY` (or whatever the Slice-1 provider decision determines).** No existing AI / Gemini env var in schema.

### Memory rule already in force: `feedback_silent_catches_cost_time`

Every catch block touching a third-party API must log `console.error('[<scope>] <action> failed', { code, message, <context> })`. Already enforced in `lib/firebase/session.ts` and `app/(auth)/login/actions.ts` and `app/api/auth/session/route.ts`. Epic C's Pinterest-image-fetch, Storage-upload, and Gemini-invoke catches must follow the same shape. User-facing error message stays terse; diagnostic detail goes to server logs only.

### Auth session helper

`lib/firebase/session.ts`:

- `getSessionFromCookieString(sessionCookie): Promise<Session | null>` — Admin-SDK verification of session cookie. Used by middleware-style server actions and `(authenticated)/layout.tsx`.
- `getSession(req: NextRequest)` — same, takes `NextRequest`.

All Epic C server work should require a session and use `session.uid` as the owner key.

### `firestore.rules` baseline (full content)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /profiles/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Convention note (verbatim from rules file): "Firestore Security Rules are additive (OR). Default is deny; the explicit `if false` below is defensive — it ensures any accidental permissive rule in a later epic must OPT IN rather than inherit a silent allow."

### `next.config.ts` (full)

```ts
const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'i.pinimg.com' }] },
};
```

Epic C may need to add: Firebase Storage download host (`firebasestorage.googleapis.com`) for `<Image>` previews of cached references and generated images.

### `package.json` versions

- `next`: 15.1.11, `react`: 19.0.0, `firebase`: ^12.12.0, `firebase-admin`: ^13.8.0, `zod`: ^4.3.6, `server-only`: ^0.0.1
- Dev: `@firebase/rules-unit-testing`: ^5.0.0, `@playwright/test`: ^1.54.0, `@tailwindcss/postcss`: ^4.1.13, `@testing-library/react`: ^16.3.0, `@vitest/ui`: ^3.2.4, `vitest`: (run via `node node_modules/vitest/vitest.mjs`).
- Node engines: ">=20". Package manager: pnpm@10.22.0.

### Key memory anchors that constrain Epic C

- `feedback_env_hydration_import_order` — env hydrators must inline at point of consumption; per-route Vercel bundles break import-order assumptions. (Affects new `lib/firebase/storage.ts`.)
- `feedback_silent_catches_cost_time` — log error code+message in every third-party catch. (Affects all Storage, Gemini, and Pinterest-image-fetch error paths.)
- `feedback_secret_rotation_no_releak` — local script pattern for rotating credentials so values never pass through chat. (Relevant when provisioning `GEMINI_API_KEY`.)
- `reference_app_infra_gotchas` — port 3100, vitest alias, vercel CLI quirks, Firebase Authorized Domains, `.env.local→prod hazard`, app shell needs `h-screen+overflow-y-auto` for sidebar pinning.
- `feedback_codex_invocation` — direct `codex exec` for technical-writer / architect, not `codex-rescue` subagent.

### `hive.config.yaml` (relevant excerpts)

- `state_dir: state` (Hive state lives at ./state/, HIVE_STATE_DIR resolved here).
- TDD step-to-agent mapping is configured per story — Codex handles technical-writer + architect. Researcher is Claude.

---

## 8. Open risks / unanswered questions

1. **Provider decision (Slice 1) is a hard prerequisite — and is not yet executed.**
   `vertical-plan.md` and `prd.md` Epic C dependencies both say Slice 1 (Firebase AI Logic / Gemini 2.5 Flash Image quality spike) MUST pass before Epic C production work begins. As of this scan: no `app/spike/gemini/` directory exists. Per memory `project_nail_tech_assistant`, Mother's Day 2026 is the deadline (~10 days out from 2026-04-29). **Spike has not been run; provider key not provisioned.** Open: who runs the spike, when, on which provider, and what artefact records the go/no-go decision?

2. **Firebase AI Logic web SDK from server runtime — supported?**
   context7 only returned web-SDK samples for `firebase/ai`. Whether `getAI(app, { backend: new GoogleAIBackend() })` runs cleanly in Next.js Node runtime (as opposed to edge or browser) is unconfirmed. Alternative: `@google/generative-ai` Node SDK is server-canonical but is not "Firebase AI Logic". Resolve in Slice 1 spike.

3. **`GEMINI_API_KEY` provisioning.**
   No AI-related env var in `lib/env.ts` schema. Will need to be added — and rotated through `feedback_secret_rotation_no_releak` script pattern, not chat.

4. **Storage CORS + security rules.**
   `storage.rules` does not exist; `firebase.json` does not declare a storage emulator; no `getStorage()` import anywhere. Greenfield work. Open: bucket-region selection, CORS config for direct browser uploads (vs server-proxied), max-file-size enforcement target.

5. **Pinterest pin image hotlinking constraints.**
   `next.config.ts` allows `i.pinimg.com` for `<Image>` rendering. Cache-to-Storage flow (`ingestPinterestPin`) will server-fetch the image binary. Pinterest's TOS for hotlinking + caching of pin images for derivative-work generation is unverified — flagged as a soft risk; product owner already accepted Pinterest as primary source per kickoff.

6. **MSW not installed.**
   Outline assumes MSW for Gemini mocking. `msw` is not in `package.json`. Slice-4 work needs a `pnpm add -D msw` step + an MSW server harness, plus possibly a setup file change in `tests/setup/integration.ts`.

7. **Server-action vs REST-route split.**
   Outline Part 4 lists both `selectPinterestPin` server action AND `app/api/references/pinterest/select/route.ts`. Epic C planning must pick one canonical surface per flow to avoid lifecycle drift (Risk #11).

8. **`firestore.indexes.json` state.**
   Existence and contents of `firestore.indexes.json` not confirmed in this scan; only `firebase.json` referenced it. Compound queries Epic C may need (e.g. `designs` ordered by `created_at` per user) require explicit indexes — verify file is empty/missing before Epic C planning bakes index assumptions.

9. **`ReferenceRecord` and `GeminiRequestPayload` types are unspecified.**
   Slice 4 interfaces reference both, but no canonical type definition exists in outline or code. Epic C planning will need to fix the shape (especially: does `ReferenceRecord` carry `storagePath` or `signedUrl`? base64 inline or fetched at request-build time?).

10. **Sidebar nav update.**
    `app/(authenticated)/layout.tsx` `NAV_GROUPS` constant is hard-coded with placeholder Studio/Inventory groups (Dashboard, Gallery, Polishes — most marked `href: '#'`). Adding "New Design" and "Library" entries requires a layout edit; trivial but worth noting since multiple Epic C stories will want them.

---

## VALIDATION NOTE

- **Checked**: Pinterest API client surface (codebase), Firebase Admin/Web SDK init pattern (codebase), Firebase Storage SDK (greenfield — no codebase data), Gemini 2.5 Flash Image (`/websites/firebase_google_ai-logic` via context7), MSW (greenfield — not installed), Playwright + vitest configs (codebase), Firestore Security Rules baseline (codebase), env schema (codebase).
- **Source**: codebase + context7. No web escalation needed — context7 returned current Firebase AI Logic SDK samples with full multimodal pattern; Pinterest behaviour is fully validated by existing Epic-B code paths. Risk #2 (Gemini quality) is what the Slice 1 spike exists to validate, not something a researcher can pre-confirm.
- **Confidence**: High for Epic-B reuse / server-action pattern / Firebase admin pattern / test infra. Medium for Gemini SDK shape (web-SDK examples don't 1:1 confirm Node.js server runtime). High for confirming greenfield status of Storage + Firestore collections.
- **Findings**: All Epic-C persistence (`references`, `designs`, `generations`, `design_secondary_references`) is greenfield. Storage SDK is greenfield. Gemini integration is greenfield. Pinterest client + token-remediation copy + error normaliser are reusable as-is. Key infra constraints carry over from Epic A/B (env hydration inlining, server-only alias, 3rd-party-catch logging).
