# Epic B — Raw Research Findings

> RAW research dump for the Pinterest Integration epic. Consumed by `codex` (technical-writer) to produce the formatted research brief. Not itself the brief. Collected 2026-04-18.

---

## A. Codebase (Epic A surface Epic B will consume)

### A.1 Env validation — `lib/env.ts`
- Zod schema at `lib/env.ts:~40-65` declares `PINTEREST_ACCESS_TOKEN: requiredString`. **Already required** and will throw at startup if missing.
- `PINTEREST_APP_ID` is referenced in `.env.example` and `.env.local` but is **NOT** in the `Env` interface or schema — currently not validated, not exposed via `env.PINTEREST_APP_ID`. If Epic B needs it (e.g., for token-setup guidance links), it must be added.
- Typed `Env` interface exports: `PINTEREST_ACCESS_TOKEN: string` is the only Pinterest key.
- `env` is a module singleton: `export const env: Env = getEnv();` — any import of `@/lib/env` materializes all env values synchronously at startup.

### A.2 Firebase server wiring — `lib/firebase/`
- `lib/firebase/server.ts` begins with `import 'server-only';` (line 1, verified by `server_only_usage` grep and asserted by a unit test). This is the **pattern to copy** for `lib/pinterest/api.ts`.
- `lib/firebase/session.ts` exposes `getSession(req): Promise<Session | null>` and `getSessionFromCookieString()`, both calling `createServerFirebaseAdmin()`. These use firebase-admin and therefore run in the Node runtime, not edge.
- `lib/firebase/client.ts` handles the browser-side Firebase SDK with `NEXT_PUBLIC_*` vars — Epic B must not import this on any code path that touches the Pinterest token.
- Memoization pattern: `createServerFirebaseAdmin()` uses `globalThis[Symbol.for('firebase-admin-app')]` to dedupe across HMR. Good template if we need a memoized Pinterest client.

### A.3 Authenticated shell — `app/(authenticated)/`
- `app/(authenticated)/layout.tsx` exists with a Header + Footer scaffold wrapping `<main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">{children}</main>`.
- `app/(authenticated)/page.tsx` is the dashboard. It uses generous rounded cards, `bg-card`, `text-foreground`, `font-heading-display`, `--gradient-signature`, and `focus-visible:ring-2` tokens — reuse in Pinterest UI to stay on-brand.
- **Epic B nests under `app/(authenticated)/pinterest/`** → `page.tsx` (board grid) + `[boardId]/page.tsx` (pin grid). Slice 2 outline lists `page.tsx` but the board-detail file is not explicitly named; architect should confirm route shape.

### A.4 Middleware + session guard
- `middleware.ts` uses a single negative-lookahead regex matcher:
  ```
  '/((?!login$|login/|api/health$|_next/|favicon\\.ico$|robots\\.txt$).*)'
  ```
  → `/pinterest` and `/pinterest/[boardId]` are **already protected**. No matcher change needed for Epic B.
- `lib/auth/session-guard.ts` exports `hasSessionCookie(req)` — pure cookie presence check, edge-safe (no firebase-admin import). Middleware uses this; Pinterest API routes should use the richer `getSession()` helper from `lib/firebase/session.ts` for claim verification.
- `lib/auth/allowlist.ts` exports `assertAllowedEmail()` — returns `{ok: true}` or `{ok: false, reason: 'not_allowed' | 'invalid_format'}`. Use in any server action / route handler that needs a defense-in-depth check beyond the cookie.

### A.5 Styling — Tailwind v4 CSS-based config
- **No `tailwind.config.ts`** — project uses Tailwind v4 via `@import 'tailwindcss';` in `app/globals.css` with `@theme inline { ... }` token declarations.
- Available brand tokens (see `app/globals.css`):
  - Colors: `--color-primary` `#6b3f5e`, `--color-primary-tint`, `--color-accent` `#c9a96e`, `--color-neutral-fg`, `--color-neutral-muted`, `--color-surface`, `--color-surface-raised`, `--color-destructive`.
  - Also shadcn-style aliases: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--muted`, `--accent`, `--ring`.
  - Gradient: `--gradient-signature` (4-stop warm).
  - Breakpoints: `sm 40rem`, `md 48rem`, `lg 64rem`, `xl 80rem`, `tablet-landscape 73.75rem` (custom), container widths `tablet-landscape 1180px`, `tablet-portrait 820px`.
  - `--touch-target-min: 44px` — honor in interactive pin/board tiles.
  - Typography: `--font-heading-family` / `--font-body-family` (wired via layout fonts).
- No explicit grid/card utilities pre-defined beyond Tailwind defaults; Pinterest UI will use standard `grid grid-cols-*` and `gap-*`.

### A.6 Components directory — DOES NOT EXIST
- `components/` is **absent**. Epic B creates it. `components.json` (shadcn config) is present and points to:
  - `"components": "@/components"`, `"ui": "@/components/ui"`, `"utils": "@/lib/utils"`.
  - `baseColor: "neutral"`, `iconLibrary: "lucide"`.
- `@/lib/utils` also does not exist yet (confirmed via `lib_tree`). If Slice 2 uses `cn()` helper, it must be created as part of this epic or pulled in by the shadcn CLI when the first UI primitive is added.
- **No shadcn primitives are installed yet.** If the design needs `<Button>`, `<Card>`, `<Skeleton>`, etc., the epic either (a) brings them in via `shadcn add` or (b) rolls plain Tailwind components. Decision point.

### A.7 Tests — conventions
- `tests/unit/` uses Vitest. Conventions observed:
  - `import { describe, it, expect, vi, beforeEach } from 'vitest';`
  - Relative path imports (`../../../../lib/firebase/server`) not `@/` in test files — aliases may not be wired in vitest.
  - `vi.mock()` used for firebase-admin, server-only. Pattern is reusable for mocking `fetch` against Pinterest.
  - `vi.stubEnv()` + `vi.resetModules()` pattern for env-driven module tests (see `lib/env` tests). Apply the same approach to test `lib/pinterest/api.ts` token handling.
  - Source-level grep tests (`readFileSync` + regex) assert import hygiene — e.g., `tests/unit/api-health.test.ts` asserts the handler does not import firebase-admin or session helpers. Pattern: consider an equivalent test asserting `lib/pinterest/api.ts` begins with `import 'server-only'`.
- Test tree:
  - `tests/unit/api-health.test.ts`
  - `tests/unit/ci-workflow.test.ts`
  - `tests/unit/session-guard.test.ts`
  - `tests/unit/smoke.test.ts`
  - `tests/unit/auth/` (login-action, allowlist)
  - `tests/unit/lib/env/` (env.test, hydrate-json.test)
  - `tests/unit/lib/firebase/` (server.test, client.test)
  - Plus integration + unit folders under `tests/`.
- No `tests/unit/pinterest/` yet — Slice 2 adds it.

### A.8 Env files — current shape
- `.env.example` (committed) contains a `Pinterest` section with clear setup comments:
  ```
  # --- Pinterest (static-token approach, single-user) ---
  # Tokens can be regenerated in https://developers.pinterest.com/apps/
  PINTEREST_APP_ID=
  PINTEREST_ACCESS_TOKEN=
  ```
- `.env.local` has both `PINTEREST_APP_ID` and `PINTEREST_ACCESS_TOKEN` populated (real token masked to `=***` when dumped).
- `PINTEREST_APP_ID=1562835` per sign-off #17 (project owner's app).

### A.9 Package + next config
- `package.json`: Next.js ^15, React 19, firebase 12.x, firebase-admin 13.x, Tailwind v4, Vitest, Playwright, ESLint 9, zod. No Pinterest SDK — raw `fetch` will be used.
- `next.config.ts` currently minimal (`const nextConfig: NextConfig = {}; export default nextConfig;`). **No `images.remotePatterns` set** — Epic B must add one for `i.pinimg.com` (see Section C.2).
- Scripts include `lint`, `format`, `test`, `test:unit`, `test:e2e`, `typecheck`. CI hooked.

### A.10 Sign-off #17 confirmation (`state/planning/sign-off.md:52-58`)
- Decision is authoritative: **static token, no OAuth callback, no refresh, no client_secret usage**.
- Token belongs to the project owner's Pinterest account (app ID `1562835`).
- Follow-up path: add wife as trial user on the app later; same env var swap, no code change.

### A.11 Epic B outline — Slice 2 file plan (`structured-outline.md`)
Files Slice 2 names (authoritative for story decomposition):
1. `app/(authenticated)/pinterest/page.tsx`
2. `app/api/pinterest/boards/route.ts`
3. `app/api/pinterest/boards/[id]/pins/route.ts`
4. `lib/pinterest/api.ts`
5. `components/PinBrowser.tsx`
6. `components/PinterestBoardGrid.tsx`
7. `components/PinterestConnectButton.tsx` (ready-state guidance only — no OAuth)
8. `tests/unit/pinterest/api.test.ts`
9. `tests/e2e/pinterest-browse.spec.ts`
10. `tests/integration/pinterest-token-env.test.ts`

**Gap flagged:** outline does not name the board-detail page (`app/(authenticated)/pinterest/[boardId]/page.tsx`). US-B-2 requires it ("I select a board from the board grid… I see the pin grid for that board"). Architect should add.

---

## B. Pinterest API v5

### B.1 Auth + scopes
- **Header:** `Authorization: Bearer {token}` — confirmed via Pinterest docs example `curl https://api.pinterest.com/v5/user_account --header 'Authorization: Bearer {your_token}'`.
- **Base URL:** `https://api.pinterest.com/v5` (production). Sandbox at `https://api-sandbox.pinterest.com/v5` (not needed; we're production-only).
- **Token format:** Pinterest issues access tokens with the `pina_` prefix (short-lived, 2592000s = 30 days for OAuth-issued tokens; **static tokens created on the developer dashboard under the project owner's app also carry the `pina_` prefix and have their own TTL**). Context7 confirms the 30-day expiry on standard access tokens — this is a real operational risk for a "static" token integration. **Flagged in section D.**
- **Scopes** needed (per Pinterest Create-Pin reference, which lists the full set; browse-only needs the read subset):
  - `boards:read` — list boards and board metadata
  - `pins:read` — list pins on a board
  - `user_accounts:read` — `/v5/user_account` sanity check
- Context7 snippet from the Create-Pin reference shows both `Pinterest OAuth 2.0` and `Client Credentials` auth schemes. For static-token mode we ignore the OAuth flow; tokens are minted via the developer dashboard and pasted into `PINTEREST_ACCESS_TOKEN`.

### B.2 Endpoints used in scope

#### B.2.1 `GET /v5/user_account`
- Purpose in our scope: token sanity check (liveness probe). Context7 confirms this is the canonical "does my token work?" endpoint.
- Success returns user account JSON (username, account_type, profile_image fields — exact shape not returned in snippet, but Pinterest docs describe `username`, `account_type`, `profile_image`, `website_url`, `about`, `business_name`, `board_count`, `pin_count`, `follower_count`, `following_count`, `monthly_views`).
- **Error 401 with `code: 2`** = invalid/expired token (authoritative, directly from context7).

#### B.2.2 `GET /v5/boards`
- Lists boards. Context7 returned only the bare endpoint entry (`GET /boards`) — the detailed query parameter table was not in the indexed snippets for this specific endpoint. **HOWEVER**, the pagination conventions below apply universally (confirmed on the pagination reference page), and other list endpoints in the same family (`GET /pins`, `GET /boards/{board_id}/pins`) share the `bookmark` + `page_size` model. Safe to assume:
  - Query: `page_size` (default 25, max 250), `bookmark` (cursor), plus `privacy` (PUBLIC / PROTECTED / SECRET / ALL) filter per Pinterest v5 spec.
- Response: `{ items: Board[], bookmark: string|null }` with each `Board` having (per v5 spec, pattern confirmed via adjacent endpoints): `id`, `name`, `description`, `privacy`, `pin_count`, `follower_count`, `created_at`, `board_pins_modified_at`, `media` (image preview), `owner.username`.
- **Open item for web-research:** the exact field list for `Board` (especially the cover-image URL field names and sizes). Context7 snippets did not surface a full Board schema. Flagged in Section F.

#### B.2.3 `GET /v5/boards/{board_id}/pins`
- **Directly confirmed via context7 (authoritative snippet):**
  ```
  GET https://api.pinterest.com/v5/boards/{board_id}/pins
  Path: board_id (required)
  Query: page_size (default 25, max 250), bookmark (string, cursor)
  Response: { items: Pin[], bookmark: string|null }
  Empty-state: { "items": [], "bookmark": null }
  ```
- **Pin response shape (authoritative — directly from Pinterest Create-Pin reference response sample):**
  - `id`, `title`, `description`, `alt_text`, `link`, `board_id`, `board_section_id`, `board_owner.username`, `created_at`, `creative_type` ("REGULAR" | ...), `dominant_color` (hex), `has_been_promoted`, `is_owner`, `is_product`, `is_standard`, `parent_pin_id`.
  - `media.media_type`: `"image"` or `"video"`.
  - `media.images` object keyed by size label:
    - `"150x150"`, `"400x300"`, `"600x"`, `"1200x"` → each `{ width, height, url }`.
  - `pin_metrics.{90d,lifetime_metrics}` (only populated when explicitly requested via `pin_metrics=true`).

### B.3 Pagination model
- **Cursor-based** via `bookmark`. Same contract across all list endpoints:
  1. First request has no `bookmark`.
  2. Response returns `bookmark: "opaque-string" | null`.
  3. Pass that `bookmark` on the next request; repeat until `bookmark === null`.
- `page_size` default 25, max 250.
- **UX implication** (for section D): standard cursor pattern, pairs well with "Load more" button or IntersectionObserver infinite scroll. No random-access paging possible.

### B.4 Error shapes
- **401** — Authentication failed/missing. Specific API `code: 2` on expired/invalid token (authoritative). Body shape is standard Pinterest error envelope (context7 snippet shows `code` and status-level description).
- **403** — Valid auth but insufficient scope or forbidden action (e.g., reading a board the token owner doesn't have access to).
- **404** — Resource not found (invalid board ID).
- **429** — Rate limited. `Retry-After` header should be respected (common REST convention — context7 did not surface the exact header name for Pinterest; see D).
- **400** — Malformed request.
- **default / 500** — "unexpected error response" per Pinterest's spec language.

Pinterest returns JSON bodies with `code` + `message` fields. Exact error-code enum is not exhaustively listed in the indexed context7 content beyond `code: 2` for invalid token — additional codes need web verification if we want precise mapping (flagged in F).

### B.5 Rate limits
- Pinterest uses **rate-limit categories** per endpoint (`org_read`, `org_write`, `ads_read`, `ads_write`, `trusted_read`, etc.). Browse endpoints fall under `org_read`.
- **Exact per-minute/per-hour limits are not returned in context7 snippets** — Pinterest publishes them on the rate-limits page but the indexed content only surfaces the header-format sample:
  ```
  x-ratelimit-limit: 100, 100;w=1, 1000;w=60
  x-ratelimit-remaining: 99
  x-ratelimit-reset: 1
  ```
  Reading: 100 req/sec burst, 1000 req/60s sustained for this request's category (this is a public example; real category-specific limits need a web check).
- Our single-user app is nowhere near these limits; 429 handling is defensive, not primary.
- **Backoff:** honor `x-ratelimit-reset` or standard `Retry-After`. Context7 did not show a Pinterest-specific `Retry-After` example — flagged as F item.

### B.6 Image CDN
- **Hostname:** `i.pinimg.com` (directly confirmed by the response sample URLs: `https://i.pinimg.com/150x150/...`, `.../600x/...`, `.../1200x/...`).
- **URL pattern:** `https://i.pinimg.com/{size}/{hex}/{hex}/{hex}/{file}.jpg`.
- Sizes present in pin responses: `150x150`, `400x300`, `600x`, `1200x`. For a responsive grid the natural pairings are `400x300` (grid thumbnail), `600x` (tablet), `1200x` (desktop full-width).
- **Board cover images** use the same CDN — schema field not explicitly surfaced by context7 but the pattern is consistent.
- **`next/image` remotePatterns entry** (see C.2).

### B.7 Revocation signals
- **Authoritative:** expired or invalid token → `HTTP 401` with API error `code: 2`. Same surface for both cases — the integration cannot distinguish "expired" from "revoked" from "malformed" beyond the code.
- For our "token-replacement guidance" error UX (per US-B-1 AC), all three cases collapse into the same user-facing message: *"Pinterest connection needs a new token."* This is acceptable.
- **No refresh path exists in our implementation** (sign-off #17 explicitly rejects OAuth refresh code).

---

## C. Next.js 15 integration

### C.1 Server-side fetch pattern
- All Pinterest calls must originate from server components / route handlers / server actions. `lib/pinterest/api.ts` should begin with `import 'server-only';` (mirroring `lib/firebase/server.ts`).
- **Recommended pattern** (confirmed in Next.js 15 docs via context7):
  ```ts
  // lib/pinterest/api.ts
  import 'server-only';
  import { env } from '@/lib/env';

  const BASE = 'https://api.pinterest.com/v5';

  async function pinterestFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${env.PINTEREST_ACCESS_TOKEN}`,
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store', // or next: { revalidate: 60 } — see below
    });
    if (!res.ok) throw new PinterestApiError(res.status, await safeJson(res));
    return res.json() as Promise<T>;
  }
  ```
- **Caching decision (architect debate):** Next.js 15 gives three options:
  - `cache: 'force-cache'` (default) — bad here, we'd serve stale board data indefinitely.
  - `cache: 'no-store'` — every request hits Pinterest. Simple, correct for a single-user app with negligible traffic. Recommended default.
  - `next: { revalidate: 60 }` — serve cached for 60s. Good if we want snappier perceived load; adds a subtle staleness bug for boards just renamed on Pinterest. Probably skip for Slice 2.
- **Why not an API route wrapper for the board list?** Slice 2 outline includes `app/api/pinterest/boards/route.ts` anyway, which works as a passthrough. Rationale (plan-level): it keeps the route handler surface available for the later design-creation flow to reuse without tying the page to a server-component-only contract. Architect should confirm this isn't redundant with the server-component approach — could go either way.

### C.2 `next/image` remotePatterns
- `next.config.ts` currently has no `images` block. Add:
  ```ts
  const nextConfig: NextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'i.pinimg.com',
          pathname: '/**',
        },
      ],
    },
  };
  ```
- Alternatively, **skip `next/image` entirely** and use plain `<img>` with Pinterest's pre-sized URLs — sidesteps the optimizer entirely, saves Vercel image-optimization usage, and Pinterest already serves correctly-sized variants (`400x300`, `600x`, `1200x`). Architect debate point: `next/image` gives blur placeholders + lazy loading for free, but adds optimizer round-trip cost on Vercel. Recommendation: **use `next/image` with `unoptimized={true}`** or the `remotePatterns` entry — preserves `loading="lazy"` and layout stability.

### C.3 App Router page shapes
- `app/(authenticated)/pinterest/page.tsx` — server component, `async` default export, fetches boards via `lib/pinterest/api.ts`.
- `app/(authenticated)/pinterest/[boardId]/page.tsx` — server component, `async`, takes `{ params: { boardId: string } }`, calls `notFound()` (from `next/navigation`) on 404.
- **Streaming / Suspense:** Next.js 15 docs recommend `<Suspense>` + loading UI for parallel data fetches. Pins + board metadata are the two calls on the detail page — wrap in Suspense to stream the pin grid independently. Optional polish; not required for Slice 2 cut line.
- `loading.tsx` per segment for skeleton — cheap, good UX for single-user / variable-latency upstream.

### C.4 Error / not-found boundaries
- **`app/(authenticated)/pinterest/error.tsx`** — Client Component (`'use client'` directive required per Next.js docs, confirmed via context7). Signature:
  ```tsx
  'use client';
  export default function Error({
    error,
    reset,
  }: { error: Error & { digest?: string }; reset: () => void }) {
    // Check error.message / tag for "pinterest_auth_invalid" to branch UX
    return (...);
  }
  ```
- **`app/(authenticated)/pinterest/[boardId]/not-found.tsx`** — triggered by `notFound()` in the page. Server component.
- **Token-invalid UX branching:** thrown `PinterestApiError` should carry a discriminated status (401 / 403 / 429 / 5xx) so `error.tsx` can render the correct message (token replacement vs "try again"). The error shape is observable inside `error.tsx` via `error.digest` plus a custom property — but error-boundary children **do not receive the original Error instance over the network** in production (serialized). Better pattern: route the 401 case through a redirect to `/pinterest/token-missing` or render a dedicated component inside the page when the fetch returns 401 (no throw), reserving `throw` for unexpected failures.

### C.5 `server-only` package
- Already in lockfile (implicit via firebase server import). `lib/pinterest/api.ts` should import it on line 1. Tests should mock it (`vi.mock('server-only', () => ({}))`) to stay runnable in node test env — same pattern as `tests/unit/lib/firebase/server.test.ts`.

---

## D. Constraints + open risks (for architect/PM debate)

1. **Token expiry vs. "static" framing.** Pinterest access tokens are 30-day-expiring even when issued by the developer dashboard. Sign-off #17 frames this as "static" but it is really "long-lived + manual rotation." Surface this in the brief so the PM sees a future small-but-real operational chore. Mitigations: (a) optional manual cron / calendar reminder; (b) a server-side self-check endpoint that pings `/v5/user_account` daily and logs to console / notifies via email if 401; (c) accept the chore.

2. **Token leak risk.** `PINTEREST_ACCESS_TOKEN` is server-only. Guardrails:
   - `lib/pinterest/api.ts` MUST open with `import 'server-only';` (build-time enforcement).
   - No `NEXT_PUBLIC_` prefix — env validation already enforces.
   - Recommend an integration test that greps the built `.next/static/**` for the token prefix `pina_` to guarantee it's not accidentally shipped to the client bundle.

3. **Pagination UX.** Bookmark is cursor-only. Options: "Load more" button (simplest, most honest), IntersectionObserver infinite scroll (nicer), or virtualized masonry (overkill for Slice 2). Recommend **"Load more"** for MVP; revisit in polish epic.

4. **Image layout — masonry vs. uniform grid.** Pinterest's value prop is variable-aspect pins. Uniform-aspect grid (aspect-ratio crop) is simpler and on-brand with our minimalist aesthetic; masonry is culturally right but requires JS layout (e.g., `react-masonry-css` or CSS `columns`). Recommend **CSS `columns` masonry** (zero JS, good enough) for Slice 2; if it looks off, escalate in polish.

5. **Rate-limit burn.** Negligible for single user; defensive 429 handling with a "Pinterest is busy — try again" message is sufficient. Do not build retry/backoff in Slice 2.

6. **Empty states.** Zero boards, zero pins on a board, zero-results from a filter. All three must have explicit copy. Slice 2 outline does not call these out — flag for PRD.

7. **Vercel cold-start.** Every page render hits `api.pinterest.com`. Cold start + API latency could be 800ms–1.5s. Acceptable for single-user gift app; no SWR / client hydration needed. If it feels slow, consider `next: { revalidate: 30 }` for the board list (board structure changes rarely).

8. **API route vs server-component fetch redundancy.** Slice 2 outline ships both `app/api/pinterest/boards/route.ts` **and** implies server-component fetch for `app/(authenticated)/pinterest/page.tsx`. Two paths to the same data. Options: (a) keep both (route exists for future client-side interactive features); (b) drop the route and have the page fetch `lib/pinterest/api.ts` directly. Architect should rule. Recommendation: **drop the API route for Slice 2, re-add when a client-side feature actually needs it** — avoids premature complexity and two error-handling surfaces.

9. **Missing `PINTEREST_APP_ID` in `lib/env.ts`.** `.env.example` documents it but the schema doesn't require or expose it. If Epic B's UI needs a link back to the Pinterest developer dashboard for token rotation, add it to the schema as `PINTEREST_APP_ID: requiredString` (currently `1562835`).

10. **Board-detail page file is unnamed in Slice 2 outline.** Story decomposition must explicitly include `app/(authenticated)/pinterest/[boardId]/page.tsx` even though it isn't in the 10-file manifest.

11. **No `lib/utils.ts` / `cn()` helper exists.** If UI components adopt shadcn patterns (`className={cn(...)}`), Epic B needs to create it — trivial, but unaccounted in the Slice 2 file plan.

12. **No shadcn primitives installed.** Decision: go bare Tailwind or `pnpm dlx shadcn add card button skeleton` as part of the epic? The dashboard page today is bare Tailwind, so stylistic precedent is "just use Tailwind." Recommend: match the dashboard — stay bare Tailwind for Slice 2, revisit when a form-heavy surface lands.

---

## E. Context7 sources (with versions)

| Library / site | Context7 ID | Queried |
|---|---|---|
| Pinterest Developer Platform | `/websites/developers_pinterest` | auth header, endpoint specs, pagination, rate-limit headers, error codes |
| Next.js 15.1.8 | `/vercel/next.js/v15.1.8` | server component fetch, `remotePatterns`, `error.tsx`, `not-found.tsx`, `server-only`, streaming |

Confidence:
- **A. Codebase:** High — direct file reads.
- **B.1 Auth, B.3 Pagination, B.6 Image CDN, B.7 Revocation:** High — directly confirmed via context7 snippets.
- **B.2.1 user_account, B.2.3 boards/{id}/pins:** High — confirmed.
- **B.2.2 boards list schema:** Medium — endpoint confirmed; detailed field list inferred from adjacent endpoints, not directly surfaced.
- **B.4 Error bodies (beyond `code: 2`):** Medium — structure confirmed, full error-code enum not surfaced.
- **B.5 Rate limits (per-category numbers):** Low — only header format returned; exact limits per category need a web fetch of Pinterest's rate-limits page for completeness. Not a blocker (single-user app).
- **C.** High — Next.js 15 docs are comprehensive in context7.

---

## F. Open questions (web-research escalation candidates)

Only items where context7 didn't have what we needed. None of these are blockers for Slice 2 to start; they sharpen the brief.

1. **Exact `GET /v5/boards` response Board field list.** Especially: cover-image field name (`media` vs `board_pins_modified_at` preview vs separate `image_cover_url`), sizes available, whether `owner.username` or `owner_user_id` is present. Context7 surfaced only the endpoint line.

2. **Exact `GET /v5/user_account` response shape.** Probably: `account_type`, `profile_image`, `website_url`, `username`, `about`, `business_name`, `board_count`, `pin_count`. Not confirmed by a context7 snippet.

3. **Pinterest static-token expiry.** Context7 showed the 2592000s (30 day) figure for OAuth-issued tokens. Developer-dashboard-generated static tokens **may** differ (docs imply they're the same contract but longer-lived isn't offered). Worth verifying the actual behavior against Pinterest's developer portal FAQ so the brief accurately describes the rotation cadence.

4. **Complete Pinterest error-code enum.** `code: 2` is confirmed; other common codes (scope missing, board not found, rate limited) aren't surfaced. Not a blocker — our branch logic only needs HTTP-status-level routing.

5. **`Retry-After` vs `x-ratelimit-reset` behavior on 429.** The rate-limit doc returned the three `x-ratelimit-*` headers. Pinterest may or may not also send `Retry-After` — worth checking if we want backoff to honor the spec precisely.

6. **Sandbox / trial-user flow.** For the "add wife as trial user" follow-up path (per sign-off #17), the exact trial-user setup steps on the Pinterest developer dashboard aren't relevant to Slice 2 but belong in the README / epic handoff notes.

Recommendation: escalate #1 and #3 to `firecrawl` or `WebSearch` before the brief is finalized. The rest can be noted as "verify during implementation" without blocking planning.
