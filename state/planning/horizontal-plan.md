# Horizontal Plan

## 1. Layer Inventory

1. Infrastructure: Hosts the Next.js app, provisions Supabase, stores secrets, and provides CI plus callback-ready deploy surfaces.
2. Deployment surfaces: Vercel preview/production deploys and a local dev tunnel support Pinterest OAuth callback testing.
3. Environment configuration: Holds Pinterest OAuth, Gemini, Supabase, app URL, and allowed-email values.
4. Persistence: Stores identity, references, designs, generations, and later chat turns under RLS.
5. `profiles` table: Extends `auth.users` with email and encrypted Pinterest token state.
6. `references` table: Normalizes Pinterest and uploaded images into one reference record shape.
7. `designs` table: Stores the durable design record, shape choice, prompt, and current generation linkage.
8. `generations` table: Stores each generation attempt, request payload, result path, metadata, and failure state.
9. `design_secondary_references` + `chat_turns`: Preserve ordered secondary references and later chat history.
10. Storage buckets + migrations: Persist references and outputs while evolving schema via versioned SQL.
11. Auth: Admits only the allowed email, sets SSR cookies, and protects non-public routes.
12. External integrations: Connect Pinterest for inspiration sourcing and Gemini for generation.
13. Pinterest OAuth + API: Handles authorize URL generation, callback exchange, refresh, boards, pins, and image fetch/cache.
14. Gemini generation boundary: Builds multimodal requests, retries once on transient failure, and leaves room for a future fallback provider.
15. Core domain: Turns raw integrations and persistence into ingestion, reference selection, generation orchestration, and design lifecycle behavior.
16. Reference ingestion + set builder: Ingest Pinterest pins or uploads, enforce one primary reference, preserve ordered secondary cues, and honor prompt override behavior.
17. Design lifecycle services: Create, save, reload, and regenerate designs while preserving original inputs.
18. API / Server Actions: Expose route handlers and mutations used by the UI.
19. UI Primitives + Feature UI: Deliver the shell, touch-friendly states, reference-selection flow, visualizer, library, and optional chat.
20. Testing infrastructure: Verifies unit logic, mocked integrations, RLS-safe integrations, critical E2E flows, and visualizer regressions.

## 2. Per-Layer Requirements

### Infrastructure

INFRASTRUCTURE SURFACES
- Runtime: Next.js 15 App Router on Vercel.
- Backend services: Supabase Postgres, Auth, Storage.
- Source control: GitHub repository with CI checks.
- Local callback support: ngrok or equivalent tunnel.
- Preview callback support: Vercel preview deploys usable for Pinterest callback testing.

ENVIRONMENT VARIABLES
- Required keys: `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `ALLOWED_EMAIL`.

DEPLOYMENT REQUIREMENTS
- Vercel project must build a Next.js 15 App Router application.
- Preview deploys must exist early because Pinterest callback testing may happen against deployed URLs.
- Production deploy must expose the same login, Pinterest callback, and generation surfaces used in local development.

CI / CHECKS
- PR checks required by memo: `typecheck`, `lint`, `unit tests`.
- Check set exists from Slice 0 onward because it is part of foundation infrastructure.

LOCAL DEVELOPMENT
- Tunnel-based callback strategy is required by locked kickoff decisions.
- Local development must support Pinterest OAuth callback validation through the tunnel URL.

### Persistence

PERSISTENCE SURFACES
- Postgres tables: `profiles`, `references`, `designs`, `generations`, `design_secondary_references`, `chat_turns`.
- Storage buckets: `references`, `generations`.
- Migration path: Supabase CLI with versioned SQL files.

TABLE: `profiles`
- Purpose: Extend `auth.users` with app-specific profile and Pinterest auth state.
- Columns required by memo: `id` PK = `auth.users.id`, `email`, `pinterest_token_encrypted`, `pinterest_token_expires_at`, `created_at`.
- Change note: token refresh support implies update access to token and expiry fields.

TABLE: `references`
- Purpose: Normalize both Pinterest-derived and uploaded reference images.
- Columns required by memo: `id`, `user_id` FK, `source` (`pinterest` or `upload`), `source_url`, `storage_path`, `pinterest_pin_id` nullable, `created_at`.

TABLE: `designs`
- Purpose: Durable saved design entity for create/save/reload/regenerate flows.
- Columns required by memo: `id`, `user_id` FK, `name` nullable, `primary_reference_id` FK, `prompt_text` nullable, `nail_shape` (`almond`, `coffin`, `square`, `stiletto`), `latest_generation_id` FK, `created_at`, `updated_at`.
- Functional requirement from locked decisions: the record must preserve enough inputs to support regenerate-from-saved-design in v1.

TABLE: `generations`
- Purpose: Store every generation attempt, not just the latest result.
- Columns required by memo: `id`, `design_id` FK, `request_json`, `result_storage_path`, `gemini_response_metadata`, `status` (`pending`, `success`, `failure`), `error_message` nullable, `created_at`.

TABLE: `design_secondary_references`
- Purpose: Ordered join table for non-primary references.
- Columns required by memo: `design_id` FK, `reference_id` FK, `order_index`.

TABLE: `chat_turns`
- Purpose: P1 conversation history attached to a design and a generation lineage.
- Columns required by memo: `id`, `design_id` FK, `user_message`, `generation_id` FK, `order_index`, `created_at`.

RLS POLICIES
- Every row with `user_id` must match `auth.uid()`.
- Profile access must be scoped to the current authenticated user.
- Saved designs, references, generations, and later chat turns must not cross user boundaries even though v1 is single-user.
- Storage access must follow the same per-user ownership rule because references and generations live in Supabase Storage.

STORAGE BUCKETS
- `references`: stores uploads and cached Pinterest images.
- `generations`: stores Gemini output images.
- Persistence layer must support fetch by saved path because UI layers depend on image URLs.

MIGRATIONS
- Supabase CLI with versioned SQL files is the specified migration strategy.
- Schema evolution must preserve the v1-to-v2 optionality called out in discovery and product docs.

### Auth

AUTH SURFACES
- Supabase Auth with email magic links.
- Single-user allowlist using `ALLOWED_EMAIL`.
- Supabase SSR session helpers with cookie handling.
- Middleware protection for non-public routes.

LOGIN FLOW REQUIREMENTS
- `/login` page must accept email input.
- Submit action must reject any email not equal to the allowed email.
- Allowed email path must trigger Supabase magic-link send behavior.
- UI must support a “magic link sent” state.

SESSION REQUIREMENTS
- Session cookies are handled by Supabase SSR helpers.
- Authenticated home page must be reachable after login in Slice 0.
- Middleware must guard all routes except `/login`, `/api/health`, and the Pinterest OAuth callback route.

CALLBACK EXCEPTION REQUIREMENTS
- Pinterest callback route is exempt from normal middleware auth enforcement.
- Callback route still must validate its own `state` parameter per memo.

SCHEMA / AUTH LINKAGE
- `profiles.id` must align to `auth.users.id`.
- `profiles.email` exists so app-level allowlist and durable user metadata stay queryable.

### External Integrations

#### Pinterest API v5

PINTEREST FLOWS
- OAuth 2.0 authorize URL generation.
- OAuth callback token exchange.
- Refresh token handling.
- `GET /v5/user_account/boards`
- `GET /v5/boards/{board_id}/pins`
- Image fetch from selected pin URLs and cache into Supabase Storage.

TOKEN HANDLING
- Access token state belongs on `profiles`.
- Expiry tracking belongs on `profiles`.
- Refresh logic must exist because the memo includes refresh token handling explicitly.

BOARD / PIN DATA REQUIREMENTS
- Integration boundary must return enough board data to render a board browser.
- Integration boundary must return enough pin data to render a pin grid and support later selection.
- Pin image URLs must remain available to ingestion logic for caching.

IMAGE CACHE REQUIREMENTS
- Pinterest-sourced reference images are not only browsed; selected pins must be copied into the app’s `references` bucket for durable use in generation.

#### Gemini 2.5 Flash Image

GENERATION INPUTS
- Primary image input.
- Secondary style-cue image inputs.
- Optional text prompt.
- Nail shape selection as part of the design input set.

REQUEST BEHAVIOR
- Multimodal prompt assembly is required.
- Retry once on transient errors.
- Persist request payload and response metadata into `generations`.

FAILURE SURFACE
- Content-policy refusal.
- Rate limit.
- Network failure.
- Locked kickoff decision refines this to: one silent auto-retry, then surface an error with “adjust inputs” guidance.

BOUNDARY REQUIREMENT
- Generation service should preserve a provider boundary because the fallback provider slot must remain possible even though it is not built in v1.

### Core Domain

REFERENCE INGESTION
- `ingestPinterestPin(pinId)`
- Fetch pin metadata/image through Pinterest integration.
- Copy image into Supabase Storage `references`.
- Create a `references` record with `source = 'pinterest'`.

UPLOAD INGESTION
- `ingestUpload(file)`
- Store uploaded file in Supabase Storage `references`.
- Create a `references` record with `source = 'upload'`.

REFERENCE SET BUILDER
- Exactly one primary reference.
- Zero or more secondary references.
- Preserve secondary ordering.
- Optional text prompt is part of the set.
- Locked decision: text prompt can override conflicting visual cues.
- Locked decision: secondary references are loose style cues, not co-equal primaries.

GENERATION ORCHESTRATION
- `generateDesign(referenceSetId, promptText, nailShape)`
- Create a `generations` record before the provider call.
- Assemble provider request from normalized references plus prompt.
- Retry once on transient failure.
- Persist output image to `generations` storage bucket.
- Update generation status and error message as needed.

DESIGN LIFECYCLE
- Create design.
- Save design.
- Reload saved design.
- Regenerate from same saved inputs.
- Maintain `latest_generation_id` linkage on `designs`.
- Preserve enough design metadata for library viewing and reopen behavior.

P1 CHAT REFINEMENT
- Append chat turns to `chat_turns`.
- Accumulate prior refinement instructions onto subsequent generation input.
- Tie each turn to the resulting generation.

### API / Server Actions

ROUTES / ACTIONS
- `/login` page submit action for allowlisted email login.
- `/api/auth/pinterest/start`
- `/api/auth/pinterest/callback`
- `selectPinterestPin(pinId)`
- `uploadReference(file)`
- `createDesign(input)`
- `regenerateDesign(designId)`
- `saveDesign(designId, name?)`
- `/api/pinterest/boards`
- `/api/pinterest/boards/[id]/pins`
- P1: `sendChatTurn(designId, message)`

AUTH REQUIREMENTS
- All authenticated actions must execute in a user-scoped context compatible with RLS.
- Public exceptions stay limited to `/login`, `/api/health`, and Pinterest callback behavior.

DATA CONTRACT REQUIREMENTS
- Board/pin route handlers are passthrough-style integration surfaces for UI browsing.
- Mutations must delegate to core domain services rather than duplicating orchestration logic in handlers.
- Upload action must support multipart form submission.

DESIGN CONTRACT REQUIREMENTS
- `createDesign(input)` must create the durable design entity from chosen references, prompt, and selected shape.
- `regenerateDesign(designId)` must re-run generation from stored design inputs.
- `saveDesign(designId, name?)` must support library naming and persistence flow.

### UI Primitives

SHARED UI FOUNDATION
- shadcn/ui installed.
- Tailwind config with tablet-first breakpoints and landscape-first layout bias from locked decisions.
- Custom tokens for large-touch sizing, soft-shadow surfaces, and polished transitions.
- Shared shell with app header and main canvas area.

COMMON COMPONENT REQUIREMENTS
- Auth indicator.
- Navigation within shell.
- Loading skeletons for board list, pin grid, and generation pending state.
- Toast / error surface component.

RESPONSIVE REQUIREMENTS
- Tablet-first.
- Phone-compatible.
- Landscape-first orientation optimization because hand layout is wider than tall.

### Feature UI

LOGIN / HOME
- Login page with email input and sent-state feedback.
- Home/dashboard with primary CTA `New design` and secondary entry to `My designs`.

PINTEREST FLOW
- Connect state with connect button when Pinterest is not linked.
- Board browser grid.
- Pin browser grid for selected board.
- Multi-select behavior with visible primary/secondary state.

REFERENCE BUILDING
- Upload tile with drop zone and fallback picker.
- Reference set panel with primary thumbnail, secondary thumbnails, and prompt input.
- Prompt helper must communicate that text can override visual cues.

GENERATION FLOW
- Generate button.
- Progress / pending state.
- Error state with retry-adjust messaging.
- Raw generated image preview before visualizer lands.

VISUALIZER FLOW
- Five-nail hand layout.
- Shape selector for almond, coffin, square, stiletto.
- Saved design viewer shows visualizer plus regenerate button.
- Design library grid shows saved designs, thumbnails, and inline naming.

P1 CHAT FLOW
- Chat refinement panel.
- Turn history.
- Input box.
- Iteration progress.

### Testing Infrastructure

UNIT TESTS
- Vitest for pure transforms.
- Gemini request builder tests.
- Reference ingestion logic tests.
- Turn accumulation tests for P1.

MOCKED INTEGRATION TESTS
- MSW for Pinterest endpoints.
- MSW for Gemini API behavior including success and failure.

SUPABASE INTEGRATION TESTS
- Authenticated vs unauthenticated behavior under RLS.
- Storage interactions for references and generations.
- Save/reload/regenerate flows tied to persisted records.

E2E TESTS
- Playwright auth flow.
- Pinterest OAuth mock flow.
- Generation happy path.
- Save/reload flow.
- Shape switching.
- P1 chat happy path.

VISUAL REGRESSION
- Playwright screenshots for visualizer shape variants.

FIXTURES
- Sample reference images.
- Sample Gemini success response.
- Sample Gemini failure response.

## 3. Cross-Layer Dependencies

1. Infrastructure env configuration supplies Pinterest, Gemini, Supabase, app URL, and allowlist values used by Auth and External integrations.
2. Vercel preview/prod deploys plus the local tunnel are prerequisites for Pinterest OAuth callback testing.
3. Supabase availability is a prerequisite for Auth, Persistence, Storage-backed ingestion, and design saving.
4. `profiles` persistence is coupled to Supabase Auth because the profile key equals `auth.users.id`.
5. Auth depends on Persistence for profile storage and RLS to keep app data user-scoped.
6. Pinterest OAuth depends on callback configuration, authenticated identity, and token storage on `profiles`.
7. Pinterest browsing and selected-pin ingestion depend on refresh-capable token handling plus `references` bucket writes.
8. Upload ingestion depends on authenticated storage writes and the same `references` schema used by Pinterest ingestion.
9. Reference set building depends on normalized `references` rows and feeds `createDesign` plus generation orchestration.
10. Design creation and regenerate depend on durable storage of primary reference, ordered secondary references, prompt, and shape.
11. Gemini generation depends on env credentials, normalized reference inputs, `generations` persistence, and output storage.
12. Raw preview, visualizer, and shape switching all depend on generated image availability plus the design’s `nail_shape` state.
13. Design library depends on `designs.latest_generation_id`, associated generation outputs, and naming support.
14. Chat refinement depends on the full generation pipeline plus `chat_turns` persistence.
15. Testing spans all layers: mocks cover integrations, integration tests cover Supabase contracts, E2E covers the core flow, and snapshots cover shape regressions.

## 4. Layer Map Diagram

```text
HORIZONTAL LAYER MAP
────────────────────────────────────────────────────────────────────────────────────────────────────────
Layer / Area                │ Auth + Access      │ References + Inputs      │ Generation + Output       │ Persistence + QA
────────────────────────────┼────────────────────┼──────────────────────────┼───────────────────────────┼────────────────────────────
Infrastructure             │ env, Vercel, CI    │ dev tunnel, previews     │ Gemini key, app URL       │ GitHub checks, deploy path
Persistence                │ profiles, RLS      │ references, join table   │ designs, generations      │ chat_turns, buckets, SQL
Auth                       │ magic link         │ allowlist gating         │ SSR sessions              │ middleware exceptions
External: Pinterest        │ OAuth + refresh    │ boards, pins, image pull │ cached reference images   │ token expiry on profile
External: Gemini           │ [data not provided]│ multimodal inputs        │ retry, refusal, output    │ response metadata
Core Domain                │ user-scoped flows  │ ingest + reference set   │ generate + regenerate     │ save + reload semantics
API / Server Actions       │ login, callback    │ board/pin routes, upload │ create/save/regenerate    │ chat turn action
UI Primitives              │ shell, header      │ loading + touch tokens   │ toasts, pending states    │ tablet-first layout
Feature UI                 │ login, dashboard   │ boards, pins, upload     │ preview, visualizer       │ library, chat panel
Testing                    │ auth E2E           │ ingestion/unit coverage  │ provider mocks + retries  │ RLS tests, snapshots
────────────────────────────┴────────────────────┴──────────────────────────┴───────────────────────────┴────────────────────────────
```

## 5. Scope Summary

1. Total architectural layers represented in the memo-level map: 10 major layers.
2. Total concrete persistence tables specified: 6; storage buckets: 2; named route handlers/actions for P0 plus P1: 10.
3. New vs modified: this is greenfield, so the plan is almost entirely new-build work.
4. Broadest layers: Persistence, Core Domain, API/Server Actions, and Feature UI because each must carry the full end-to-end flow.
5. Largest user-facing layer: Feature UI, spanning login, Pinterest browse, uploads, reference curation, generation, visualizer, library, and optional chat.
6. Riskiest external layer: External integrations, split between Pinterest OAuth friction and Gemini output quality.
7. Riskiest internal layer: Core Domain, where reference priority, retry logic, saved-design lineage, and later chat accumulation meet.
8. The map stays within the memo’s v1 boundaries: single-user auth, Pinterest plus uploads, Gemini-only generation, 2D uniform five-nail visualizer, design library, tablet-first UI, optional P1 chat.
9. Deferred items stay outside executable scope except where a boundary must be preserved, most notably fallback-provider optionality and future multi-user compatibility.
