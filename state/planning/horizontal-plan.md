# Horizontal Plan

## 1. Layer Inventory

1. Infrastructure: Hosts the Next.js app, provisions Firebase, stores secrets, and provides CI plus deploy surfaces for local and hosted testing.
2. Deployment surfaces: Vercel preview/production deploys and local development support Firebase Auth email-link flows plus Pinterest API testing.
3. Environment configuration: Holds Pinterest static-token, Firebase, app URL, and allowed-email values.
4. Persistence (Firebase Firestore): Stores identity, references, designs, generations, and later chat turns under Security Rules.
5. `profiles` collection: Extends Firebase Auth identity with durable app email metadata.
6. `references` collection: Normalizes Pinterest and uploaded images into one reference record shape.
7. `designs` collection: Stores the durable design record, shape choice, prompt, and current generation linkage.
8. `generations` collection: Stores each generation attempt, request payload, result path, metadata, and failure state.
9. `design_secondary_references` + `chat_turns`: Preserve ordered secondary references via subcollection or ordered array maps, plus later chat history.
10. Storage buckets + rules: Persist references and outputs while enforcing schema and access through Firestore converters, indexes, and rules files.
11. Auth: Admits only the allowed email, completes Firebase email-link sign-in, and protects non-public routes.
12. External integrations: Connect Pinterest for inspiration sourcing and Firebase AI Logic for generation.
13. Pinterest API: Reads a static bearer token, fetches boards and pins, and caches selected images for durable use.
14. Firebase AI Logic boundary: Builds multimodal requests, retries once on transient failure, and leaves room for a future fallback provider.
15. Core domain: Turns raw integrations and persistence into ingestion, reference selection, generation orchestration, and design lifecycle behavior.
16. Reference ingestion + set builder: Ingest Pinterest pins or uploads, enforce one primary reference, preserve ordered secondary cues, and honor prompt override behavior.
17. Design lifecycle services: Create, save, reload, and regenerate designs while preserving original inputs.
18. API / Server Actions: Expose route handlers and mutations used by the UI.
19. UI Primitives + Feature UI: Deliver the shell, touch-friendly states, reference-selection flow, visualizer, library, and optional chat.
20. Testing infrastructure: Verifies unit logic, mocked integrations, Security Rules-safe integrations, critical E2E flows, and visualizer regressions.

## 2. Per-Layer Requirements

### Infrastructure

INFRASTRUCTURE SURFACES
- Runtime: Next.js 15 App Router on Vercel.
- Backend services: Firebase Firestore, Auth, Cloud Storage, and Firebase AI Logic.
- Source control: GitHub repository with CI checks.
- Local auth support: Firebase email-link auth plus local Pinterest API testing.
- Preview support: Vercel preview deploys usable for auth and Pinterest browse verification.

ENVIRONMENT VARIABLES
- Required keys: `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, Firebase client/admin config vars, `APP_URL`, `ALLOWED_EMAIL`.

DEPLOYMENT REQUIREMENTS
- Vercel project must build a Next.js 15 App Router application.
- Preview deploys must exist early because Firebase Auth and Pinterest browse should be verified against deployed URLs.
- Production deploy must expose the same login and generation surfaces used in local development.

CI / CHECKS
- PR checks required by memo: `typecheck`, `lint`, `unit tests`.
- Check set exists from Slice 0 onward because it is part of foundation infrastructure.

LOCAL DEVELOPMENT
- Local development must support Firebase email-link sign-in plus Pinterest API testing without an OAuth callback dependency.

### Persistence (Firebase Firestore)

PERSISTENCE SURFACES
- Firestore collections: `profiles`, `references`, `designs`, `generations`, `chat_turns`.
- Nested persistence for secondary references: `design_secondary_references` as a design subcollection or ordered array of maps on `designs`.
- Storage buckets: `references`, `generations`.
- Schema path: Firestore converters in code plus `firestore.rules` and `firestore.indexes.json`.

COLLECTION: `profiles`
- Purpose: Extend Firebase Auth users with app-specific profile data.
- Fields required by memo: document ID = `request.auth.uid`, `email`, `createdAt`.
- Change note: Pinterest token state is removed from persisted profile data because the app now reads one static env token.

COLLECTION: `references`
- Purpose: Normalize both Pinterest-derived and uploaded reference images.
- Fields required by memo: `id`, `userId`, `source` (`pinterest` or `upload`), `sourceUrl`, `storagePath`, `pinterestPinId` nullable, `createdAt`.

COLLECTION: `designs`
- Purpose: Durable saved design entity for create/save/reload/regenerate flows.
- Fields required by memo: `id`, `userId`, `name` nullable, `primaryReferenceId`, `promptText` nullable, `nailShape` (`almond`, `coffin`, `square`, `stiletto`), `latestGenerationId`, `createdAt`, `updatedAt`.
- Functional requirement from locked decisions: the record must preserve enough inputs to support regenerate-from-saved-design in v1.

COLLECTION: `generations`
- Purpose: Store every generation attempt, not just the latest result.
- Fields required by memo: `id`, `designId`, `requestJson`, `resultStoragePath`, `providerResponseMetadata`, `status` (`pending`, `success`, `failure`), `errorMessage` nullable, `createdAt`.

SUBCOLLECTION / ORDERED ARRAY: `design_secondary_references`
- Purpose: Ordered non-primary references scoped under a design.
- Fields required by memo: `referenceId`, `orderIndex`, or equivalent ordered map shape preserved under each design document.

COLLECTION / SUBCOLLECTION: `chat_turns`
- Purpose: P1 conversation history attached to a design and a generation lineage.
- Fields required by memo: `id`, `designId`, `userMessage`, `generationId`, `orderIndex`, `createdAt`.

SECURITY RULES
- Every document with `userId` must match `request.auth.uid`.
- Profile access must be scoped to the current authenticated user.
- Saved designs, references, generations, and later chat turns must not cross user boundaries even though v1 is single-user.
- Storage access must follow the same per-user ownership rule because references and generations live in Firebase Cloud Storage.

STORAGE BUCKETS
- `references`: stores uploads and cached Pinterest images.
- `generations`: stores Gemini output images.
- Persistence layer must support fetch by saved path because UI layers depend on image URLs.

SCHEMA EVOLUTION
- Firestore has no SQL migration layer in the relational sense.
- Schema evolution lives in Firestore converters, indexes, and Security Rules while preserving the v1-to-v2 optionality called out in discovery and product docs.

### Auth

AUTH SURFACES
- Firebase Auth with email-link sign-in.
- Single-user allowlist using `ALLOWED_EMAIL`.
- Firebase client SDK plus `firebase-admin` server SDK helpers with cookie/session handling. [confirm Firebase SDK detail]
- Middleware protection for non-public routes.

LOGIN FLOW REQUIREMENTS
- `/login` page must accept email input.
- Submit action must reject any email not equal to the allowed email.
- Allowed email path must trigger Firebase email-link send behavior.
- UI must support an “email link sent” state.

SESSION REQUIREMENTS
- Session cookies are handled by Firebase client/admin auth helpers. [confirm Firebase SDK detail]
- Authenticated home page must be reachable after login in Slice 0.
- Middleware must guard all routes except `/login` and `/api/health`.

CALLBACK EXCEPTION REQUIREMENTS
- Pinterest callback-route exceptions are removed because the integration no longer uses OAuth callbacks.
- Firebase email-link completion still must preserve the allowlist and authenticated route contract. [confirm Firebase SDK detail]

SCHEMA / AUTH LINKAGE
- `profiles.id` must align to Firebase Auth `uid`.
- `profiles.email` exists so app-level allowlist and durable user metadata stay queryable.

### External Integrations

#### Pinterest API v5

PINTEREST FLOWS
- Static bearer-token access via `PINTEREST_ACCESS_TOKEN`.
- `GET /v5/user_account/boards`
- `GET /v5/boards/{board_id}/pins`
- Image fetch from selected pin URLs and cache into Firebase Cloud Storage.

TOKEN HANDLING
- Access token comes from `PINTEREST_ACCESS_TOKEN`.
- `PINTEREST_APP_ID` is tracked for app identity and setup docs.
- No profile-stored token, callback exchange, or refresh logic exists in the amended plan.

BOARD / PIN DATA REQUIREMENTS
- Integration boundary must return enough board data to render a board browser.
- Integration boundary must return enough pin data to render a pin grid and support later selection.
- Pin image URLs must remain available to ingestion logic for caching.

IMAGE CACHE REQUIREMENTS
- Pinterest-sourced reference images are not only browsed; selected pins must be copied into the app’s `references` bucket for durable use in generation.

#### Firebase AI Logic

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
- Generation service should preserve a provider boundary in `lib/ai/generate.ts` because the fallback provider slot must remain possible even though it is not built in v1.

### Core Domain

REFERENCE INGESTION
- `ingestPinterestPin(pinId)`
- Fetch pin metadata/image through Pinterest integration.
- Copy image into Firebase Cloud Storage `references`.
- Create a `references` record with `source = 'pinterest'`.

UPLOAD INGESTION
- `ingestUpload(file)`
- Store uploaded file in Firebase Cloud Storage `references`.
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
- `selectPinterestPin(pinId)`
- `uploadReference(file)`
- `createDesign(input)`
- `regenerateDesign(designId)`
- `saveDesign(designId, name?)`
- `/api/pinterest/boards`
- `/api/pinterest/boards/[id]/pins`
- P1: `sendChatTurn(designId, message)`

AUTH REQUIREMENTS
- All authenticated actions must execute in a user-scoped context compatible with Firebase Security Rules.
- Public exceptions stay limited to `/login` and `/api/health`.

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
- MSW for Firebase AI Logic behavior including success and failure.

FIREBASE INTEGRATION TESTS
- Authenticated vs unauthenticated behavior under Security Rules.
- Storage interactions for references and generations.
- Save/reload/regenerate flows tied to persisted records.

E2E TESTS
- Playwright auth flow.
- Pinterest static-token browse mock flow.
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

1. Infrastructure env configuration supplies Pinterest, Firebase, app URL, and allowlist values used by Auth and External integrations.
2. Vercel preview/prod deploys plus local development are prerequisites for Firebase auth and Pinterest browse testing.
3. Firebase availability is a prerequisite for Auth, Persistence, Storage-backed ingestion, and design saving.
4. `profiles` persistence is coupled to Firebase Auth because the profile key equals the authenticated `uid`.
5. Auth depends on Persistence for profile storage and Security Rules to keep app data user-scoped.
6. Pinterest browsing depends on `PINTEREST_ACCESS_TOKEN` plus authenticated identity for app-level gating.
7. Pinterest browsing and selected-pin ingestion depend on static-token access plus `references` bucket writes.
8. Upload ingestion depends on authenticated storage writes and the same `references` schema used by Pinterest ingestion.
9. Reference set building depends on normalized `references` rows and feeds `createDesign` plus generation orchestration.
10. Design creation and regenerate depend on durable storage of primary reference, ordered secondary references, prompt, and shape.
11. Firebase AI Logic generation depends on Firebase config, normalized reference inputs, `generations` persistence, and output storage.
12. Raw preview, visualizer, and shape switching all depend on generated image availability plus the design’s `nail_shape` state.
13. Design library depends on `designs.latest_generation_id`, associated generation outputs, and naming support.
14. Chat refinement depends on the full generation pipeline plus `chat_turns` persistence.
15. Testing spans all layers: mocks cover integrations, integration tests cover Firebase contracts, E2E covers the core flow, and snapshots cover shape regressions.

## 4. Layer Map Diagram

```text
HORIZONTAL LAYER MAP
────────────────────────────────────────────────────────────────────────────────────────────────────────
Layer / Area                │ Auth + Access      │ References + Inputs      │ Generation + Output       │ Persistence + QA
────────────────────────────┼────────────────────┼──────────────────────────┼───────────────────────────┼────────────────────────────
Infrastructure             │ env, Vercel, CI    │ local auth, previews     │ Firebase config, app URL  │ GitHub checks, deploy path
Persistence                │ profiles, rules    │ references, ordered refs │ designs, generations      │ chat_turns, buckets, indexes
Auth                       │ email link         │ allowlist gating         │ session helpers           │ middleware exceptions
External: Pinterest        │ static token       │ boards, pins, image pull │ cached reference images   │ env-token management
External: AI Logic         │ [data not provided]│ multimodal inputs        │ retry, refusal, output    │ response metadata
Core Domain                │ user-scoped flows  │ ingest + reference set   │ generate + regenerate     │ save + reload semantics
API / Server Actions       │ login              │ board/pin routes, upload │ create/save/regenerate    │ chat turn action
UI Primitives              │ shell, header      │ loading + touch tokens   │ toasts, pending states    │ tablet-first layout
Feature UI                 │ login, dashboard   │ boards, pins, upload     │ preview, visualizer       │ library, chat panel
Testing                    │ auth E2E           │ ingestion/unit coverage  │ provider mocks + retries  │ rules tests, snapshots
────────────────────────────┴────────────────────┴──────────────────────────┴───────────────────────────┴────────────────────────────
```

## 5. Scope Summary

1. Total architectural layers represented in the memo-level map: 10 major layers.
2. Total concrete persistence collections/structures specified: 6; storage buckets: 2; named route handlers/actions for P0 plus P1: 8.
3. New vs modified: this is greenfield, so the plan is almost entirely new-build work.
4. Broadest layers: Persistence, Core Domain, API/Server Actions, and Feature UI because each must carry the full end-to-end flow.
5. Largest user-facing layer: Feature UI, spanning login, Pinterest browse, uploads, reference curation, generation, visualizer, library, and optional chat.
6. Riskiest external layer: External integrations, split between Pinterest token stability and Firebase AI Logic output quality.
7. Riskiest internal layer: Core Domain, where reference priority, retry logic, saved-design lineage, and later chat accumulation meet.
8. The map stays within the memo’s v1 boundaries: single-user auth, Pinterest plus uploads, Gemini-only generation, 2D uniform five-nail visualizer, design library, tablet-first UI, optional P1 chat.
9. Deferred items stay outside executable scope except where a boundary must be preserved, most notably fallback-provider optionality and future multi-user compatibility.
