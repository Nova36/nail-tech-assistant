# Product Requirements Document: Nail Tech Assistant

**Document status:** Draft companion to the structured outline
**Primary technical reference:** `state/planning/structured-outline.md`
**Date:** 2026-04-17

## Part 1: Product Overview

**Product name:** Nail Tech Assistant

**Primary user:** The user's wife, a working nail technician

**Project owner:** Solo developer handling delivery for the Mother's Day gift

**Delivery date:** 2026-05-10

**Problem statement:**
"A skilled nail technician uses Pinterest and Instagram for inspiration, but there's a gap between "scrolling beautiful nail photos" and "executing a specific design on a client's hand." Inspiration is easy to collect; translating it into a concrete design and visualizing it on a real hand is manual, imprecise, and time-consuming — especially the 10–15 minutes of every appointment spent helping a client decide on a design."
Source: `product-discovery-brief.md` Problem Statement.

**Primary user persona:**
The primary and only active v1 user is the user's wife, a practicing nail technician who values both the clean technical side of the craft and the artistic side.
She currently uses Pinterest and Instagram for sourcing inspiration.
Her clients are indirect beneficiaries who may view designs during consultation, but they are not active users in v1.
Source: `product-discovery-brief.md` Target Users and `product-brief.md` Target User.

**Product promise:**
The v1 promise is a narrow but complete bridge from inspiration to preview:
Pinterest browse,
reference selection,
optional uploads,
optional text prompt,
AI-generated design,
five-nail preview,
shape switching,
save,
reopen,
and regenerate.
Implementation detail stays in `structured-outline.md` Part 2 Slice 0 through Slice 8 and Part 9.

**Success metrics:**
- Primary success metric is subjective adoption: the wife uses it and says "wow, I love this."
- Concrete signals include generating at least three designs in the first week.
- Concrete signals also include using it during at least one real client appointment within two weeks.
- Another engagement signal is that she requests new features.
- Minimum success bar is a polished Mother's Day demo on 2026-05-10 where she can complete Pinterest browse, reference selection, generation, hand preview, and save without bugs.
Source: `product-discovery-brief.md` Success Metrics and `product-brief.md` Success Metrics.

**Value proposition:**
The app compresses the manual consultation gap between inspiration collection and showing a client what a design could look like on a hand.
It is intentionally built for one specific workflow rather than generalized for a broader market.
Source: `product-discovery-brief.md` Value Proposition and `product-brief.md` Value Proposition.

**Explicit non-goals / out-of-scope for v1:**
- Multi-user support beyond preserving `user_id` in the data model.
- Billing.
- Scheduling.
- Inventory and low-stock tracking.
- Client history cards and appointment association.
- Formula logging.
- Portfolio tooling such as watermark automation.
- AR virtual try-on.
- Palette extraction and polish-brand matching.
- Deconstruct-the-pin markup or layer-planning workflows.
- 3D / rotatable rendering.
- Per-nail variation.
- Dedicated presentation mode.
- Broad cross-browser certification.
- Load testing.
- Accessibility certification.
- Automatic image pruning or retention automation.
- Executable fallback provider implementation unless the Slice 1 quality gate fails.
Source: `product-brief.md` Scope Boundaries, `product-discovery-brief.md` Deferred to v2+, and `structured-outline.md` Part 8 decisions plus deferred items referenced from the vertical plan.

**Hard constraints:**
- Timeline is fixed: 2026-04-17 through 2026-05-10, about 3.5 weeks.
- The project is single-user in v1.
- The UI is tablet-first and phone-compatible.
- Tablet orientation is landscape-first.
- The visualizer target is stylized-but-recognizable, not photorealistic.
- Pinterest developer app registration, Firebase project creation/configuration, and Vercel setup are real prerequisites owned by the user.
Source: `product-brief.md` Constraints and Prerequisites, `product-discovery-brief.md` Technical Constraints, and `kickoff-decisions.md` #1, #3, #9, #12.

**Architecture posture for v1:**
The product is intentionally scoped as a polished single-user web app, but it must not preclude later growth into multi-user, billing, scheduling, inventory, or 3D.
That future-proofing is preserved through narrow boundaries rather than broad v2 implementation.
Reference implementation details remain in `structured-outline.md` Part 3b, Part 6, and Part 9.

**Guiding product principles derived from the inputs:**
- The end-to-end flow matters more than isolated feature count.
- Pinterest is not an optional embellishment; it is the emotional center of the product story.
- Uploads are secondary support for the core Pinterest-led flow, not the primary v1 narrative.
- The hand preview is the visible "wow" moment and therefore deserves explicit protection in sequencing and polish.
- Chat refinement is valuable but subordinate to the P0 save/reopen/regenerate path.
- The app should feel consultation-ready on a real tablet, not merely responsive in a desktop browser.
- The data model must preserve enough lineage that regenerate is trustworthy.
- The generation provider boundary exists to preserve optionality, not to justify speculative v1 abstraction.
- User-owned prerequisites are part of the plan and may block execution if incomplete.
These principles are grounded in `product-discovery-brief.md`, `product-brief.md`, `kickoff-decisions.md`, `vertical-plan.md`, and `structured-outline.md` Part 8 and Part 9.

**Shipping posture:**
P0 ship line is Epic A, Epic B, Epic C, Epic D, and Epic F.
Epic E is stretch only.
This PRD follows the structured outline sign-off that defines P0 "done" as Slice 6 plus Slice 8, with Slice 7 cuttable.
Source: `sign-off.md` decisions #2, #10, and #14.

## Part 2: Epic Breakdown

## Epic A: Foundation + Auth

**Goal:** Establish a thin, production-shaped foundation where the allowed user can sign in, reach a protected shell, and rely on env, Firebase rules/index setup, and test scaffolding that later epics build on.
**Slices covered:** Slice 0 (reference `structured-outline.md` Part 2 Slice 0 for implementation detail)
**Depends on:** Epic none
**Estimated duration:** [data not provided]
**Owner:** Solo developer (project owner)

### User Stories

**US-A-1: Allowlisted login**
As the nail technician,
I want to sign in with only my allowed email,
so that the app stays scoped to me and avoids multi-user complexity in v1.

Acceptance criteria:
- **Given** I am on `/login` and I enter the configured allowed email, **when** I submit the login form, **then** the app triggers the Firebase email-link flow and shows a sent-state confirmation.
- **Given** I am on `/login` and I enter an email that does not match `ALLOWED_EMAIL`, **when** I submit, **then** the app rejects the request before any Firebase send action occurs and explains that only the configured email can sign in.
- **Given** I try to bypass the login UI and access an authenticated route directly while unauthenticated, **when** the request reaches the app, **then** middleware redirects me to `/login` and does not expose protected content.

**US-A-2: Protected authenticated shell**
As a logged-in user,
I want a stable authenticated shell,
so that later Pinterest, design, and library flows all have a protected home base.

Acceptance criteria:
- **Given** I have a valid session, **when** I visit `/`, **then** I land in the authenticated shell and see the baseline dashboard placeholder with primary workflow entry points.
- **Given** my session expires or becomes invalid, **when** I attempt to load a protected page, **then** the app redirects me back to login or a re-auth state instead of showing a generic application error.
- **Given** a public route such as `/api/health` is requested, **when** middleware evaluates the request, **then** that exception remains reachable without causing an auth loop.

**US-A-3: Safe project baseline**
As the project owner,
I want env validation, migrations, and baseline tests in place,
so that later epics can move fast without hidden setup drift.

Acceptance criteria:
- **Given** a fresh environment missing required secrets, **when** the app boots or relevant server code runs, **then** env validation fails early with a clear configuration error rather than a downstream Pinterest or generation failure.
- **Given** a fresh Firebase project, **when** baseline rules and indexes are applied, **then** the `profiles` schema and Security Rules baseline come up cleanly in a way that matches the auth model.
- **Given** a pull request or local change set, **when** the baseline checks run, **then** `typecheck`, `lint`, and unit tests execute as the required foundation gate.

### Scope

- IN: Next.js scaffold, App Router shell, Firebase client/admin helpers, allowlisted email login, middleware protection, env validation, baseline `profiles` rules/index setup, CI/test harness, public health route, login sent-state UX.
- IN: Shared shell primitives and route structure that later epics extend rather than replace.
- IN: Baseline type, env, and migration conventions that keep downstream slices aligned with the structured outline.
- OUT (handled by another epic): Pinterest browse in Epic B.
- OUT (handled by another epic): Reference capture, uploads, and draft design creation in Epic C.
- OUT (handled by another epic): Visualizer, library, and regenerate in Epic D.
- OUT (handled by another epic): Tablet polish and final docs hardening in Epic F.
- OUT (v2+): Multi-user UI, sign-up flow, broader account concepts, and billing-oriented auth semantics are deferred per `structured-outline.md` Part 8 decision #1 and deferred-items references.
- OUT (v2+): Any account-management experience beyond the one-person allowlisted gift workflow remains outside this epic and outside v1.

### Functional Requirements

- FR-A-1: The app must support Firebase email-link login for a single allowlisted user.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 9 Shared State Conventions.

- FR-A-2: Server-side allowlist enforcement must reject non-authorized emails before auth side effects occur.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 3b Security Considerations.

- FR-A-3: All non-public routes must be protected by middleware while preserving narrow exceptions for login and health handling.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 3b Security Considerations.

- FR-A-4: The authenticated user must land in a protected shell that later epics can extend without changing the auth contract.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 9 Handoff Points Between Epics.

- FR-A-5: Required environment variables and baseline Firebase rules/index setup must be validated early enough to prevent hidden downstream failures.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 3b Migration Plan.

- FR-A-6: The project must include baseline CI and local test harnesses capable of supporting the P0 verification plan.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and Part 3 Verification Plan.

- FR-A-7: The `profiles` persistence model must align with Firebase Auth `uid` so downstream profile access and Security Rules contracts do not drift.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and `horizontal-plan.md` Auth Schema / Auth Linkage.

- FR-A-8: The dashboard shell must expose a stable home for the eventual "New design" and "My designs" flows even if those routes are placeholders at this stage.
Reference build detail: `structured-outline.md` Part 2 Slice 0 and `vertical-plan.md` Slice 0 LAYERS TOUCHED.

### Non-Functional Requirements

- Performance: Auth redirects and shell loading should feel immediate relative to generation latency; no special performance target is stated beyond keeping the foundation thin. Source: `structured-outline.md` Part 3b Performance Implications and Part 2 Slice 0.
- Security: Allowlist must be enforced server-side; Security Rules remain on in single-user mode; middleware exemptions stay narrow. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: Login must support a sent-state, the shell must expose clear next actions, and touch-friendly primitives begin here because tablet-first is a product requirement. Source: `horizontal-plan.md` UI Primitives and `kickoff-decisions.md` #9.
- Reliability: Missing env vars, malformed email input, Firebase send failures, and session loss must fail clearly rather than leaking into ambiguous app states. Source: `structured-outline.md` Part 2 Slice 0 Validation and Part 3b Error Handling Strategy.

**Epic A source anchor note:**
The epic remains intentionally thin.
If foundation work starts absorbing Pinterest assumptions, design-domain logic, or speculative multi-user abstractions, it has exceeded its role.
That thin-foundation constraint is itself a non-functional requirement derived from the timeline and the slice plan.
Source: `vertical-plan.md` Slice 0 and `structured-outline.md` Risk #3 detail.

### Acceptance at Epic Completion

Epic A is complete when the allowlisted user can request an email link, establish a session, land in the protected shell, and traverse baseline protected routes without auth loops; a non-allowlisted email is blocked before Firebase auth send behavior occurs; and the project has the env, rules/index, and test scaffolding that Slice 2 onward relies on. This corresponds to the vertical plan's Slice 0 WHAT WORKS statement: the user can log in with the allowed email, land in the authenticated shell, and run a passing auth-focused baseline test path. Epic completion is confirmed by `tests/e2e/auth.spec.ts`, the allowlist unit test, and a clean baseline rules/index run as referenced in `structured-outline.md` Part 2 Slice 0.

### Dependencies

- External: Firebase Auth, Firestore, Cloud Storage, Vercel deploy/build surface, and the required env vars `APP_URL`, `ALLOWED_EMAIL`, `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, and Firebase config vars.
- Internal: None by dependency table; this epic establishes working login, protected shell, env validation, baseline migrations, and test harness per `structured-outline.md` Part 9 Handoff Points.
- Internal: This epic also establishes the shared conventions later epics inherit for route protection, env handling, and user-scoped persistence.

### Risks Applicable

- Risk #3: 3.5-week timeline collapses if Slice 0 becomes a platform sprint instead of a thin foundation.
- Risk #4: Spec-implementation drift can start at the seam level if shared contracts are vague in foundation work.
- Risk #6: Single-user shortcuts can create future migration pain if `userId` and Security Rules are skipped.
- Risk #13: User-owned prerequisites such as Firebase and Vercel setup can still block the first implementation PR.

### Open Items for This Epic

- Exact duration estimate beyond `[data not provided]` is not present in the inputs.
- Exact Firebase auth/session helper detail is not yet specified in the inputs. `[confirm Firebase SDK detail]`

## Epic B: Pinterest Integration

**Goal:** Let the authenticated user browse boards, open a board, and view pins through a static-token Pinterest integration.
**Slices covered:** Slice 2 (reference `structured-outline.md` Part 2 Slice 2 for implementation detail)
**Depends on:** Epic A (from `structured-outline.md` Part 9 dependency table)
**Estimated duration:** 1-2 days, reduced from the earlier OAuth-shaped assumption
**Owner:** Solo developer (project owner)

### User Stories

**US-B-1: Use the configured Pinterest account**
As the nail technician,
I want the app to use the configured Pinterest account,
so that the app can use my real inspiration source instead of a fake or upload-only flow.

Acceptance criteria:
- **Given** I am logged into the app and the Pinterest env token is configured, **when** I open the Pinterest surface, **then** the app uses that token and shows an authenticated browse view without a user OAuth step.
- **Given** the token is missing, revoked, or invalid, **when** the browse route processes the request, **then** the app blocks the flow and shows token-replacement guidance instead of treating Pinterest as available.
- **Given** I am not authenticated in the app, **when** I attempt to reach Pinterest browse through a protected route, **then** the app blocks access through the auth shell rather than loading Pinterest into an unauthenticated context.

**US-B-2: Browse boards and pins**
As the nail technician,
I want to browse my boards and open a board's pin grid,
so that I can find real inspiration inside the app.

Acceptance criteria:
- **Given** the configured Pinterest token is valid, **when** I open the Pinterest browse area, **then** I see boards rendered in a board grid.
- **Given** I select a board from the board grid, **when** the app fetches pins for that board, **then** I see the pin grid for that board.
- **Given** Pinterest returns a fetch failure or the static access token is revoked, **when** I try to load boards or pins, **then** the app shows a retryable browse error with token-replacement guidance rather than pretending the integration is still healthy.

**US-B-3: Keep Pinterest access stable through env configuration**
As the project owner,
I want Pinterest access to come from static env configuration,
so that browsing remains stable without OAuth, callback, or refresh complexity.

Acceptance criteria:
- **Given** the env token is valid, **when** a Pinterest request occurs, **then** the integration sends it as a bearer token and boards/pins load without per-user token lookup.
- **Given** the env token expires or is revoked, **when** a later Pinterest request occurs, **then** the integration fails clearly and surfaces replace-the-token guidance rather than pretending access still works.
- **Given** the app is using one project-owner token for development/demo, **when** the integration fetches boards and pins, **then** later slices can consume that data without any profile-stored token state.

### Scope

- IN: Static-token Pinterest API access, board list, board pin list, ready-state UI, and mocked and manual browse verification.
- IN: Env-level Pinterest token handling needed for later selection and ingestion work.
- IN: Deployment posture across local and Vercel surfaces without callback handling.
- OUT (handled by another epic): Persisting selected pins into the shared `references` model and combining them with uploads in Epic C.
- OUT (handled by another epic): AI generation, visualizer, library, and regenerate in Epics C and D.
- OUT (handled by another epic): Final loading-state and error-state polish in Epic F.
- OUT (v2+): Any Pinterest-driven social, discovery, recommendation, or multi-user sharing features remain outside v1 and the executable slice plan.
- OUT (v2+): Any broader Pinterest content-management or analytics capability remains outside v1.

### Functional Requirements

- FR-B-1: The app must read Pinterest access from `PINTEREST_ACCESS_TOKEN` in an authenticated context and expose board/pin browse without an OAuth callback flow.
Reference build detail: `structured-outline.md` Part 2 Slice 2 and Part 3b Security Considerations.

- FR-B-2: The app must keep Pinterest access outside the user profile record and use env-backed bearer-token requests for later browsing calls.
Reference build detail: `structured-outline.md` Part 2 Slice 2 and `horizontal-plan.md` Persistence `profiles`.

- FR-B-3: The integration must fail clearly when the static token expires or is revoked rather than inventing refresh behavior that does not exist in the amended plan.
Reference build detail: `structured-outline.md` Part 2 Slice 2 and `horizontal-plan.md` External Integrations Pinterest API v5.

- FR-B-4: The app must expose board and board-pin browse surfaces sufficient for user navigation and later pin selection.
Reference build detail: `structured-outline.md` Part 2 Slice 2 and `vertical-plan.md` Slice 2 WHAT WORKS.

- FR-B-5: Pinterest browse failures must preserve linked-state clarity and provide reconnect or retry guidance rather than generic failure handling.
Reference build detail: `structured-outline.md` Part 3b Error Handling Strategy and Part 2 Slice 2 Validation.

- FR-B-6: Pinterest browse routes must return enough board and pin data for the UI to render browser grids and support later selection semantics.
Reference build detail: `structured-outline.md` Part 2 Slice 2 and `horizontal-plan.md` External Integrations Pinterest board / pin requirements.

- FR-B-7: The integration must document `PINTEREST_APP_ID` and `PINTEREST_ACCESS_TOKEN` clearly enough that token setup and replacement remain operationally simple.
Reference build detail: `sign-off.md` #17 and `structured-outline.md` Part 6 External Dependencies.

### Non-Functional Requirements

- Performance: Board and pin browsing should feel responsive because Pinterest is the main inspiration source, even though no hard millisecond target is defined. Source: `structured-outline.md` Part 3b Performance Implications.
- Security: The Pinterest token stays in env configuration rather than the profile record; middleware exemptions remain limited to login and health. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: The Pinterest ready-state UI must clearly communicate whether token-backed browse is available, and browse flows must remain touch-friendly on tablet. Source: `horizontal-plan.md` Feature UI and UI Primitives.
- Reliability: Missing token, revoked token, and partial Pinterest payloads must fail with reconnect-or-replace-token guidance. Source: `structured-outline.md` Part 3b Error Handling Strategy and Slice 2 Validation.

**Epic B source anchor note:**
This epic is intentionally browse-only.
Pin selection, upload blending, and reference-set semantics belong to Epic C.
Keeping browse separate from ingestion reduces debugging scope and matches the vertical-plan moldability guidance.
Source: `vertical-plan.md` Slice 2 NOT YET and Moldability Note #5.

### Acceptance at Epic Completion

Epic B is complete when the authenticated user can open Pinterest browse, see boards, open a board, and view its pin grid through the configured static token. This maps directly to the vertical plan's Slice 2 WHAT WORKS statement: see boards, open one board, and view its pin grid using the configured static Pinterest token. Epic completion is verified through mocked browse Playwright coverage and one real-token smoke test as called for in `structured-outline.md` Part 2 Slice 2 and Part 3 Verification Plan.

### Dependencies

- External: Pinterest API v5, registered Pinterest developer app, valid `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, and local/Vercel surfaces for browse testing.
- Internal: Epic A must have delivered auth shell, profile persistence, middleware behavior, env validation, and deployable surfaces per `structured-outline.md` Part 9 Handoff Points.
- Internal: Epic A must already expose env validation and authenticated routing that Epic B reuses.

### Risks Applicable

- Risk #1: Pinterest token expiration or revocation can stall real integration work.
- Risk #3: Timeline pressure can increase if external integration churn lands late.
- Risk #4: Contract drift in routes and token semantics can cause rework.
- Risk #7: Tablet ergonomics could remain unsettled if browse UX is deferred too long.
- Risk #10: Future reference ingestion can split if Pinterest browse data is not shaped cleanly.
- Risk #13: User-owned Pinterest app registration is a real blocker and is not marked complete in the inputs.

### Open Items for This Epic

- Pinterest developer app registration is described as "user will register today," but completed status is not recorded in the provided inputs. `[data not provided]`
- Exact token replacement workflow beyond the env vars is not specified in the inputs. `[data not provided]`

## Epic C: Reference Collection + AI Generation Pipeline

**Goal:** Turn Pinterest pins and uploaded images into one normalized reference set, persist a draft design, and generate a stored nail-design image with the approved provider path and guided failure handling.
**Slices covered:** Slice 3 and Slice 4 (reference `structured-outline.md` Part 2 Slice 3 and Slice 4 for implementation detail)
**Depends on:** Epic A and Epic B and Slice 1 decision gate (from `structured-outline.md` Part 9 dependency table)
**Estimated duration:** [data not provided]
**Owner:** Solo developer (project owner)

### User Stories

**US-C-1: Build a reference set from Pinterest and uploads**
As the nail technician,
I want to mix Pinterest pins with uploaded phone photos,
so that I can assemble the exact inspiration set I want before generating a design.

Acceptance criteria:
- **Given** I am in the new-design workspace with access to Pinterest browse and upload, **when** I choose one Pinterest pin as primary and add optional secondary pins and/or uploads, **then** the app assembles them into a single reference panel.
- **Given** I try to proceed without exactly one primary reference, **when** I assemble the set, **then** the app blocks invalid reference-state combinations and keeps the primary/secondary distinction clear.
- **Given** a Pinterest image cache write or upload storage write fails, **when** I add that reference, **then** the app does not silently pretend the reference is usable and instead shows an actionable error state.

**US-C-2: Capture prompt intent alongside references**
As the nail technician,
I want to add optional free-text guidance,
so that I can tell the model how to reinterpret or constrain the visual references.

Acceptance criteria:
- **Given** I have a valid reference set, **when** I leave the prompt blank, **then** the app still allows design creation and later generation.
- **Given** I enter a prompt that conflicts with a reference cue, **when** the design input set is built, **then** the app preserves the prompt as a first-class input that the generation path treats as able to override visual cues.
- **Given** prompt input is malformed or outside accepted constraints, **when** I submit the design creation step, **then** the app blocks the invalid input with a clear correction path rather than silently truncating or ignoring it.

**US-C-3: Persist a durable draft design**
As the project owner,
I want the selected references, prompt, and shape stored as a durable design draft before generation,
so that later save, reopen, and regenerate semantics rest on stored inputs rather than transient UI state.

Acceptance criteria:
- **Given** I have assembled a valid reference set and selected a shape, **when** the app creates the design, **then** it stores a durable design record with primary reference, ordered secondary references, prompt, and shape.
- **Given** the design create request fails under Security Rules or persistence issues, **when** I attempt to continue to generation, **then** the app blocks the transition and reports the save failure instead of leaving a ghost design state.
- **Given** an unauthorized or mismatched user context, **when** a design create mutation executes, **then** the write is denied by user-scoped rules rather than creating a cross-user record.

**US-C-4: Generate a nail-design image**
As the nail technician,
I want the app to generate a nail-design image from my assembled references and prompt,
so that I can move from inspiration collection into a concrete design candidate.

Acceptance criteria:
- **Given** a valid stored design with one primary reference and optional secondary references and prompt, **when** I press generate, **then** the app creates a generation attempt, shows a polished pending state, and returns a stored output image on success.
- **Given** a transient provider failure or rate limit, **when** generation runs, **then** the app retries once silently and then either succeeds or surfaces a guided error state.
- **Given** the provider refuses or the provider decision has not been cleared, **when** generation is requested, **then** the app does not hide the failure and instead returns an adjust-inputs style error path or blocks generation based on the unresolved decision gate.

**US-C-5: See a raw result or guided failure**
As the nail technician,
I want immediate feedback after generation,
so that I can tell whether the pipeline worked before moving into the dedicated visualizer.

Acceptance criteria:
- **Given** a generation succeeds, **when** the response is persisted, **then** the app shows the stored generated image in a raw preview state before the later visualizer enhancements.
- **Given** generation fails after the silent retry budget is exhausted, **when** the app renders the result state, **then** it shows a guided error surface with an "adjust inputs" recovery direction instead of an opaque generic error.
- **Given** output storage fails after the provider returns success, **when** the generation lifecycle updates persistence, **then** the app avoids leaving the generation permanently stuck in `pending` and surfaces a deterministic failure state.

### Scope

- IN: Reference ingestion from Pinterest and uploads, `references` storage bucket usage, one-primary plus ordered-secondary semantics, optional prompt capture, durable draft design creation, provider request assembly, generation lifecycle orchestration, one silent retry, raw preview, guided failure state, and persisted generation output.
- IN: The provider decision gate as a real prerequisite to production generation, not a background assumption.
- IN: Generation-state persistence robust enough for later library and regenerate features to trust.
- OUT (handled by another epic): Five-nail visualizer, live shape switching UI, saved-design viewer, and library browsing in Epic D.
- OUT (handled by another epic): Chat-based iterative refinement in Epic E.
- OUT (handled by another epic): Final tablet hardening, broad error-surface consistency, and setup docs in Epic F.
- OUT (v2+): Executable fallback-provider implementation, per-nail variation, 3D rendering, and any speculative multi-provider orchestration beyond the preserved provider boundary.
- OUT (v2+): Any attempt to treat uploads as the default v1 flow instead of a secondary source is outside the signed-off scope.

### Functional Requirements

- FR-C-1: Pinterest-selected images and uploaded photos must normalize into the same durable `references` model.
Reference build detail: `structured-outline.md` Part 2 Slice 3 and `horizontal-plan.md` Persistence `references`.

- FR-C-2: The app must enforce exactly one primary reference and preserve ordered secondary references.
Reference build detail: `structured-outline.md` Part 2 Slice 3 and `horizontal-plan.md` Core Domain Reference Set Builder.

- FR-C-3: The optional prompt must be stored with the design input set and treated as able to override conflicting visual cues.
Reference build detail: `structured-outline.md` Part 2 Slice 3, Part 2 Slice 4, and `kickoff-decisions.md` #5.

- FR-C-4: The app must create a durable design record before or at generation time that preserves references, prompt, and shape for later reopen and regenerate behavior.
Reference build detail: `structured-outline.md` Part 2 Slice 3 and Part 9 decision #13 in sign-off form.

- FR-C-5: The generation service must assemble a multimodal provider request from normalized references, prompt, and shape.
Reference build detail: `structured-outline.md` Part 2 Slice 4 and `horizontal-plan.md` External Integrations Gemini 2.5 Flash Image.

- FR-C-6: The generation lifecycle must create a generation row before provider invocation, classify result states, persist output storage paths, and update latest-generation linkage on success.
Reference build detail: `structured-outline.md` Part 2 Slice 4 and Part 3b Error Handling Strategy.

- FR-C-7: Generation failures must use one silent auto-retry and then present an adjust-inputs recovery state.
Reference build detail: `structured-outline.md` Part 2 Slice 4, Part 3b Error Handling Strategy, and `kickoff-decisions.md` #8.

- FR-C-8: The raw generated image must be viewable before the dedicated visualizer slice lands.
Reference build detail: `structured-outline.md` Part 2 Slice 4 and `vertical-plan.md` Slice 4 WHAT WORKS.

- FR-C-9: Generation status transitions must not leave misleading `pending` state if provider success is followed by storage failure or write inconsistency.
Reference build detail: `structured-outline.md` Part 2 Slice 4 Validation and Risk #11.

- FR-C-10: Design creation and generation orchestration must delegate to shared domain services rather than duplicating lifecycle logic in route handlers.
Reference build detail: `horizontal-plan.md` API / Server Actions Data Contract Requirements and `structured-outline.md` Part 2 Slice 4.

### Non-Functional Requirements

- Performance: Firebase AI Logic latency will dominate; the requirement is a polished pending state that makes 10 to 15 second waits feel intentional, not sub-second output. Source: `structured-outline.md` Part 3b Performance Implications and `product-discovery-brief.md` Technical Constraints.
- Security: All reference, design, and generation writes stay user-scoped under Security Rules; provider secrets stay server-side; durable storage access follows user-owned path rules. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: The reference panel must make primary versus secondary roles obvious, prompt helper text must explain override semantics, and generation states must feel clear on tablet. Source: `horizontal-plan.md` Feature UI and `kickoff-decisions.md` #4, #5, #9.
- Reliability: Cache failures, upload failures, missing primary reference, transient provider errors, refusal states, storage failures, and stale design records must fail deterministically and not create misleading saved state. Source: `structured-outline.md` Part 2 Slice 3, Slice 4, and Part 3b Error Handling Strategy.

**Epic C source anchor note:**
This epic is where the durable product contract really forms.
If normalized references, design drafts, and generation persistence are underspecified here, Epic D cannot honestly promise trustworthy reopen or regenerate behavior later.
That is why the structured outline treats design lineage as a first-class concern before the library slice.
Source: `kickoff-decisions.md` #7, `structured-outline.md` Risk #12, and Part 9 handoff points.

### Acceptance at Epic Completion

Epic C is complete when the authenticated user can assemble a mixed-source reference set with one primary and ordered secondary references, optionally add a prompt, create a durable design, press generate, wait through a polished pending state, and receive either a stored generated image or a guided failure state. This corresponds to the vertical plan's Slice 3 WHAT WORKS statement and Slice 4 WHAT WORKS statement together: choose one primary Pinterest pin, add secondary pins and/or uploads, see the assembled reference panel, then press generate and receive a stored generated nail-design image or a guided error state. Epic completion is verified by the reference assembly Playwright flow, generation happy-path and error-path Playwright coverage, request-builder and retry unit tests, and generation persistence integration coverage referenced in `structured-outline.md` Part 2 Slice 3 and Slice 4.

### Dependencies

- External: Pinterest image availability for selected pins, Firebase Cloud Storage for `references` and `generations`, Firebase AI Logic / Gemini 2.5 Flash Image or the provider approved by the Slice 1 decision gate, and the required generation env credentials.
- Internal: Epic A must have delivered auth, env, rules/index, and storage baseline; Epic B must have delivered usable pins from the configured Pinterest account; the Slice 1 provider decision gate must be passed before production generation is committed. Source: `structured-outline.md` Part 9 dependency table and handoff points.
- Internal: Epic C also depends on the narrow route and domain contracts established earlier so that Pinterest-specific and upload-specific paths do not fork into incompatible lifecycle logic.

### Risks Applicable

- Risk #2: Gemini reference-edit quality may not be good enough for nail-design output.
- Risk #3: Timeline pressure intensifies if reference and generation plumbing churn together.
- Risk #4: Contract drift across design lifecycle seams can create rework.
- Risk #8: Firebase storage performance may be weaker than expected for reference or generation images.
- Risk #10: Reference ingestion can split into Pinterest-specific and upload-specific paths if not normalized.
- Risk #11: Generation persistence can become inconsistent on partial failures.
- Risk #12: Regenerate trust can be damaged if the durable design record does not fully preserve intent.
- Risk #14: AI latency can make the flow feel broken without polished pending and recovery states.

### Open Items for This Epic

- Exact post-spike provider choice is not yet known because Slice 1 is still pending. `[data not provided]`
- Exact duration estimate for Slice 3 plus Slice 4 is not present in the inputs. `[data not provided]`
- Exact Firebase rules/index detail and token replacement specifics are not fully specified in the inputs. `[confirm Firebase SDK detail]`

## Epic D: Visualizer + Library

**Goal:** Turn generated output into a convincing five-nail preview, preserve shape choice, and support save, reopen, rename, and regenerate from stored inputs.
**Slices covered:** Slice 5 and Slice 6 (reference `structured-outline.md` Part 2 Slice 5 and Slice 6 for implementation detail)
**Depends on:** Epic C (from `structured-outline.md` Part 9 dependency table)
**Estimated duration:** [data not provided]
**Owner:** Solo developer (project owner)

### User Stories

**US-D-1: Preview a generated design on a hand**
As the nail technician,
I want to see the generated design mapped across five nails,
so that the app delivers the core inspiration-to-visualization moment.

Acceptance criteria:
- **Given** a design has a successful generation result, **when** I open the design workspace, **then** I see the generated image rendered across a five-nail hand layout.
- **Given** the generation image is missing or cannot be loaded, **when** the visualizer view tries to render, **then** the app shows a controlled error or fallback state instead of a broken layout.
- **Given** I am not authorized to access the saved design, **when** I request the design view, **then** the app blocks access rather than showing another user's design state.

**US-D-2: Switch nail shapes live**
As the nail technician,
I want to switch between almond, coffin, square, and stiletto,
so that I can preview how the same design reads across common nail shapes.

Acceptance criteria:
- **Given** a visualized design is open, **when** I select a supported shape, **then** the preview updates immediately without triggering a new AI generation.
- **Given** I reload or reopen the same design later, **when** the workspace loads, **then** the previously selected shape is restored from stored design state.
- **Given** an invalid or unsupported shape value is submitted, **when** the shape update route processes it, **then** the app rejects the update safely rather than corrupting persisted design state.

**US-D-3: Save and browse a personal design library**
As the nail technician,
I want generated designs to appear in a personal library,
so that I can return to useful ideas later instead of recreating them from memory.

Acceptance criteria:
- **Given** a generated design exists, **when** I save it or return to the library, **then** the design appears as a browsable card with thumbnail, name, and updated metadata.
- **Given** I have not named the design yet, **when** it first appears in the library, **then** the app still shows the saved design and allows naming later.
- **Given** a design cannot be found or belongs to another user context, **when** the library or design-detail route is loaded, **then** the app does not expose the record and instead fails safely.

**US-D-4: Reopen and regenerate from stored inputs**
As the nail technician,
I want to reopen a saved design and regenerate it from the original references and prompt,
so that iteration stays grounded in the original design intent instead of transient UI state.

Acceptance criteria:
- **Given** a saved design exists with stored references, prompt, shape, and generation lineage, **when** I reopen it, **then** the workspace restores the visualizer, prompt, references, and selected shape.
- **Given** I press regenerate on a saved design, **when** the request runs, **then** the app uses the stored design inputs and creates a new latest generation result.
- **Given** referenced inputs are missing, stale, or inconsistent, **when** regenerate runs, **then** the app surfaces a controlled failure rather than pretending the design was regenerated from the original intent.

### Scope

- IN: Five-nail visualizer, four-shape selector, persisted `nail_shape`, visualizer frame for landscape tablet use, design library grid, inline naming, saved-design detail load, regenerate from stored inputs, and latest-generation updates.
- IN: Shape-specific rendering assets or masks needed to make the 2D preview convincing enough for v1.
- IN: Library semantics that feel like a continuation of the workspace, not a detached gallery.
- OUT (handled by another epic): Chat-driven multi-turn refinement in Epic E.
- OUT (handled by another epic): Final polish pass, consistent loading/error surfaces, and full setup docs in Epic F.
- OUT (v2+): Per-nail variation, 3D or rotatable rendering, richer history presentation beyond what v1 needs, and any separate client presentation mode.
- OUT (v2+): Accent-nail composition, per-finger texture differences, and advanced spatial rendering remain explicitly deferred.

### Functional Requirements

- FR-D-1: The app must render one generated design uniformly across a five-nail hand layout.
Reference build detail: `structured-outline.md` Part 2 Slice 5 and `product-brief.md` P0 feature #6.

- FR-D-2: The app must support live switching among `almond`, `coffin`, `square`, and `stiletto`.
Reference build detail: `structured-outline.md` Part 2 Slice 5 and Part 9 Shared State Conventions.

- FR-D-3: Shape switching must persist to the design record and restore on reopen.
Reference build detail: `structured-outline.md` Part 2 Slice 5 and Slice 6.

- FR-D-4: The design library must show saved designs with thumbnail, naming affordance, and stable reopen behavior.
Reference build detail: `structured-outline.md` Part 2 Slice 6 and `vertical-plan.md` Slice 6 WHAT WORKS.

- FR-D-5: Regenerate must use stored design inputs rather than transient UI state.
Reference build detail: `structured-outline.md` Part 2 Slice 6 and sign-off decision #13 reflected in Part 8.

- FR-D-6: The app must preserve generation lineage so the latest result updates without destroying older generation rows.
Reference build detail: `structured-outline.md` Part 2 Slice 6 and `horizontal-plan.md` Persistence `generations`.

- FR-D-7: The library must permit unnamed designs to exist first and accept naming later without breaking browse or reopen behavior.
Reference build detail: `structured-outline.md` Part 2 Slice 6 Validation.

- FR-D-8: Reopened designs must restore enough workspace context that the experience feels like the same design session rather than a flattened asset view.
Reference build detail: `structured-outline.md` Part 3 Verification Plan Slice 6 manual criterion.

### Non-Functional Requirements

- Performance: Visualizer rendering and shape switching should feel immediate relative to generation; no new generation request should be triggered for shape changes. Source: `structured-outline.md` Part 2 Slice 5 Validation and Part 3b Performance Implications.
- Security: Saved designs, references, generations, and shape updates remain protected by Security Rules and authenticated routing. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: The preview must be stylized-but-recognizable, landscape-friendly, and convincing enough for consultation without a separate presentation mode. Source: `kickoff-decisions.md` #9, #10, #12 and `structured-outline.md` Part 2 Slice 5.
- Reliability: Missing generation images, invalid shape values, stale references, design-not-found conditions, and regenerate lineage mismatches must fail safely and visibly. Source: `structured-outline.md` Part 2 Slice 5, Slice 6, and Part 3b Error Handling Strategy.

**Epic D source anchor note:**
The fidelity bar is not photorealism.
It is a convincing stylized preview that helps a nail technician extrapolate the final look.
That lower-but-explicit bar is what keeps the epic feasible in the timeline while still protecting the gift-worthy user moment.
Source: `kickoff-decisions.md` #12 and `structured-outline.md` Risk #5 detail.

### Acceptance at Epic Completion

Epic D is complete when a generated design can be viewed on a five-nail hand, switched live across the four supported shapes, saved into a browsable library, reopened later, and regenerated from the same stored inputs to produce a new latest result. This corresponds to the vertical plan's Slice 5 WHAT WORKS statement and Slice 6 WHAT WORKS statement together: view the generated image mapped across five nails, switch shapes live, then name, revisit, reopen, and regenerate from the same stored inputs. Epic completion is verified by the visualizer shape Playwright test, screenshot-regression coverage, the save-reload-regenerate Playwright flow, and the Security Rules-focused integration tests called out in `structured-outline.md` Part 2 Slice 5 and Slice 6.

### Dependencies

- External: Firebase Cloud Storage image delivery for generation outputs and references.
- Internal: Epic C must deliver real generated outputs, stable design records, latest-generation linkage, and durable input preservation before visualizer and library semantics can be trusted. Source: `structured-outline.md` Part 9 Handoff Points Between Epics.
- Internal: Epic D also depends on the stored-shape contract that starts in Epic C's design record and becomes visible here.

### Risks Applicable

- Risk #3: Timeline slips can consume the polish budget if visualizer and library work land too late.
- Risk #5: The 2D visualizer may work technically but still look cheap.
- Risk #6: Shortcuts in durable design modeling can create future migration pain.
- Risk #8: Firebase image delivery may underperform for the preview and library.
- Risk #12: Regenerate may fail semantically if stored design intent is incomplete.
- Risk #14: If generation waits already feel slow, reopen/regenerate flows need especially clear loading states.

### Open Items for This Epic

- Exact duration estimate for Slice 5 plus Slice 6 is not present in the inputs. `[data not provided]`
- Exact `DesignDetail` DTO shape beyond the named required columns is not fully enumerated outside the structured outline. `[data not provided]`

## Epic E: Chat Refinement

**Goal:** Add a cuttable, P1-only chat layer that accumulates refinement instructions on top of saved-design lineage and produces sequential iterations.
**Slices covered:** Slice 7 (reference `structured-outline.md` Part 2 Slice 7 for implementation detail)
**Depends on:** Epic D (from `structured-outline.md` Part 9 dependency table)
**Estimated duration:** [data not provided]
**Owner:** Solo developer (project owner)

### User Stories

**US-E-1: Refine a saved design through chat**
As the nail technician,
I want to type instructions like "make it more pastel" or "add gold accents,"
so that I can iteratively steer a saved design without rebuilding the reference set from scratch.

Acceptance criteria:
- **Given** a saved design exists with stable lineage, **when** I submit a first refinement message, **then** the app records the turn and triggers a new generation linked to that design.
- **Given** a prior refinement already exists, **when** I submit a second message, **then** the app accumulates prior instructions instead of accidentally replacing the earlier refinement context.
- **Given** I submit an empty or invalid message, **when** the chat route processes it, **then** the app rejects the turn cleanly and does not create ambiguous chat or generation state.

**US-E-2: Understand iteration sequence**
As the nail technician,
I want clear iteration history around chat-driven generations,
so that I know which result is current and what changed across turns.

Acceptance criteria:
- **Given** multiple refinement turns exist on one design, **when** I view the chat panel, **then** I can see the ordered turn history tied to the current iteration state.
- **Given** generation fails after a turn is persisted, **when** the result returns, **then** the app makes the failed state understandable instead of leaving an orphaned turn with no visible status.
- **Given** chat is not shipped in v1 due to schedule pressure, **when** the product is evaluated for P0 release, **then** the absence of this epic does not block the save/reopen/regenerate path defined by the P0 ship line.

### Scope

- IN: `chat_turns` persistence, turn accumulation logic, chat route, chat panel, turn history, optional iteration timeline, and chat-driven regeneration sequencing.
- IN: Clear separation between P1 refinement behavior and the already-shippable P0 design lifecycle.
- OUT (handled by another epic): P0 save/reopen/regenerate remains in Epic D and must not be reshaped by chat requirements.
- OUT (handled by another epic): Release polish and tablet hardening remain in Epic F.
- OUT (v2+): Any broader conversational assistant behavior, multi-design history search, or autonomous recommendation features beyond simple refinement turns.
- OUT (v2+): Any generalized AI co-pilot scope beyond explicit user-entered refinement messages.

### Functional Requirements

- FR-E-1: The app must persist chat turns as ordered records tied to a design and resulting generation.
Reference build detail: `structured-outline.md` Part 2 Slice 7 and `horizontal-plan.md` Persistence `chat_turns`.

- FR-E-2: The chat layer must accumulate prior refinement instructions into subsequent generation prompts.
Reference build detail: `structured-outline.md` Part 2 Slice 7 and `horizontal-plan.md` Core Domain P1 Chat Refinement.

- FR-E-3: Each successful chat turn must produce a new generation linked back to the design lineage.
Reference build detail: `structured-outline.md` Part 2 Slice 7 and Part 9 Handoff Points.

- FR-E-4: The chat UI must keep the current iteration and prior turn order understandable.
Reference build detail: `structured-outline.md` Part 2 Slice 7 and `vertical-plan.md` Slice 7 WHAT WORKS.

- FR-E-5: This epic must remain cuttable without destabilizing the P0 contracts.
Reference build detail: `structured-outline.md` Part 8 decision #2, decision #10, and decision #14.

- FR-E-6: Failed chat-driven generations must keep turn state understandable so the user can tell whether the message was persisted, acted on, or requires retry.
Reference build detail: `structured-outline.md` Part 2 Slice 7 Validation.

### Non-Functional Requirements

- Performance: Chat-triggered generation inherits the same generation latency expectations and therefore needs clear iteration progress feedback. Source: `structured-outline.md` Part 3b Performance Implications.
- Security: Chat turns and resulting generations remain user-scoped under the same auth and Security Rules model as saved designs. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: The panel must be understandable on a landscape-first tablet and must not create confusion about which image is current. Source: `structured-outline.md` Part 2 Slice 7 Validation and `horizontal-plan.md` P1 Chat Flow.
- Reliability: Empty messages, turn-order corruption, generation failure after turn persistence, and prompt accumulation sprawl must be handled explicitly. Source: `structured-outline.md` Part 2 Slice 7 and Part 3b Error Handling Strategy.

**Epic E source anchor note:**
This epic is intentionally not the definition of product completeness.
Its job is to improve iteration if schedule allows, while remaining isolated enough that cutting it preserves the full P0 bridge from Pinterest inspiration to saved, regenerable hand preview.
Source: `sign-off.md` decisions #2 and #14 and `vertical-plan.md` Slice 7 label `[P1, stretch]`.

### Acceptance at Epic Completion

Epic E is complete when a saved design can accept a refinement turn, produce a new generation, accept a second turn that builds on the first, and show turn-linked iteration state clearly enough that the user understands which result is current. This maps directly to the vertical plan's Slice 7 WHAT WORKS statement: submit a refinement such as "make it more pastel," generate a new iteration, then submit another turn such as "add gold accents" and get the next result in sequence. Epic completion is verified by chat accumulation unit tests and the chat refinement Playwright happy path referenced in `structured-outline.md` Part 2 Slice 7 and Part 3 Verification Plan.

### Dependencies

- External: Same provider and storage dependencies as generation; no new external service beyond what Epic C and Epic D already use.
- Internal: Epic D must have delivered trustworthy saved-design lineage and regenerate behavior before chat can layer on top of it. Source: `structured-outline.md` Part 9 dependency table and handoff points.
- Internal: The chat route also depends on Epic C and D having preserved generation lineage cleanly enough to attach new turns to resulting generations.

### Risks Applicable

- Risk #3: Timeline pressure makes this the first major cut candidate.
- Risk #4: Contract drift can rework saved-design semantics if chat leaks backward into P0 flows.
- Risk #9: Chat refinement scope can sprawl and steal polish time.
- Risk #12: If lineage is incomplete, chat-driven regenerate behavior loses trust.
- Risk #14: Iterative waiting can feel broken without clear progress state.

### Open Items for This Epic

- Exact duration estimate is not present in the inputs. `[data not provided]`
- Whether Epic E ships in the 2026-05-10 build depends on earlier P0 progress and preserved polish budget rather than a fixed commitment.

## Epic F: Polish + Tablet UX

**Goal:** Harden the real shipping path for the Mother's Day demo so the tablet-first experience, loading states, error handling, and supporting docs all feel intentional and maintainable.
**Slices covered:** Slice 8 (reference `structured-outline.md` Part 2 Slice 8 for implementation detail)
**Depends on:** Epic D minimum; Epic E only if shipped (from `structured-outline.md` Part 9 dependency table)
**Estimated duration:** [data not provided]
**Owner:** Solo developer (project owner)

### User Stories

**US-F-1: Use the full demo flow on a tablet**
As the nail technician,
I want the app to feel intentional on a landscape tablet,
so that it works in real consultation moments and not just in a desktop dev environment.

Acceptance criteria:
- **Given** the P0 product path is implemented, **when** I run through login, browse, reference assembly, generation, visualizer, save, reopen, and regenerate on a landscape tablet, **then** the flow feels coherent and touch-friendly from start to finish.
- **Given** I use the app on a phone, **when** I run the same path, **then** the app remains usable even if it is not equally tuned.
- **Given** a route or component still overflows, clips, or uses touch targets that are too small, **when** the tablet smoke path runs, **then** the epic is not accepted as complete.

**US-F-2: Recover cleanly from common failures**
As the nail technician,
I want clear loading and error states across Pinterest and generation flows,
so that delays or failures do not make the app feel broken during consultations.

Acceptance criteria:
- **Given** Pinterest browse, generation, or library content is loading, **when** the relevant screen renders, **then** the UI presents polished placeholders or pending states rather than blank or jarring transitions.
- **Given** a common failure such as missing or revoked Pinterest token, provider refusal, rate limit, or missing saved design occurs, **when** the app surfaces the problem, **then** it provides a clear message and a recovery action instead of a generic error.
- **Given** earlier epics leave unresolved rough edges, **when** the final polish pass runs, **then** the work must harden the real shipping path rather than expanding scope or adding new product capability.

**US-F-3: Leave behind maintainable project documentation**
As the project owner,
I want setup and architecture docs that reflect the real v1 system seams,
so that the project remains understandable and maintainable after the gift handoff.

Acceptance criteria:
- **Given** a fresh environment, **when** a maintainer follows the setup docs, **then** the docs cover required env vars, user-owned prerequisites, Firebase setup, and the core P0 flow surfaces.
- **Given** Pinterest or Gemini integration behavior needs review later, **when** the maintainer reads the integration docs, **then** static-token requirements, retry behavior, provider assumptions, and failure handling are documented.
- **Given** implementation drift has occurred from the planning assumptions, **when** architecture docs are produced, **then** they describe the final v1 seams and not an obsolete aspirational design.

### Scope

- IN: Landscape-first tablet tuning, touch-target review, polished skeletons and pending states, centralized error surfaces, full P0 E2E verification, tablet smoke verification, README/setup docs, architecture notes, Pinterest integration docs, and Gemini integration docs.
- IN: Final wording and recovery-action consistency across the real user path.
- IN: Maintenance-oriented documentation that makes the signed-off seams legible after implementation.
- OUT (handled by another epic): No new core product capability; this epic hardens and documents the path built by Epics A through D and optionally E.
- OUT (v2+): Broader certification work such as wide browser matrices, performance benchmarking, accessibility certification, or dedicated presentation mode.
- OUT (v2+): Any late-stage feature additions justified as "polish" but actually expanding scope are excluded from this epic.

### Functional Requirements

- FR-F-1: The shipping path must remain coherent in landscape-first tablet use without requiring a separate presentation mode.
Reference build detail: `structured-outline.md` Part 2 Slice 8 and `kickoff-decisions.md` #9 and #10.

- FR-F-2: Existing P0 interfaces must present polished loading, pending, and recovery states across common failure scenarios.
Reference build detail: `structured-outline.md` Part 2 Slice 8 and Part 3b Error Handling Strategy.

- FR-F-3: The full P0 path must be exercised by end-to-end verification and a manual tablet walkthrough.
Reference build detail: `structured-outline.md` Part 3 Verification Plan and `vertical-plan.md` Slice 8 WHAT WORKS.

- FR-F-4: Project documentation must cover setup, prerequisites, env vars, static-token usage, provider assumptions, and the final v1 system seams.
Reference build detail: `structured-outline.md` Part 3b Documentation Impact and Part 2 Slice 8.

- FR-F-5: Epic F must not add new product scope; it hardens what already ships.
Reference build detail: `structured-outline.md` Part 2 Slice 8 Interfaces and Part 8 decision #10.

- FR-F-6: Documentation must treat user-owned prerequisites as real blockers and describe them accordingly rather than implying they are optional.
Reference build detail: `kickoff-decisions.md` User-Action Prerequisites and `structured-outline.md` Part 3b Documentation Impact.

### Non-Functional Requirements

- Performance: The key requirement is perceived quality under generation latency and variable tablet networks, not throughput or load-scale tuning. Source: `structured-outline.md` Part 3b Performance Implications.
- Security: Final hardening must preserve the same narrow public-route exceptions and server-side secret handling already defined earlier. Source: `structured-outline.md` Part 3b Security Considerations.
- UX: Landscape-first, touch-friendly, consultation-ready, polished pending states, and coherent failure wording are mandatory product qualities. Source: `kickoff-decisions.md` #8, #9, #10, `design-discussion.md` Section 2, and `structured-outline.md` Part 2 Slice 8.
- Reliability: This epic must catch brittle tests, lingering tablet overflows, inconsistent loading language, and incomplete recovery messaging before release. Source: `structured-outline.md` Part 2 Slice 8 Validation.

**Epic F source anchor note:**
Because the success metric is emotional and experiential, polish is not cosmetic overhead here.
It is part of the definition of "working."
That is why the structured outline protects Slice 8 even when schedule pressure threatens stretch scope.
Source: `product-discovery-brief.md` Success Metrics, `product-brief.md` Constraints, and `sign-off.md` decision #10.

### Acceptance at Epic Completion

Epic F is complete when the full P0 flow can be run end to end in landscape tablet mode with intentional loading states, clear recovery guidance for common failures, and documentation sufficient to reproduce and maintain the system. This corresponds to the vertical plan's Slice 8 WHAT WORKS statement: the landscape-first tablet flow feels intentional, loading states and failures are polished, and the end-to-end suite passes across the core demo path. Epic completion is confirmed by `tests/e2e/core-flow.spec.ts`, `tests/e2e/tablet-smoke.spec.ts`, the full Playwright suite rerun, and a manual tablet walkthrough as defined in `structured-outline.md` Part 2 Slice 8 and Part 3 Verification Plan.

### Dependencies

- External: Real tablet device access for manual review, plus all already-required service dependencies from earlier epics.
- Internal: Epic D must have delivered the actual shipping path; Epic E only enters the polish surface if it is already included. Source: `structured-outline.md` Part 9 dependency table and handoff points.

### Risks Applicable

- Risk #3: Timeline compression threatens polish time directly.
- Risk #5: Visualizer may still feel cheap without deliberate final review.
- Risk #7: Tablet ergonomics can remain unsettled if checked too late.
- Risk #8: Image-delivery performance issues may still surface here.
- Risk #9: P1 chat can steal the polish budget if not cut quickly.
- Risk #14: AI latency can make the product feel broken if pending and failure states are not productized.

### Open Items for This Epic

- Exact duration estimate is not present in the inputs. `[data not provided]`
- Whether Epic E is included in the polish surface depends on release timing and preserved budget rather than a locked commitment. `[data not provided]`

## Part 3: Cross-Epic Requirements

**Shared data model:**
The shared data model is defined in `structured-outline.md` Part 2 Slice 0 through Slice 7 and summarized horizontally in `horizontal-plan.md` Persistence.
This PRD references that model rather than restating implementation detail exhaustively.

**Collection-by-collection responsibility split:**
- `profiles`: Extends Firebase Auth with durable app identity fields. Epic A establishes the collection and auth linkage.
- `references`: Normalizes both Pinterest-derived and uploaded images into one source-agnostic record shape. Epic C is responsible for activating this contract.
- `designs`: Holds the durable design entity including primary reference, prompt, shape, and the current latest-generation linkage. Epic C creates the initial draft behavior; Epic D finishes the save/reopen/regenerate semantics.
- `generations`: Stores every generation attempt with request payload, result path, response metadata, status, and failure state. Epic C activates the lifecycle; Epic D depends on it for regenerate and history trust.
- `design_secondary_references`: Preserves ordered non-primary references as a subcollection or ordered array under `designs`. Epic C owns the rule that one primary exists while ordered secondary cues remain durable.
- `chat_turns`: Stores ordered refinement turns linked to a design and generation lineage. Epic E owns this table and keeps it isolated from P0 requirements.

**Storage-bucket split:**
- `references` bucket stores uploaded photos and cached Pinterest images.
- `generations` bucket stores provider output images.
Implementation detail remains in `structured-outline.md` Part 2 Slice 3 through Slice 7 and Part 3b Migration Plan.

**Shared conventions:**
- Firestore rules and indexes live under `firestore.rules` and `firestore.indexes.json`.
- Shared types live under `lib/types.ts`.
- Auth helpers live under `lib/firebase/` and `middleware.ts`.
- Pinterest logic lives under `lib/pinterest/`.
- Generation provider logic lives under `lib/ai/`.
- Reference normalization logic lives under `lib/references/`.
- Design lifecycle orchestration lives under `lib/designs/`.
- Required env vars are `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, Firebase config vars, `APP_URL`, and `ALLOWED_EMAIL`.
- Nail shape enum is exactly `almond`, `coffin`, `square`, `stiletto`.
Source: `structured-outline.md` Part 9 Shared State Conventions.

**Cross-epic integration contracts:**
- Epic A outputs working login, protected shell, env validation, baseline Firebase rules/index setup, and test harness; Epic B cannot start without that baseline.
- Epic B outputs token-backed Pinterest browse plus board/pin browsing; Epic C consumes usable pins from that integration.
- Epic C outputs normalized references, durable design drafts, generation orchestration, and persisted generation outputs; Epic D consumes that data to make visualizer, library, and regenerate meaningful.
- Epic D outputs trustworthy saved-design lineage and regenerate behavior; Epic E can only start once that lineage is stable.
- Epic F hardens the actual shipping path rather than inventing a parallel one; it depends on the real outputs from Epic D and optionally Epic E.
Source: `structured-outline.md` Part 9 Handoff Points Between Epics and Part 6 Handoff Dependencies.

**Error-handling contract across epics:**
- Auth failures redirect to login or reject clearly.
- Pinterest token and browse failures offer reconnect or replace-token guidance without losing browse-state clarity.
- Reference-ingestion failures must not silently create unusable references.
- Generation failures must classify refusal, rate-limit, network, and unknown states; one silent retry is allowed before an adjust-inputs surface.
- Regenerate and chat failures must preserve trust in saved-design lineage and avoid orphaned states.
Source: `structured-outline.md` Part 3b Error Handling Strategy.

**Migration and rollback contract across epics:**
- Firestore rules, indexes, and converters are applied in slice order.
- The expected sequence is baseline `profiles`, then `references`, then `designs` / `generations`, then ordered secondary references, and `chat_turns` if chat ships.
- Schema changes should remain additive where possible to reduce rollback pain in the short schedule.
- Application rollback primarily relies on Vercel deploy rollback, with provider bugs isolated behind the generation boundary and visual regressions isolated behind the visualizer boundary.
Source: `structured-outline.md` Part 3b Migration Plan and Rollback Plan.

**Verification contract across epics:**
- Unit tests cover allowlist logic, request builders, retry logic, reference transforms, shape state, and chat accumulation where applicable.
- Mocked integration tests cover Pinterest and Firebase AI Logic boundaries.
- Firebase integration tests cover Security Rules, storage interactions, and save/reload/regenerate semantics.
- Playwright covers auth, Pinterest browse, reference assembly, generation, shape switching, save/reload/regenerate, optional chat, and final core-flow smoke.
- Manual tablet review remains mandatory because tablet ergonomics are a product requirement, not just responsive cleanup.
Source: `structured-outline.md` Part 3 Verification Plan and `horizontal-plan.md` Testing Infrastructure.

**Single-user architecture contract:**
V1 promises a single active user and no sign-up flow.
That simplicity must not mutate into schema shortcuts that block later growth.
The preserved future-facing contract is:
durable docs keep `userId`,
Security Rules stay enabled,
allowlist logic is isolated from the persistence model,
and provider and renderer boundaries remain swappable.
No v1 UI or workflow should pretend to be multi-user, but no v1 data decision should make later multi-user support disproportionately painful.
Source: `product-brief.md` Scope Boundaries, `kickoff-decisions.md` #1, and `structured-outline.md` Part 8 decision #1 plus Part 9 Coordination Rules.

**Shared assumptions that release planning must keep visible:**
- Pinterest app registration is assumed to complete quickly, but the inputs do not record completion.
- Firebase auth/session helper details are not fully specified, but the planning boundary is.
- Firebase Cloud Storage performance is assumed sufficient for v1, but the inputs do not guarantee it.
- Gemini quality is explicitly risky rather than assumed.
- The visualizer can reach the stylized-but-recognizable bar without custom illustration beyond masks and layout, but that remains a risk rather than a certainty.
Source: `structured-outline.md` Part 7 What Assumptions Are We Making?

**Cross-epic constraints that cannot drift:**
- Do not add new persistence tables beyond the named set in the horizontal plan.
- Do not add new slices beyond Slice 0 through Slice 8.
- Do not let P1 chat reshape P0 save/reopen/regenerate contracts unless explicitly necessary.
- If scope pressure changes, reopen sign-off rather than silently mutating slice definitions.
Source: `structured-outline.md` Part 9 Coordination Rules.

## Part 4: Release Criteria

**P0 ship line:**
P0 release requires Epic A, Epic B, Epic C, Epic D, and Epic F.
This reflects the sign-off decision that P0 "done" equals Slice 6 plus Slice 8.
Every user story tied to those epics must satisfy its acceptance criteria.
Source: `sign-off.md` decision #14 and `structured-outline.md` Part 9 Epic Grouping.

**P1 stretch:**
Epic E is the only defined stretch epic in this PRD.
It ships only if the Gemini quality gate succeeds, Epics A through D are stable, and the polish budget protected by decision #10 remains intact.
If schedule compresses, Epic E is the first major cut.
Source: `sign-off.md` decisions #2 and #10, `vertical-plan.md` Moldability Notes, and `structured-outline.md` Part 8.

**Definition of Done for Mother's Day demo:**
- The primary user can log in with the allowlisted email and reach the authenticated shell.
- She can browse Pinterest boards and pins from the configured real account.
- She can select one primary reference, optionally add secondary references and/or uploads, and optionally add a prompt.
- She can generate a design and either receive a stored output or a guided recovery state.
- She can preview the result on a five-nail hand and switch shapes live.
- She can save the design, reopen it later, and regenerate from the stored inputs.
- She can run that sequence on a landscape tablet without blocking UX issues.
- The corresponding P0 Playwright coverage passes, and the manual tablet walkthrough is satisfactory.
This specifically means the primary user can execute the path represented by US-A-1 through US-D-4 and the Epic F polish stories in sequence on a tablet without error.

**Demo script outline:**
1. Start on the login screen and show that only the allowed email can enter the flow.
2. Enter with the allowed email and land in the authenticated shell.
3. Open Pinterest integration, confirm token-backed ready state, then browse boards.
4. Open a board and show the pin grid.
5. Choose one pin as the primary reference and add one or more secondary pins or uploaded images.
6. Add an optional prompt that intentionally nudges the style, such as a color or finish change.
7. Trigger generation and narrate the pending state as intentional product behavior.
8. Show the resulting image and then the five-nail visualizer.
9. Switch between almond, coffin, square, and stiletto to prove shape persistence without regeneration.
10. Save or rename the design in the library.
11. Reopen the design from the library.
12. Regenerate from the stored inputs to prove the design lineage contract.
13. If Epic E shipped, optionally submit one refinement turn; if it did not, state clearly that chat is stretch and the P0 path remains complete.
This script is grounded in the vertical plan WHAT WORKS statements for Slice 0, Slice 2, Slice 3, Slice 4, Slice 5, Slice 6, and Slice 8.

**Cut-line scenarios:**
- If the Gemini spike in Slice 1 fails:
The plan pivots the provider behind the same generation boundary rather than rewriting upstream references or downstream visualizer contracts.
Epic C remains responsible for the same user-facing capability, but implementation swaps provider within the preserved boundary.
Source: `kickoff-decisions.md` #3 and `structured-outline.md` Risk #2.

- If Epic B stalls on Pinterest:
The partial fallback for demo preservation is uploads-only reference assembly for a constrained demo, but that is not considered equivalent to the promised Pinterest-centered product value.
The PRD therefore treats this as a degraded contingency rather than a full replacement for P0.
Source: `structured-outline.md` Failure Mode 2 and the product brief's Pinterest-primary scope.

- If the schedule compresses:
Cut Epic E entirely first.
Protect Epic F even if that means reducing chat depth or nonessential library niceties.
Source: `sign-off.md` decisions #2, #10, and #14 and `structured-outline.md` Part 8.

**Release gates before handoff:**
- Core Playwright suite passes.
- Auth, Pinterest, reference assembly, generation, visualizer, and library flows each have their corresponding automated coverage in place.
- Manual landscape-tablet walkthrough passes.
- README and integration docs exist and reflect the final v1 seams.
- Any unresolved blocking prerequisite status is surfaced explicitly rather than assumed complete.

**Verification mapping for the release gate:**
- Slice 0 proof comes from auth E2E and allowlist unit coverage.
- Slice 2 proof comes from mocked browse coverage plus a real-token smoke test.
- Slice 3 proof comes from reference transform, storage-write, and reference-panel flow coverage.
- Slice 4 proof comes from request-builder, retry, persistence-transition, and generation happy/error flows.
- Slice 5 proof comes from shape-switch E2E plus screenshot regression.
- Slice 6 proof comes from save/reload/regenerate E2E plus Security Rules integration tests.
- Slice 8 proof comes from the full Playwright suite and manual tablet walkthrough.
Source: `structured-outline.md` Part 3 Verification Plan.

**Release posture if partial issues remain:**
- Cosmetic issues that do not degrade the consultation flow may be tolerated only if they do not undercut the polished-gift expectation.
- Contract-breaking bugs in auth, Pinterest, reference assembly, generation, visualizer, save/reopen, or regenerate are release blockers.
- Any issue that makes the tablet flow feel broken during consultation is a release blocker even if desktop still works.
- If Epic E is included, its failures cannot destabilize the P0 path; otherwise Epic E should be cut before release.
Source: inferred directly from the signed-off P0 line, polish protection, and the narrow verification strategy in the provided inputs.

**Non-release items intentionally excluded from gating:**
- Broad browser certification.
- Load testing.
- Accessibility certification.
- Dedicated presentation mode.
- Retention automation.
- Executable fallback-provider path unless Slice 1 failed.
Source: `structured-outline.md` Part 3 What's NOT Being Verified and `vertical-plan.md` Deferred Items.

## Part 5: Sign-Off Record

This PRD inherits the locked planning constraints from `state/planning/sign-off.md`.

Reference: `state/planning/sign-off.md` for the full 14-decision record.

Compact restatement:
All 14 structured-outline decisions affirmed 2026-04-17.

Those affirmed decisions include:
- Single-user allowlist via `ALLOWED_EMAIL` with server-side checks and Security Rules.
- P1 chat included in baseline planning but cuttable if schedule slips.
- Gemini viability gated in Slice 1 with pivot behind the provider boundary if it fails.
- Landscape-first tablet layout.
- Per-nail variation deferred to v2.
- Saved designs treated as durable records with lineage.
- One auto-retry followed by adjust-inputs error UX.
- Pinterest as the primary browse-first source and uploads as secondary.
- Slice 8 polish protected even if Slice 7 is cut.
- User-owned prerequisites treated as actual blockers.
- Stylized-but-recognizable visual bar.
- Regenerate semantics driven by stored inputs, not transient UI state.
- P0 done defined as Slice 6 plus Slice 8.

Deviation rule:
Any deviation from these decisions during implementation requires a new sign-off cycle rather than silent drift.

Tracked gaps still present in provided inputs:
- Pinterest developer app registration completion is not recorded. `[data not provided]`
- Exact post-spike provider choice is not yet known because Slice 1 is pending. `[data not provided]`
- Exact slice duration estimates beyond the one-day Gemini spike are not present. `[data not provided]`
- Exact Firebase auth/session helper detail and some rules/index implementation details are not specified in the inputs. `[confirm Firebase SDK detail]`
