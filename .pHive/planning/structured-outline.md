# Structured Outline: Nail Tech Assistant

## Part 1: Executive Summary

### What We Are Building and Why

- Nail Tech Assistant is a greenfield, single-user web app built as a Mother's Day 2026 gift for one working nail technician. (Source: product-discovery-brief; product-brief; project-profile.yaml)
- The app bridges a workflow gap between collecting inspiration and showing a concrete nail-design preview on a hand. (Source: product-discovery-brief Problem Statement; product-brief Problem)
- The end-to-end v1 promise is simple and specific: Pinterest browse, reference selection, optional prompt, AI generation, five-nail preview, shape switching, saving, and later reopen/regenerate. (Source: product-brief P0 features; design-discussion Section 1)
- The project is not framed as a startup MVP or a public product launch.
- It is framed as a polished, personal, actually usable tool for the user's wife. (Source: design-discussion Section 1)
- That framing changes planning priorities.
- Feature count matters less than the full flow feeling intentional, bug-light, and gift-worthy on a tablet. (Source: product-discovery-brief Success Metrics; design-discussion Sections 1 and 3)
- The hard constraint is calendar time.
- The project started on 2026-04-17 and targets delivery on 2026-05-10. (Source: product-discovery-brief header; product-brief header)
- That is roughly 3.5 weeks.
- Because the deadline is fixed and emotionally important, the plan optimizes for de-risking unknowns early and protecting polish time near the end. (Source: design-discussion Sections 1 and 4; vertical-plan Section 1)

### Product Goals

- Deliver a polished Mother's Day demo that the primary user can run end to end without bugs on 2026-05-10. (Source: product-discovery-brief Minimum success bar; product-brief Minimum success bar)
- Support the full P0 flow in a tablet-first web UI that also works on phone. (Source: product-brief P0 features; kickoff-decisions #9)
- Preserve the future option space for multi-user, billing, scheduling, inventory, 3D, and per-nail variation without building them now. (Source: product-discovery-brief Hard exclusions; product-brief Scope Boundaries)
- Keep the architecture small enough for one developer and compatible with the Claude-spec / Codex-implement / Claude-review workflow configured in `hive.config.yaml`. (Source: hive.config.yaml agent_routing; design-discussion Section 2)
- Reach a subjective "wow" threshold for the wife, with practical follow-on signals such as repeated use and feature requests. (Source: product-discovery-brief Success Metrics; product-brief Success Metrics)

### How User Feedback Changed or Confirmed the Approach

- The user confirmed that v1 should be single-user and gift-scoped, which removed public sign-up, multi-tenant UX, and billing from implementation scope. (Source: product-discovery-brief Key Decisions Made; product-brief Scope Boundaries)
- The user softened any notion of permanent exclusions and explicitly rejected "never" decisions, so the architecture preserves future growth paths even while v1 stays ruthlessly narrow. (Source: product-discovery-brief Hard exclusions; Session Notes pivot 2)
- The user accepted a 2D visualizer for v1 and moved 3D to a later slice, turning what could have been a rendering rabbit hole into a schedule-protection decision. (Source: product-discovery-brief Key Decisions Made; Session Notes pivot 1; design-discussion Section 2)
- The user accepted an iterative AI strategy instead of demanding the most ambitious generation workflow immediately. (Source: product-discovery-brief Key Decisions Made; Session Notes pivot 3)
- The user accepted that chat refinement is desirable but not load-bearing for the first shipping line, so the plan isolates it as Slice 7 and keeps P0 completion at Slice 6 plus Slice 8. (Source: product-discovery-brief MVP Scope; product-brief P1; vertical-plan Sections 2 and 6)
- The user resolved several design questions during kickoff that materially shaped this outline:
- Pinterest dev app registration is not yet done and is a user-owned prerequisite. (Source: kickoff-decisions #1)
- Local development no longer depends on Pinterest OAuth callbacks because the integration now uses a static token. (Source: sign-off.md #17)
- Gemini quality is still unvalidated and must be tested in a one-day spike before the production AI slice is treated as safe. (Source: kickoff-decisions #3)
- Multi-reference handling is one primary reference plus ordered secondary style cues. (Source: kickoff-decisions #4)
- Text prompt instructions can override reference visuals when they conflict. (Source: kickoff-decisions #5)
- Regeneration from a saved design is in v1, not deferred. (Source: kickoff-decisions #7)
- Error handling for Gemini is one silent auto-retry and then an explicit adjust-inputs error state. (Source: kickoff-decisions #8)
- Tablet layout should be landscape-first. (Source: kickoff-decisions #9)
- There is no separate presentation mode in v1. (Source: kickoff-decisions #10)
- Image retention is indefinite in v1. (Source: kickoff-decisions #11)
- The visual fidelity target is stylized-but-recognizable rather than photorealistic. (Source: kickoff-decisions #12)

### Key Decisions Locked

- Single-user allowlisted auth using one allowed email. (Source: product-brief P0 #1; horizontal-plan Auth)
- Pinterest remains core, but its integration path is a static access token rather than OAuth. (Source: sign-off.md #17)
- Web app only for v1, tablet-first and phone-compatible. (Source: product-discovery-brief Technical Constraints; product-brief Scope Boundaries)
- Stack is Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, Vercel, Firebase, Pinterest API v5, and Firebase AI Logic as the initial provider path to Gemini 2.5 Flash Image. (Source: product-discovery-brief Technical Constraints; project-profile.yaml; sign-off.md #15-#16)
- 2D five-nail visualization ships in v1; 3D is deferred. (Source: product-discovery-brief Key Decisions Made; product-brief P2)
- V1 uses one uniform design across all five nails; per-nail variation is deferred. (Source: product-discovery-brief Key Decisions Made; product-brief Scope Boundaries)
- Designs retain their inputs and can be regenerated later. (Source: kickoff-decisions #7; horizontal-plan Design lifecycle)
- Security Rules stay in place even in single-user mode. (Source: horizontal-plan Persistence Security Rules; design-discussion Sections 2 and 3)
- Landscape-first tablet optimization is the layout baseline. (Source: kickoff-decisions #9; horizontal-plan UI primitives)
- Chat refinement is P1/stretch, not part of the minimum P0 ship line. (Source: product-brief P1; vertical-plan Moldability Notes)

### Overall Implementation Strategy

- The implementation strategy is a thin foundation pass followed by vertical slices, not a long horizontal platform sprint. (Source: design-discussion Section 3; vertical-plan Section 1)
- Slice order is deliberate: establish the authenticated shell first, de-risk Gemini second, expose Pinterest token-path friction third, then complete the inspiration-to-saved-design flow in sequence. (Source: vertical-plan Sections 1 and 2)
- Horizontal concerns such as persistence, auth, integrations, server actions, and testing are carried slice by slice instead of being "finished" up front. (Source: horizontal-plan Layer Inventory; vertical-plan Overlay Diagram)
- The plan explicitly protects a provider boundary for generation and a renderer boundary for visualization so future provider pivots, 3D swaps, and per-nail variation remain possible without inflating v1 scope. (Source: design-discussion Section 3; horizontal-plan External Integrations and Core Domain)
- P0 shipping line is Slice 6 plus Slice 8.
- Slice 7 only ships if the Gemini spike succeeds cleanly and earlier slices do not consume the polish budget. (Source: vertical-plan Sections 2 and 6; kickoff-decisions #3)

## Part 2: Detailed Approach

## Slice 0: Foundation Scaffold

**Goal:** An authenticated empty app is live. (Source: vertical-plan Slice 0)
**Depends on:** none
**Estimated duration:** [data not provided]

### Changes

1. **`package.json`** — define the Next.js 15, React 19, TypeScript, Tailwind, shadcn/ui, Vitest, Playwright, MSW, Husky, and lint/typecheck scripts needed by the baseline scaffold. This file anchors the repo-level toolchain named in `project-profile.yaml`.
2. **`tsconfig.json`** — lock TypeScript compiler behavior for the App Router codebase and test directories. The plan needs typecheck to be a required gate from Slice 0 onward. (Source: hive.config.yaml quality_gates)
3. **`next.config.ts`** — establish the Next.js runtime surface and any image-domain handling required for later Firebase-delivered assets. This is scaffold-level now, not full image optimization policy.
4. **`tailwind.config.ts`** — define tablet-first breakpoints and any touch-size tokens implied by the horizontal plan UI foundation. (Source: horizontal-plan UI primitives)
5. **`eslint.config.js`** — provide linting required by the CI gates. (Source: project-profile.yaml code_quality; hive.config.yaml quality_gates)
6. **`.prettierrc`** — provide formatting consistency for the greenfield repo.
7. **`.env.example`** — document all required env vars: `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, Firebase client/admin config vars, `APP_URL`, `ALLOWED_EMAIL`. (Source: horizontal-plan Environment configuration)
8. **`.github/workflows/ci.yml`** — run `typecheck`, `lint`, and unit tests on PRs, matching the required gates. (Source: horizontal-plan Infrastructure; hive.config.yaml quality_gates)
9. **`.husky/pre-commit`** — enforce local quality checks aligned with the repo conventions in `project-profile.yaml`.
10. **`app/layout.tsx`** — create the root App Router layout.
11. **`app/(auth)/login/page.tsx`** — implement the single email login entry point with a sent-state UX. The route is explicitly required by the horizontal plan login flow. (Source: horizontal-plan Auth and Feature UI)
12. **`app/(authenticated)/layout.tsx`** — create the authenticated shell wrapper for protected routes.
13. **`app/(authenticated)/page.tsx`** — implement the initial dashboard placeholder with primary CTA slots for "New design" and "My designs." (Source: horizontal-plan Feature UI)
14. **`app/api/health/route.ts`** — expose the public health route named in auth middleware exceptions. (Source: horizontal-plan Auth)
15. **`middleware.ts`** — enforce auth on non-public routes while exempting `/login` and `/api/health`. (Source: horizontal-plan Auth)
16. **`lib/firebase/client.ts`** — create the browser Firebase client.
17. **`lib/firebase/server.ts`** — create the server-side Firebase Admin surface for SSR and route handlers. [confirm Firebase SDK detail]
18. **`lib/firebase/middleware.ts`** — centralize auth/session helper glue for middleware. [confirm Firebase SDK detail]
19. **`lib/auth/allowlist.ts`** — isolate the `ALLOWED_EMAIL` check so the allowlist rule is server-enforced and reusable.
20. **`lib/env.ts`** — validate runtime env presence early to avoid debugging missing-secret errors later in Pinterest or generation slices.
21. **`lib/types.ts`** — define shared types for auth/profile/nail-shape enums and early domain contracts. The project profile says structure and naming are still TBD; this file helps prevent drift early without inventing extra architectural layers.
22. **`firestore.rules`** and **`firestore.indexes.json`** — create the baseline Firestore security and index surfaces for `profiles` and later collections. (Source: horizontal-plan Persistence)
23. **`tests/unit/auth/allowlist.test.ts`** — verify that only the configured email is allowed through.
24. **`tests/e2e/auth.spec.ts`** — validate the login happy path and protected-route redirect.
25. **`playwright.config.ts`**, **`vitest.config.ts`**, and **`tests/fixtures/`** — establish the baseline harnesses that later slices extend instead of reinventing.

### Interfaces

- `assertAllowedEmail(email: string): { ok: true } | { ok: false; reason: 'not_allowed' }`
- `createBrowserFirebaseClient(): FirebaseApp`
- `createServerFirebaseAdmin(): FirebaseAdminApp | Firestore`
- `getRequiredEnv(): { APP_URL: string; ALLOWED_EMAIL: string; PINTEREST_APP_ID: string; PINTEREST_ACCESS_TOKEN: string; firebaseConfig: [confirm Firebase SDK detail] }`
- Login submit contract:
  `POST /login` server action or route handler accepts `{ email: string }`
- Login success output:
  `{ status: 'sent' }`
- Login blocked output:
  `{ status: 'rejected'; message: 'Only the configured email can sign in.' }`
- Error conditions:
  missing env vars, malformed email input, Firebase email-link send failure, session cookie misconfiguration, middleware redirect loops.

### Validation

- Verify an unauthenticated visit to `/` redirects to `/login`.
- Verify the allowed email path produces an email-link sent state.
- Verify a non-allowlisted email is rejected before any Firebase send action occurs.
- Verify the authenticated shell loads after session establishment.
- Verify `/api/health` remains public.
- Verify CI runs typecheck, lint, and unit tests on PRs.
- Verify the baseline Firestore rules/index files load cleanly in a fresh Firebase project or emulator.
- Silent-break risk:
  if `profiles.id` is not aligned with Firebase Auth `uid`, later profile access and Security Rules behavior will drift before Pinterest work even starts.

## Slice 1: Gemini Quality Spike

**Goal:** Validate Gemini 2.5 Flash Image on reference-guided nail generation before committing to the production generation path. (Source: vertical-plan Slice 1; kickoff-decisions #3)
**Depends on:** Slice 0
**Estimated duration:** 1 day spike per kickoff decision; additional exact duration [data not provided]

### Changes

1. **`app/spike/gemini/page.tsx`** — create a throwaway manual spike page that accepts an uploaded reference image, optional prompt text, and shows the generated output. This page is not the production UX. (Source: vertical-plan Slice 1)
2. **`app/api/spike/gemini/route.ts`** — expose a minimal server-side call path so Firebase AI Logic stays off the client boundary used by the spike page.
3. **`lib/ai/spike.ts`** — keep a small spike-only prompt builder and request wrapper, separate from the later production `generate.ts` contract.
4. **`tests/fixtures/spike/`** — store representative input references for manual quality review if needed. (Source: vertical-plan Slice 1 verification)
5. **`.pHive/planning/structured-outline.md`** — this document records the go/no-go gate and the fallback pivot rule rather than assuming Gemini is already proven.
6. No persistence tables are added for spike output.
7. No saved design record is created here.
8. No library, visualizer, or retry policy beyond what is needed to observe quality belongs in this slice.

### Interfaces

- `generateSpikeImage(input: { referenceImage: File | Buffer; promptText?: string }): Promise<{ status: 'success'; imageBase64: string; provider: 'gemini' } | { status: 'failure'; reason: string }>`
- `POST /api/spike/gemini`
- Input:
  multipart form data with one image plus optional prompt text
- Output on success:
  generated image payload for immediate manual inspection
- Output on failure:
  structured message describing refusal, API failure, or transport failure
- Error conditions:
  missing Firebase AI Logic configuration, unsupported file type, provider refusal, unusable image quality, rate-limit during spike, network failure.

### Validation

- Run at least five varied reference examples, because the vertical plan explicitly requires manual quality review across 5+ reference types.
- Include examples with:
  floral design,
  chrome/metallic cues,
  simple geometric cues,
  dark palette cues,
  mixed-media or layered cues.
- Check whether results read as nail-design inspiration rather than generic beauty/fashion imagery.
- Check whether the model respects optional text instructions when they conflict with the image.
- Check whether a single reference already produces something close enough to the stylized-but-recognizable bar. (Source: kickoff-decisions #12)
- Record an explicit provider decision:
  proceed with Gemini,
  or pivot Slice 4 behind the same provider boundary to FLUX.1-kontext or `gpt-image-1`. (Source: kickoff-decisions #3)
- Silent-break risk:
  pretty but semantically wrong outputs could look acceptable in a quick glance but fail the actual nail-tech use case.

## Slice 2: Pinterest Browse

**Goal:** Use the static Pinterest token and browse boards and pins. (Source: vertical-plan Slice 2)
**Depends on:** Slice 0, plus user-owned Pinterest app setup prerequisite
**Estimated duration:** 1-2 days, reduced from the earlier 3-day OAuth-shaped assumption in the TPM memo

### Changes

1. **`app/(authenticated)/pinterest/page.tsx`** — add the first authenticated Pinterest browser surface, or equivalent dashboard subview, for board and pin navigation.
2. **`app/api/pinterest/boards/route.ts`** — expose the passthrough board list endpoint named in the horizontal plan.
3. **`app/api/pinterest/boards/[id]/pins/route.ts`** — expose the board pins endpoint named in the horizontal plan.
4. **`lib/pinterest/api.ts`** — encapsulate `GET /v5/user_account/boards` and `GET /v5/boards/{board_id}/pins` using `PINTEREST_ACCESS_TOKEN`.
5. **`components/PinBrowser.tsx`** — render the pin grid browser used after opening a board. (Source: prompt-required manifest example)
6. **`components/PinterestBoardGrid.tsx`** — render board browsing using the metadata returned by the passthrough endpoints.
7. **`components/PinterestConnectButton.tsx`** — show ready-state guidance even though the app no longer performs an OAuth connect flow.
8. **`tests/unit/pinterest/api.test.ts`** — verify bearer-token request construction and error mapping.
9. **`tests/e2e/pinterest-browse.spec.ts`** — mock the browse flow and confirm boards and pins render.
10. **`tests/integration/pinterest-token-env.test.ts`** — verify token-backed requests fail clearly when env configuration is missing or invalid.

### Interfaces

- `listPinterestBoards(userId: string): Promise<PinterestBoard[]>`
- `listPinterestBoardPins(input: { userId: string; boardId: string }): Promise<PinterestPin[]>`
- `GET /api/pinterest/boards`
- Output:
  `{ boards: PinterestBoard[] }`
- `GET /api/pinterest/boards/[id]/pins`
- Output:
  `{ pins: PinterestPin[] }`
- Error conditions:
  missing `PINTEREST_ACCESS_TOKEN`, revoked or expired token, Pinterest API failure, partial board/pin payloads.

### Validation

- Verify local and Vercel surfaces can browse Pinterest using the configured static token.
- Verify Pinterest ready-state UI reflects whether token config is present.
- Verify board list renders for a real linked account.
- Verify opening a board shows pins.
- Verify mocked browse Playwright coverage and one real-token smoke test both pass.
- Silent-break risk:
  token-backed browse may appear stable until the static token expires or is revoked, leading to later failures during reference ingestion.

## Slice 3: Reference Collection

**Goal:** Build a reference set from Pinterest pins and uploaded images. (Source: vertical-plan Slice 3)
**Depends on:** Slice 2
**Estimated duration:** [data not provided]

### Changes

1. **`firestore.rules`** and **`firestore.indexes.json`** — extend collection and index coverage for `references` and ordered secondary references. (Source: horizontal-plan Persistence)
2. **`lib/firestore/converters/`** — define converters for `references` and `designs` if the repo adopts per-collection converters. [confirm Firebase SDK detail]
3. **`components/ReferencePanel.tsx`** — show one primary reference, ordered secondary references, and prompt semantics.
4. **`components/UploadZone.tsx`** — support drag/drop or picker-based photo upload. (Source: prompt-required manifest example; horizontal-plan Feature UI)
5. **`components/PromptInput.tsx`** — support optional text prompt and explain that text can override visual cues. (Source: kickoff-decisions #5)
6. **`app/(authenticated)/design/new/page.tsx`** — create the first real "new design" workspace combining Pinterest selection, upload, and prompt entry.
7. **`lib/references/ingest.ts`** — normalize Pinterest pin ingestion and direct upload ingestion into one internal record shape. (Source: prompt-required manifest example; horizontal-plan Core Domain)
8. **`lib/references/reference-set.ts`** — build one-primary, many-secondary ordered reference sets.
9. **`app/api/references/upload/route.ts`** — accept multipart uploads for new photo references.
10. **`app/api/references/pinterest/select/route.ts`** — persist selected Pinterest pins into durable reference records if the UI does not post directly through a server action.
11. **`app/api/designs/create/route.ts`** — create a draft design record that captures references, prompt, and current nail shape even before generation.
12. **`lib/firestore/converters/designs.ts`** — at minimum define the `designs` document contract if design drafts are saved at this stage. [confirm Firebase SDK detail]
13. **`tests/unit/references/reference-set.test.ts`** — verify primary/secondary ordering and prompt-override metadata behavior.
14. **`tests/integration/references-storage.test.ts`** — verify reference rows and storage paths are written under the current user.
15. **`tests/e2e/reference-assembly.spec.ts`** — verify one primary pin, optional secondary pins, uploads, and prompt entry build the expected reference panel state.

### Interfaces

- `ingestPinterestPin(input: { userId: string; pinId: string }): Promise<ReferenceRecord>`
- `ingestUpload(input: { userId: string; file: File }): Promise<ReferenceRecord>`
- `buildReferenceSet(input: { primaryReferenceId: string; secondaryReferenceIds: string[]; promptText?: string }): { primaryReferenceId: string; secondaryReferenceIds: string[]; promptText?: string }`
- `createDesign(input: { userId: string; primaryReferenceId: string; secondaryReferenceIds: string[]; promptText?: string; nailShape: 'almond' | 'coffin' | 'square' | 'stiletto' }): Promise<{ designId: string }>`
- Upload route output:
  `{ reference: ReferenceRecord }`
- Pinterest select output:
  `{ reference: ReferenceRecord }`
- Design create output:
  `{ designId: string; status: 'draft_created' }`
- Error conditions:
  no primary reference selected, duplicate secondary ordering, upload storage failure, Pinterest image cache failure, invalid file type, prompt length issues, Security Rules denial.

### Validation

- Verify the UI never allows zero or multiple primary references.
- Verify secondary references preserve explicit user order.
- Verify uploaded images and Pinterest images both become docs in the same `references` collection shape.
- Verify the prompt is optional and generation can proceed later without it.
- Verify the prompt helper text communicates that text wins on conflict.
- Verify a mixed-source reference set is persisted cleanly and reloadable.
- Verify Security Rules prevent another user from reading or writing a reference doc, even though v1 is single-user by policy.
- Silent-break risk:
  Pinterest and upload paths might drift into incompatible shapes, creating branching bugs in Slice 4.

## Slice 4: AI Generation Pipeline

**Goal:** Generate a nail design image from the assembled reference set plus optional text. (Source: vertical-plan Slice 4)
**Depends on:** Slice 3 and the provider decision from Slice 1
**Estimated duration:** [data not provided]

### Changes

1. **`firestore.rules`** and **`firestore.indexes.json`** — activate the `generations` collection contract and any lookup/index support for `designs.latest_generation_id`. (Source: horizontal-plan Persistence)
2. **`lib/ai/generate.ts`** — build the production multimodal request layer, transient retry logic, error classification, and provider-boundary abstraction on top of Firebase AI Logic. (Source: prompt-required manifest example; horizontal-plan External integrations)
3. **`lib/designs/lifecycle.ts`** — orchestrate create/generate/update behavior so route handlers stay thin. (Source: prompt-required manifest example; horizontal-plan Core Domain)
4. **`app/api/designs/generate/route.ts`** — trigger the first generation for a draft design or draft input set.
5. **`components/GenerateButton.tsx`** — submit generation with a polished pending state and disabled-state logic.
6. **`components/GenerationPreview.tsx`** — show the raw generated image before the dedicated visualizer slice lands.
7. **`components/GenerationErrorState.tsx`** — show retry-adjust messaging after the one silent auto-retry is exhausted. (Source: kickoff-decisions #8)
8. **`lib/generations/errors.ts`** — normalize provider refusal, rate-limit, network, and unknown failure states for consistent UI messaging.
9. **`tests/unit/gemini/request-builder.test.ts`** — verify payload assembly for one primary reference, ordered secondary references, and optional prompt text.
10. **`tests/unit/gemini/retry.test.ts`** — verify one silent auto-retry behavior.
11. **`tests/integration/generations-persistence.test.ts`** — verify pending/success/failure rows transition correctly and the output path is stored.
12. **`tests/e2e/generation-flow.spec.ts`** — verify happy path and guided failure path.

### Interfaces

- `generateDesign(input: { designId: string }): Promise<{ status: 'success'; generationId: string; resultStoragePath: string } | { status: 'failure'; generationId: string; errorCode: 'refusal' | 'rate_limit' | 'network' | 'unknown'; message: string }>`
- `buildGeminiRequest(input: { primaryReference: ReferenceRecord; secondaryReferences: ReferenceRecord[]; promptText?: string; nailShape: NailShape }): GeminiRequestPayload`
- `persistGenerationStart(input: { designId: string; requestJson: unknown }): Promise<{ generationId: string }>`
- `persistGenerationResult(input: { generationId: string; status: 'success' | 'failure'; resultStoragePath?: string; responseMetadata?: unknown; errorMessage?: string }): Promise<void>`
- `POST /api/designs/generate`
- Input:
  `{ designId: string }`
- Output success:
  `{ status: 'success'; generationId: string; imageUrl: string }`
- Output failure:
  `{ status: 'failure'; errorCode: string; cta: 'adjust_inputs' }`
- Error conditions:
  missing provider decision, no primary reference, provider refusal, rate-limit, transient network error, output storage failure, stale design record, inconsistent generation status updates.

### Validation

- Verify a design with only a primary reference can generate.
- Verify a design with primary plus secondary references can generate.
- Verify the prompt can override reference cues and still reaches the provider call.
- Verify a transient provider error retries once automatically and then succeeds or fails deterministically.
- Verify a hard refusal surfaces the adjust-inputs guidance instead of an opaque generic error.
- Verify `generations.status` transitions do not get stuck in `pending` if output storage fails after provider success.
- Verify the latest generation linkage on the design updates after success.
- Verify the raw image preview renders from the persisted storage path.
- Silent-break risk:
  partially persisted generations can create misleading library state later if status and storage writes are not coordinated.

## Slice 5: Visualizer + Shape Selector

**Goal:** Render the generated design onto a five-nail hand with live shape switching. (Source: vertical-plan Slice 5)
**Depends on:** Slice 4
**Estimated duration:** [data not provided]

### Changes

1. **`components/NailVisualizer/NailVisualizer.tsx`** — render the five-nail hand layout that displays one generated design across all nails. (Source: prompt-required manifest example; product-brief P0 #6)
2. **`components/NailVisualizer/ShapeSelector.tsx`** — render live shape switching across almond, coffin, square, and stiletto. (Source: product-brief P0 #7)
3. **`components/NailVisualizer/shapes/almond.svg`** — add mask asset for almond.
4. **`components/NailVisualizer/shapes/coffin.svg`** — add mask asset for coffin.
5. **`components/NailVisualizer/shapes/square.svg`** — add mask asset for square.
6. **`components/NailVisualizer/shapes/stiletto.svg`** — add mask asset for stiletto.
7. **`app/(authenticated)/design/[id]/page.tsx`** — upgrade the saved design page or live workspace to show the full visualizer instead of only a raw image.
8. **`lib/designs/shape-state.ts`** — centralize nail-shape enum handling and persistence glue.
9. **`components/VisualizerFrame.tsx`** — frame the hand preview in a way that suits landscape tablet use without needing a separate presentation mode. (Source: kickoff-decisions #10)
10. **`tests/unit/designs/shape-state.test.ts`** — verify shape enum mapping and defaults.
11. **`tests/e2e/visualizer-shapes.spec.ts`** — verify switching shapes updates the rendered preview.
12. **`tests/e2e/visualizer-snapshots.spec.ts`** — capture screenshot snapshots per shape. (Source: vertical-plan Slice 5 verification; design-discussion Section 7)

### Interfaces

- `renderNailVisualizer(input: { imageUrl: string; nailShape: NailShape }): ReactElement`
- `setDesignShape(input: { designId: string; nailShape: NailShape }): Promise<void>`
- `PATCH /api/designs/[id]/shape`
- Input:
  `{ nailShape: 'almond' | 'coffin' | 'square' | 'stiletto' }`
- Output:
  `{ status: 'updated'; nailShape: NailShape }`
- UI contract:
  changing shape updates the live preview and persists the selected shape for later reopen
- Error conditions:
  missing generation image, invalid shape value, shape persistence failure, visibly stretched mask behavior, mobile overflow or clipping bugs.

### Validation

- Verify each supported shape renders without obvious clipping or distortion.
- Verify switching shape is immediate and does not trigger a new AI generation.
- Verify the selected shape persists when the design page reloads.
- Verify the generated design still reads as the same design when masked into each shape.
- Verify the hand layout works in landscape tablet view and remains usable on phone.
- Verify screenshots are stable enough to catch meaningful regressions without excessive noise.
- Silent-break risk:
  the component may technically render but still feel cheap if the scaling or hand composition looks artificial.

## Slice 6: Design Library + Regenerate

**Goal:** Save, browse, reopen, and regenerate persisted designs. (Source: vertical-plan Slice 6)
**Depends on:** Slice 5
**Estimated duration:** [data not provided]

### Changes

1. **`app/(authenticated)/library/page.tsx`** — implement the design library grid. (Source: prompt-required manifest example)
2. **`components/DesignLibrary.tsx`** — show saved design cards, thumbnails, and naming affordances.
3. **`lib/designs/lifecycle.ts`** — expand draft creation logic into full save/reload/regenerate behavior.
4. **`app/api/designs/[id]/save/route.ts`** — save or rename a design in the library.
5. **`app/api/designs/[id]/regenerate/route.ts`** — re-run generation from the stored design inputs. (Source: kickoff-decisions #7)
6. **`app/api/designs/[id]/route.ts`** — load a persisted design, including references, prompt, latest generation, and shape.
7. **`components/RegenerateButton.tsx`** — allow the user to re-run the design from saved inputs.
8. **`components/DesignNameField.tsx`** — support inline naming.
9. **`tests/integration/designs-regenerate.test.ts`** — verify stored design inputs produce a valid regenerate request and update the latest generation link.
10. **`tests/e2e/library-regenerate.spec.ts`** — verify save, reopen, rename, and regenerate end to end.
11. **`tests/integration/designs-rls.test.ts`** — verify persisted designs and generations remain user-scoped under Security Rules.

### Interfaces

- `saveDesign(input: { designId: string; name?: string }): Promise<{ status: 'saved'; designId: string; name: string | null }>`
- `loadDesign(input: { designId: string }): Promise<DesignDetail>`
- `regenerateDesign(input: { designId: string }): Promise<{ status: 'success' | 'failure'; generationId: string }>`
- `GET /api/designs/[id]`
- Output:
  `{ design: DesignDetail }`
- `POST /api/designs/[id]/save`
- Input:
  `{ name?: string }`
- Output:
  `{ status: 'saved'; designId: string }`
- `POST /api/designs/[id]/regenerate`
- Output:
  same status shape as the initial generate route, but driven from stored inputs
- Error conditions:
  missing latest generation, stale or deleted reference rows, design not found, unauthorized design access, name validation failures, mismatch between stored references and regeneration request builder.

### Validation

- Verify a generated design is visible in the library after save.
- Verify design cards render thumbnail, name, and updated-at metadata.
- Verify reopening a design restores the visualizer, the selected shape, the prompt, and the associated references.
- Verify regenerate uses the original stored inputs rather than the current transient UI state.
- Verify the `latest_generation_id` updates after regeneration while old `generations` rows remain available as history.
- Verify naming is optional and can be added later.
- Verify Security Rules protect saved designs, references, and generation rows consistently.
- Silent-break risk:
  regenerate may appear to work while actually using incomplete or mutated input lineage, breaking trust in the save/reopen model.

## Slice 7: Chat Refinement [P1, stretch]

**Goal:** Refine a design through multi-turn chat-driven regeneration. (Source: vertical-plan Slice 7)
**Depends on:** Slice 6
**Estimated duration:** [data not provided]

### Changes

1. **`firestore.rules`** and **`firestore.indexes.json`** — extend coverage for `chat_turns` if P1 ships. (Source: prompt-required manifest example; horizontal-plan Persistence)
2. **`components/ChatRefinementPanel.tsx`** — render turn history, input, and iteration state. (Source: prompt-required manifest example)
3. **`app/api/designs/[id]/chat/route.ts`** — accept a chat turn and trigger the next generation.
4. **`lib/designs/chat-refinement.ts`** — accumulate prior refinement instructions and map them into the next provider request.
5. **`lib/designs/lifecycle.ts`** — extend generation orchestration to attach generation lineage to chat turns.
6. **`tests/unit/designs/chat-accumulation.test.ts`** — verify turn ordering and prompt accumulation logic.
7. **`tests/e2e/chat-refinement.spec.ts`** — verify multi-turn refinement on one saved design.
8. **`components/IterationTimeline.tsx`** — show recent chat-driven generation results only if the P1 UI needs explicit sequence context.

### Interfaces

- `sendChatTurn(input: { designId: string; message: string }): Promise<{ status: 'success' | 'failure'; generationId?: string; chatTurnId?: string }>`
- `accumulateChatInstructions(input: { priorTurns: ChatTurn[]; nextMessage: string }): { compiledPrompt: string }`
- `POST /api/designs/[id]/chat`
- Input:
  `{ message: string }`
- Output success:
  `{ status: 'success'; chatTurnId: string; generationId: string }`
- Output failure:
  `{ status: 'failure'; message: string }`
- Error conditions:
  empty message, chat turn order corruption, generation failure after turn persistence, prompt explosion across many turns, ambiguous UI state between current result and prior result.

### Validation

- Verify a saved design accepts a first refinement such as "make it more pastel."
- Verify a second refinement can build on the first rather than replacing it accidentally.
- Verify each chat turn links to the resulting generation row.
- Verify the panel keeps iteration state clear enough that users understand which image is current.
- Verify failures do not leave orphaned chat turns without clear status.
- Silent-break risk:
  prompt accumulation can quietly sprawl into incoherent instructions, making the feature look flaky even if the plumbing is correct.

## Slice 8: Polish + Tablet UX

**Goal:** Reach a confident Mother's Day demo state with polished tablet-first behavior and graceful failure handling. (Source: vertical-plan Slice 8)
**Depends on:** Slice 6 for P0-only ship, or Slice 7 if chat ships
**Estimated duration:** [data not provided]

### Changes

1. **`app/(authenticated)/page.tsx`** — finalize dashboard messaging, empty states, and navigation emphasis for the main user flow.
2. **`components/ui/`** — refine shared primitives, skeletons, toasts, focus states, and touch targets. (Source: prompt-required manifest example; horizontal-plan UI primitives)
3. **`components/LoadingStates/`** — add polished board, pin-grid, generation, and library placeholders if they were still rough in earlier slices.
4. **`components/ErrorSurface.tsx`** — centralize graceful user-facing error treatment across Pinterest and Gemini failures.
5. **`styles/globals.css`** — tune spacing, orientation behavior, and tablet ergonomics for landscape-first use.
6. **`tests/e2e/core-flow.spec.ts`** — run the full P0 path end to end: login, Pinterest browse, reference selection, generate, visualize, save, reopen, regenerate.
7. **`tests/e2e/tablet-smoke.spec.ts`** — run landscape-tablet focused flow checks.
8. **`README.md`** — document setup, prerequisites, env vars, and Firebase/Pinterest token expectations.
9. **`docs/architecture.md`** — capture the final v1 system seams: auth, Pinterest, references, generation, visualizer, persistence.
10. **`docs/integrations/pinterest.md`** — record dev app setup and static-token requirements.
11. **`docs/integrations/gemini.md`** — record Firebase AI Logic assumptions, retry behavior, and failure handling.

### Interfaces

- No new core product capability is introduced here.
- This slice hardens existing interfaces and UX states.
- Coverage target:
  all P0 interfaces must behave consistently across happy path, common transient failure, and common user correction flows.
- Error surface contract:
  `{ title: string; message: string; recoveryAction?: { label: string; action: string } }`
- Documentation contract:
  setup docs must be sufficient for a fresh environment to reproduce the full P0 flow
- Error conditions:
  unresolved rough edges from earlier slices, brittle tests, tablet layout overflows, inconsistent loading-state language, incomplete recovery messaging.

### Validation

- Run the entire P0 flow in landscape tablet mode.
- Run the same flow on phone for "usable, not optimized" confirmation.
- Verify every common failure path has a clear message and recovery step.
- Verify the UI feels coherent without a separate presentation mode.
- Verify loading states are polished enough that AI latency feels intentional rather than broken.
- Verify documentation is complete enough for future maintenance after the gift handoff.
- Silent-break risk:
  if earlier slices leave too many rough edges, this slice turns into bug triage and consumes the polish budget the product depends on.

## Part 3: Verification Plan

### Per-Slice Verification Matrix

Slice 0 verification:
Automated: unit tests for allowlist logic; Playwright auth redirect and login sent-state flow
Manual: confirm authenticated shell loads cleanly and middleware exceptions behave as intended
Tools: Vitest, Playwright, Firebase emulator or jest-firebase mocks
Platforms: desktop Chrome for setup sanity; iPadOS Safari/Chrome for basic auth flow smoke

Slice 1 verification:
Automated: [data not provided]
Manual: quality review across at least five reference types; compare prompt-following behavior
Tools: manual spike page, provider console/log output
Platforms: desktop Chrome primarily; optional iPad smoke if reviewing on target device matters

Slice 2 verification:
Automated: mocked browse tests and board/pin passthrough handler tests
Manual: real Pinterest token browse smoke test
Tools: Vitest, Playwright, MSW, Firebase emulator or jest-firebase mocks
Platforms: desktop Chrome for browse debugging; iPadOS Chrome/Safari for browse feel

Slice 3 verification:
Automated: reference transform tests, upload path tests, storage-write integration tests, reference panel E2E
Manual: confirm primary/secondary affordances are obvious and prompt helper text is understandable
Tools: Vitest, Playwright, MSW, Firebase emulator or jest-firebase mocks
Platforms: iPadOS Chrome/Safari primary; iPhone and desktop Chrome secondary

Slice 4 verification:
Automated: request-builder tests, retry tests, generation happy/error E2E flows, persistence transition integration tests
Manual: evaluate whether generated outputs remain credible nail-design material
Tools: Vitest, Playwright, MSW, Firebase emulator or jest-firebase mocks
Platforms: desktop Chrome for debugging; iPadOS Chrome/Safari for pending/error UX review

Slice 5 verification:
Automated: shape-switch interaction tests and screenshot regression snapshots per shape
Manual: inspect visual fidelity and masking quality on tablet
Tools: Playwright, screenshot assertions
Platforms: iPadOS Chrome/Safari primary; desktop Chrome secondary

Slice 6 verification:
Automated: save/reload/regenerate E2E, design persistence integration coverage, Security Rules tests on library records
Manual: reopen a saved design and confirm it feels like the same workspace state rather than a detached gallery view
Tools: Vitest, Playwright, Firebase emulator or jest-firebase mocks
Platforms: iPadOS Chrome/Safari primary; desktop Chrome and iPhone secondary

Slice 7 verification:
Automated: turn accumulation unit tests and chat happy-path E2E
Manual: evaluate whether iteration history is understandable and whether generated refinements remain coherent
Tools: Vitest, Playwright, MSW
Platforms: iPadOS Chrome/Safari primary; desktop Chrome secondary

Slice 8 verification:
Automated: full Playwright suite, critical-path reruns, stable snapshot checks for visualizer
Manual: full tablet walkthrough, phone-usable smoke pass, failure-state wording review
Tools: Playwright, Vitest, Firebase emulator or jest-firebase mocks
Platforms: iPadOS Safari/Chrome primary; iPhone and desktop Chrome secondary

### P0 Coverage Matrix

| P0 Feature                          | Primary Test Type                                  | Tool                                                  | Slice               |
| ----------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------- |
| Single-user authentication          | E2E + unit                                         | Playwright + Vitest                                   | Slice 0             |
| Pinterest browse                    | E2E + mocked integration + manual smoke            | Playwright + MSW + manual real-token test             | Slice 2             |
| Reference capture from pins/uploads | Integration + E2E                                  | Firebase emulator or jest-firebase mocks + Playwright | Slice 3             |
| Optional text prompt                | Unit + E2E                                         | Vitest + Playwright                                   | Slice 3 and Slice 4 |
| AI-generated design                 | Unit + integration + E2E + manual quality review   | Vitest + MSW + Playwright + manual review             | Slice 4             |
| 2D nail visualizer                  | E2E + screenshot regression + manual visual review | Playwright + snapshots + manual review                | Slice 5             |
| Nail shape selection                | E2E + screenshot regression                        | Playwright                                            | Slice 5             |
| Design library                      | Integration + E2E                                  | Firebase emulator or jest-firebase mocks + Playwright | Slice 6             |
| Tablet-optimized UI                 | Manual walkthrough + E2E smoke                     | manual review + Playwright                            | Slice 8             |

### Additional Verification Notes

- Provider-output quality is partly subjective, so automated tests verify plumbing while manual review verifies usefulness. (Source: design-discussion Section 7)
- The verification plan is intentionally narrow and centered on the P0 flow, not a broad certification matrix. (Source: design-discussion Section 7)
- Visual regression is selectively worth the cost here because the shape-sensitive visualizer is a high-wow, high-regression-risk surface. (Source: design-discussion Section 7)
- Real-device tablet review matters because the product brief and kickoff decisions make tablet ergonomics a product requirement, not just responsive cleanup. (Source: product-brief P0 #9; kickoff-decisions #9)

### What's NOT Being Verified and Why

- Load testing is not in scope because no input document claims a performance or concurrency target beyond AI latency expectations, and the design discussion explicitly excludes broad load testing from the narrow verification plan. (Source: product-discovery-brief Technical Constraints; design-discussion Section 7)
- Broad cross-browser certification is not planned because the verification strategy is tablet-focused and explicitly narrow. (Source: design-discussion Section 7; vertical-plan Deferred Items)
- Full accessibility certification is not planned in v1 because no input elevates it to a required gate and the design discussion explicitly excludes certification-level accessibility verification. (Source: design-discussion Section 7; vertical-plan Deferred Items)
- Multi-user behavior is not verified because v1 is single-user by design, even though the schema preserves `user_id` for later growth. (Source: product-brief Scope Boundaries; vertical-plan Deferred Items)
- Billing, inventory, scheduling, portfolio tooling, and other deferred product-growth features are not verified because they are outside every executable slice. (Source: product-discovery-brief Deferred to v2+; vertical-plan Deferred Items)
- Dedicated presentation mode is not verified because kickoff explicitly removed it from v1. (Source: kickoff-decisions #10)
- Image pruning or retention automation is not verified because indefinite retention is the locked v1 policy. (Source: kickoff-decisions #11)
- Fallback provider implementation is not verified because only the provider boundary is preserved in v1; fallback execution is deferred unless Slice 1 fails. (Source: horizontal-plan Gemini boundary requirement; vertical-plan Deferred Items)

## Part 3b: Cross-Cutting Concerns

### Error Handling Strategy

- Pinterest token failures:
  handle missing token, revoked token, and browse failures with reconnect-or-replace-token guidance rather than generic 500s. (Source: horizontal-plan Auth and Pinterest)
- Pinterest board/pin fetch failures:
  surface retryable fetch errors in the browse UI without losing already linked status.
- Pinterest image cache failures:
  block reference selection from silently pretending a pin is usable when the durable `references` copy failed.
- Gemini refusal:
  persist the failed generation row, classify the refusal, and show the adjust-inputs CTA. (Source: kickoff-decisions #8)
- Gemini rate-limit:
  perform one silent auto-retry, then surface the same guided error state.
- Gemini network/transient failure:
  treat as retryable once, then fail explicitly.
- Gemini low-quality output:
  not every low-quality result is a transport failure; the product relies on manual review during Slice 1 and later product judgment rather than only code-level retries. (Source: kickoff-decisions #3; design-discussion Section 4)
- Firebase connection loss:
  fail mutations atomically where possible, especially around generation rows and storage writes.
- Security Rules denial or session loss:
  redirect back to login or show a re-auth-required state, not a generic application error.

### Migration Plan

- Use `firestore.rules` and `firestore.indexes.json` plus Firestore converters as the schema gate.
- Add schema support in slice order so persistence follows the same dependency logic as product slices.
- Proposed sequence from the inputs:
- baseline `profiles` rules and converters
- `references` rules and converters
- `designs` / `generations` rules and converters
- ordered secondary references under `designs`
- `chat_turns` support for P1
- Keep schema changes additive where possible to fit the greenfield schedule and reduce rollback pain. (Source: prompt-required Part 3b guidance; horizontal-plan Persistence)

### Rollback Plan

- Vercel deploy rollback is the primary application rollback mechanism. (Source: prompt-required Part 3b guidance)
- Firestore rules/indexes and converters should stay additive so the app can roll forward safely even if an earlier deploy is restored.
- Generation/provider bugs should be isolated behind the `lib/ai/generate.ts` boundary so a provider-path fix does not require broad UI rollback.
- The visualizer should remain separable from generation output so visual regressions can be reverted without ripping out saved designs.

### Performance Implications

- Gemini latency is expected to dominate end-user wait time. (Source: product-discovery-brief Technical Constraints; prompt-required Part 3b guidance)
- The product does not need sub-second generation.
- It does need a pending state polished enough that 10 to 15 second waits feel intentional rather than broken. (Source: product-discovery-brief Technical Constraints)
- Pinterest browsing performance matters because the main inspiration source is Pinterest.
- Firebase image delivery should be monitored pragmatically, but the inputs do not yet justify a separate CDN layer in v1. (Source: product-brief Open Question #5; vertical-plan Deferred Items)
- Tablet network variability should inform loading-state and retry design because the app is intended for real consultation use on a tablet, not only on desktop broadband. (Source: prompt-required Part 3b guidance; product-brief P0 #9)

### Documentation Impact

- `README.md` must cover local setup, env vars, Firebase project creation, Pinterest dev app registration, Firebase AI Logic provisioning, and token expectations.
- Architecture notes should capture the slice seams so later story execution does not drift across the Claude/Codex workflow. (Source: hive.config.yaml; design-discussion Section 2)
- Pinterest setup docs should capture static-token creation and replacement expectations.
- Gemini setup docs should capture the Firebase AI Logic path, one-retry policy, failure classification, and provider-decision gate from Slice 1.
- If chat ships, docs should also note that it is a refinement layer on top of the same design-generation pipeline rather than a parallel system.

### Security Considerations

- Single-user allowlist must be enforced server-side, not client-side. (Source: product-brief Scope Boundaries; prompt-required Part 3b guidance)
- Pinterest token state no longer belongs in the profile record; the app reads one static env token instead. (Source: sign-off.md #17)
- Security Rules must stay on even in single-user mode to avoid accidental future migration pain and to preserve secure defaults. (Source: horizontal-plan Security Rules; design-discussion Section 4)
- Storage access should follow the same user-owned path rules as row-level tables.
- Middleware exemptions should remain narrow:
  `/login`,
  `/api/health`.
- The app does not add client-side secret exposure for Pinterest or Gemini because those integrations are server-side boundaries.

### Cross-Cutting Gaps

- Exact Firebase auth/session helper detail is not supplied in the inputs. `[confirm Firebase SDK detail]`
- Exact Firebase rules/index detail beyond the baseline ownership semantics is not supplied in the inputs. `[confirm Firebase SDK detail]`
- Exact observability or logging stack is not supplied in the inputs. `[data not provided]`

## Part 4: File Change Manifest

FILES:

CREATE:

`app/`

- `app/layout.tsx` — root layout
- `app/(auth)/login/page.tsx` — email-link login
- `app/(authenticated)/layout.tsx` — authenticated shell
- `app/(authenticated)/page.tsx` — dashboard / authenticated home
- `app/(authenticated)/pinterest/page.tsx` — Pinterest browse flow shell
- `app/(authenticated)/design/new/page.tsx` — new design workspace
- `app/(authenticated)/design/[id]/page.tsx` — saved design viewer / active design workspace
- `app/(authenticated)/library/page.tsx` — design library
- `app/spike/gemini/page.tsx` — throwaway Firebase AI Logic quality spike page
- `app/api/health/route.ts` — public health endpoint
- `app/api/pinterest/boards/route.ts` — boards passthrough
- `app/api/pinterest/boards/[id]/pins/route.ts` — pins passthrough
- `app/api/references/upload/route.ts` — upload reference ingestion
- `app/api/references/pinterest/select/route.ts` — selected-pin ingestion
- `app/api/designs/create/route.ts` — draft design creation
- `app/api/designs/generate/route.ts` — initial generation trigger
- `app/api/designs/[id]/route.ts` — load persisted design
- `app/api/designs/[id]/save/route.ts` — save / rename design
- `app/api/designs/[id]/regenerate/route.ts` — regenerate from stored inputs
- `app/api/designs/[id]/shape/route.ts` — persist nail shape
- `app/api/designs/[id]/chat/route.ts` — P1 chat refinement
- `app/api/spike/gemini/route.ts` — spike-only provider invocation

`components/`

- `components/ui/` — shadcn/ui primitives and tailored wrappers
- `components/PinterestConnectButton.tsx` — connect / linked state
- `components/PinterestBoardGrid.tsx` — board browser
- `components/PinBrowser.tsx` — pin browser grid
- `components/ReferencePanel.tsx` — reference set display
- `components/UploadZone.tsx` — drag/drop and file picker
- `components/PromptInput.tsx` — optional text prompt
- `components/GenerateButton.tsx` — generation trigger
- `components/GenerationPreview.tsx` — raw generated image preview
- `components/GenerationErrorState.tsx` — guided failure UI
- `components/VisualizerFrame.tsx` — visualizer framing
- `components/DesignLibrary.tsx` — library grid
- `components/DesignNameField.tsx` — inline naming
- `components/RegenerateButton.tsx` — regenerate CTA
- `components/ChatRefinementPanel.tsx` — P1 refinement panel
- `components/IterationTimeline.tsx` — P1 refinement sequence context

`components/NailVisualizer/`

- `components/NailVisualizer/NailVisualizer.tsx` — five-nail hand layout
- `components/NailVisualizer/ShapeSelector.tsx` — shape tabs
- `components/NailVisualizer/shapes/almond.svg` — almond shape mask
- `components/NailVisualizer/shapes/coffin.svg` — coffin shape mask
- `components/NailVisualizer/shapes/square.svg` — square shape mask
- `components/NailVisualizer/shapes/stiletto.svg` — stiletto shape mask

`lib/`

- `lib/env.ts` — env validation
- `lib/types.ts` — shared domain and DTO types
- `lib/auth/allowlist.ts` — single-user email gating
- `lib/firebase/client.ts` — browser client
- `lib/firebase/server.ts` — server client / admin surface [confirm Firebase SDK detail]
- `lib/firebase/middleware.ts` — session helper glue [confirm Firebase SDK detail]
- `lib/pinterest/api.ts` — boards and pins fetching
- `lib/firestore/converters/` — collection converters [confirm Firebase SDK detail]
- `lib/references/ingest.ts` — Pinterest and upload ingestion
- `lib/references/reference-set.ts` — primary/secondary set builder
- `lib/ai/spike.ts` — spike-only provider wrapper
- `lib/ai/generate.ts` — production multimodal request builder
- `lib/generations/errors.ts` — failure classification
- `lib/designs/lifecycle.ts` — create/save/reload/regenerate orchestration
- `lib/designs/shape-state.ts` — shape handling
- `lib/designs/chat-refinement.ts` — P1 turn accumulation

`Firebase config`

- `firestore.rules` — baseline ownership and access rules
- `firestore.indexes.json` — Firestore indexes

`tests/`

- `tests/unit/auth/allowlist.test.ts`
- `tests/unit/pinterest/api.test.ts`
- `tests/unit/references/reference-set.test.ts`
- `tests/unit/gemini/request-builder.test.ts`
- `tests/unit/gemini/retry.test.ts`
- `tests/unit/designs/shape-state.test.ts`
- `tests/unit/designs/chat-accumulation.test.ts`
- `tests/integration/pinterest-token-env.test.ts`
- `tests/integration/references-storage.test.ts`
- `tests/integration/generations-persistence.test.ts`
- `tests/integration/designs-regenerate.test.ts`
- `tests/integration/designs-rls.test.ts`
- `tests/e2e/auth.spec.ts`
- `tests/e2e/pinterest-browse.spec.ts`
- `tests/e2e/reference-assembly.spec.ts`
- `tests/e2e/generation-flow.spec.ts`
- `tests/e2e/visualizer-shapes.spec.ts`
- `tests/e2e/visualizer-snapshots.spec.ts`
- `tests/e2e/library-regenerate.spec.ts`
- `tests/e2e/chat-refinement.spec.ts`
- `tests/e2e/core-flow.spec.ts`
- `tests/e2e/tablet-smoke.spec.ts`
- `tests/fixtures/` — sample images and provider responses
- `tests/fixtures/spike/` — manual spike references

`docs/`

- `docs/architecture.md` — architecture notes
- `docs/integrations/pinterest.md` — Pinterest setup and static-token notes
- `docs/integrations/gemini.md` — Firebase AI Logic setup and failure policy notes

`root config`

- `.github/workflows/ci.yml` — typecheck + lint + test on PR
- `.env.example` — required env vars
- `.prettierrc` — formatter config
- `.husky/pre-commit` — local gate hook
- `eslint.config.js` — lint config
- `middleware.ts` — route protection
- `next.config.ts` — Next.js config
- `package.json` — scripts and dependencies
- `playwright.config.ts` — E2E config
- `README.md` — setup and usage
- `tailwind.config.ts` — design tokens and breakpoints
- `tsconfig.json` — TS config
- `vitest.config.ts` — unit/integration config

MODIFY:

- none — greenfield plan according to the provided inputs

DELETE:

- none — greenfield plan according to the provided inputs

Manifest notes:

- The manifest stays within Next.js 15 App Router conventions, as required by the prompt and the project profile.
- The manifest intentionally uses file paths directly grounded in named routes, named modules, or the prompt's own required examples.
- No additional persistence tables beyond `profiles`, `references`, `designs`, `generations`, `design_secondary_references`, and `chat_turns` are introduced.
- No additional slices are introduced.

## Part 5: Risk Registry

| #   | Risk                                                                              | Severity | Likelihood | Mitigation                                                                                                                                                                                                                                                                                      | Owner                                         |
| --- | --------------------------------------------------------------------------------- | -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | Pinterest token expiration / revocation stalls real integration work              | High     | Medium     | Treat Pinterest app registration and token generation as prerequisites, not features; validate token-backed browse in Slice 2; keep one real-token smoke test early instead of waiting for full E2E.                                                                                            | User for prereq; developer for implementation |
| 2   | Gemini reference-edit quality is not good enough for nail-design output           | High     | Medium     | Enforce the Slice 1 quality gate before production AI plumbing is treated as committed; test at least five reference types; if quality fails, pivot behind the provider boundary to FLUX.1-kontext or `gpt-image-1` without changing upstream reference-set or downstream visualizer contracts. | Developer                                     |
| 3   | 3.5-week timeline collapses under integration churn                               | High     | High       | Hold the shipping line at Slice 6 plus Slice 8; treat Slice 7 as cuttable; keep Slice 0 thin; avoid speculative layers; resolve biggest unknowns early; preserve polish time instead of backloading every risk.                                                                                 | Developer                                     |
| 4   | Claude/Codex spec-implementation drift causes rework                              | High     | Medium     | Keep each slice contract explicit and testable; centralize shared type contracts in `lib/types.ts`; use the structured outline as the scope anchor; avoid stories that mix multiple external unknowns.                                                                                          | Developer + TPM workflow                      |
| 5   | 2D visualizer works technically but looks cheap                                   | High     | Medium     | Separate visualizer as its own slice; use shape-specific masks; require screenshot regression plus manual tablet review; hold the fidelity bar at stylized-but-recognizable instead of photorealism; defer 3D rather than diluting Slice 5.                                                     | Developer                                     |
| 6   | Single-user shortcuts create v2 migration pain                                    | Medium   | Medium     | Keep `userId` on durable docs; enforce Security Rules now; isolate allowlist logic from data model; avoid client-only auth assumptions; keep provider and renderer boundaries swappable.                                                                                                        | Developer                                     |
| 7   | Tablet ergonomics remain unsettled too late                                       | Medium   | Medium     | Lock landscape-first layout now; test on iPad browsers throughout, not only at the end; keep no separate presentation mode in v1 so the main workspace must stay consultation-ready.                                                                                                            | Developer                                     |
| 8   | Firebase storage performance is weaker than expected                              | Medium   | Low        | Use Firebase Cloud Storage first because the inputs do not justify a broader media layer; validate real image delivery in Slice 4-6; keep image handling isolated enough that CDN work can be added later if needed.                                                                            | Developer                                     |
| 9   | Chat refinement scope sprawls and steals polish time                              | Medium   | Medium     | Keep chat in Slice 7 only; do not let P1 schema or UI contaminate P0 slices more than necessary; cut it immediately if Slice 4-6 consume schedule buffer.                                                                                                                                       | Developer                                     |
| 10  | Reference ingestion splits into Pinterest-specific and upload-specific code paths | Medium   | Medium     | Normalize both sources through `references` plus shared ingestion contracts in Slice 3; unit test one-primary plus ordered-secondary behavior independent of source.                                                                                                                            | Developer                                     |
| 11  | Generation persistence becomes inconsistent on partial failures                   | Medium   | Medium     | Create generation row before provider call; classify failure states; store result path and status atomically where possible; test pending/success/failure transitions explicitly.                                                                                                               | Developer                                     |
| 12  | Regenerate does not truly preserve original design intent                         | Medium   | Medium     | Store primary reference, ordered secondary references, prompt text, nail shape, and generation lineage as first-class design data; verify regenerate from saved inputs in Slice 6.                                                                                                              | Developer                                     |
| 13  | User-owned prerequisites slip and block implementation                            | Medium   | Medium     | Make Pinterest registration, Firebase creation/configuration, and Vercel wiring visible blockers; document them in README and planning docs; do not pretend Slice 2 or Slice 4 can proceed without them.                                                                                        | User                                          |
| 14  | AI latency makes the product feel broken during consultations                     | Medium   | Medium     | Treat polished pending states as product work; communicate progress clearly; keep failure recovery obvious; do not over-promise generation speed the inputs do not require.                                                                                                                     | Developer                                     |

### Detailed High-Severity Mitigations

Risk 1 detail:

- Do prerequisite setup before implementation PRs depend on it.
- Keep Pinterest token handling inside `lib/pinterest/api.ts` so auth details do not sprawl through UI code.
- Validate token-backed browse immediately because browsing that only works with one local assumption is not a real integration.

Risk 2 detail:

- Slice 1 is a decision gate, not a speculative demo.
- The acceptance bar is not "pretty image."
- The acceptance bar is "stylized-but-recognizable nail design material that supports the bridge value proposition." (Source: kickoff-decisions #12)
- If Gemini fails, the provider boundary lets the plan preserve Slice 3, Slice 5, and Slice 6 almost unchanged.

Risk 3 detail:

- Do not allow Slice 0 to become a generic platform build-out.
- Do not build fallback provider execution until and unless Gemini fails.
- Protect Slice 8 polish time because the product's success metric is emotional and experiential, not just technical completeness.

Risk 4 detail:

- Use the named routes, collections, and contracts from the H/V plans as the authoritative seam map.
- Keep one document per planning task, with explicit locked decisions cited, so downstream story work cannot drift into unstated assumptions.
- Use tests as contract reinforcement rather than broad exploratory coverage.

Risk 5 detail:

- Restrict v1 to uniform design across five nails.
- Use shape assets and hand composition review rather than promising photorealistic rendering.
- Validate on target tablet orientation early.
- Prefer a convincing stylized presentation over an ambitious but brittle pseudo-3D treatment.

## Part 6: Dependency Map

### Internal Dependencies

- Slice 1 → Slice 0
  needs auth shell and runtime env scaffolding before a spike page exists
- Slice 2 → Slice 0
  needs auth, Firebase profile persistence, middleware behavior, and deployable surfaces
- Slice 3 → Slice 2
  Pinterest ingestion depends on Pinterest login and browse working first
- Slice 3 → Slice 0
  uploads and durable references still depend on auth, storage, and Security Rules baseline
- Slice 4 → Slice 3
  generation depends on a normalized reference set
- Slice 4 → Slice 1
  generation implementation assumes the provider decision gate is passed
- Slice 5 → Slice 4
  visualizer needs a real generated image and persisted shape state
- Slice 6 → Slice 5
  library viewer depends on the visualizer and stable design persistence
- Slice 6 → Slice 4
  regenerate depends on generation orchestration and generation history
- Slice 7 → Slice 6
  chat refinement depends on saved designs and regenerate behavior
- Slice 8 → Slice 6
  P0 polish assumes the full save/reopen/regenerate flow exists
- Slice 8 → Slice 7
  only if chat ships in v1

### External Dependencies

- Next.js 15 App Router
- React 19
- Tailwind CSS
- shadcn/ui
- Firebase Firestore
- Firebase Auth
- Firebase Cloud Storage
- Firebase AI Logic / `@firebase/ai`
- Pinterest API v5
- Gemini 2.5 Flash Image via Firebase AI Logic
- Vercel preview and production deploy surfaces
- Vitest
- Playwright
- MSW

### Blocking Questions Still Open

- Does Pinterest developer app registration complete same-day as expected by the user-owned prerequisite note? The kickoff decisions say "user will register today," but completion is not recorded in the provided inputs. `[data not provided]`
- Does the Gemini spike confirm provider viability? The kickoff decisions require the spike; the result is not yet in the provided inputs. `[data not provided]`
- Exact design-record schema detail beyond the named required columns was deferred to this structured outline, so downstream implementation should treat this document as the first detailed source for design lifecycle contracts. (Source: kickoff-decisions #6)

### Handoff Dependencies

- Foundation must deliver working auth, env handling, and baseline Firebase rules/index setup before Pinterest or reference work starts.
- Pinterest must deliver browse capability before mixed-source reference collection starts.
- Reference collection must deliver normalized durable references before generation orchestration starts.
- Generation must deliver persisted outputs before the visualizer can become meaningful.
- Visualizer must deliver stable saved-view rendering before the library becomes polished.
- Library/regenerate must deliver stable design lineage before chat refinement can be trusted.

## Part 7: Elicitation — Stress-Testing This Plan

### Why Won't This Work?

#### Failure Mode 1

- **Failure:** Gemini produces attractive outputs that do not read as usable nail-design previews.
- **Trigger:** The provider responds with generic beauty/fashion-style images, weak prompt adherence, or poor mapping from references to nail-specific patterns.
- **Impact:** The core inspiration-to-visualization bridge weakens; Slice 4 still "works" technically but the product fails the wow bar.
- **Signal:** Manual spike review shows repeated outputs that are semantically off-target; later generation sessions require excessive prompt babysitting; the visualizer makes results look more arbitrary, not more convincing.
- **Our answer:** This is exactly why Slice 1 exists before production AI work. The plan does not assume Gemini is already validated. If the spike fails, the provider pivot happens behind the preserved generation boundary, and the rest of the slice sequence mostly stands. (Grounding: kickoff-decisions #3; vertical-plan Slice 1; horizontal-plan Gemini boundary requirement)

#### Failure Mode 2

- **Failure:** Pinterest token setup, expiration, or revocation stalls the main inspiration flow.
- **Trigger:** App registration is delayed, the static token is missing or revoked, or the env path is misconfigured.
- **Impact:** The core user-facing source of inspiration is blocked; the app can still demo uploads, but the emotional center of "your Pinterest into a nail preview" is undermined.
- **Signal:** Browse works only in one environment; board browsing breaks once the token changes; manual smoke tests require env replacement unexpectedly often.
- **Our answer:** The plan exposes Pinterest early in Slice 2 and treats app registration plus token setup as prerequisites, not hidden tasks. The route boundary is narrow, and token-backed browse is tested in the same slice. If Pinterest drags, uploads still preserve partial progress, but the plan does not pretend that is a full replacement. (Grounding: sign-off.md #17; vertical-plan Slice 2; horizontal-plan Pinterest)

#### Failure Mode 3

- **Failure:** The Claude/Codex workflow creates specification drift, causing repeated rework or contradictory assumptions across slices.
- **Trigger:** Slice contracts are vague, route names drift from planning docs, or tests are written against assumptions not represented in implementation seams.
- **Impact:** Time is lost in review loops instead of feature progress; the hard deadline becomes much tighter by Slice 4 or Slice 5.
- **Signal:** Multiple back-and-forth review cycles on the same slice; mismatches between planning docs and implementation paths; tests fail for reasons unrelated to the actual user flow.
- **Our answer:** This outline is intentionally explicit about slices, contracts, routes, tables, and constraints. Shared contracts are centralized, and each slice is small enough to test as a coherent path. The hybrid workflow itself is baked into the planning docs and `hive.config.yaml`, so drift risk is named and contained rather than ignored. (Grounding: design-discussion Section 2 and 4; hive.config.yaml)

#### Failure Mode 4

- **Failure:** The 2D visualizer feels cheap even though generation and persistence work.
- **Trigger:** Masks stretch the design badly, the hand layout feels generic, or shape switching exposes awkward distortions.
- **Impact:** The most visible wow moment lands flat; the app can still function, but it will not feel gift-worthy.
- **Signal:** Manual tablet review says the output feels like a pasted image rather than a believable design preview; screenshot regressions are stable but still ugly; shape switching reduces confidence instead of increasing delight.
- **Our answer:** The plan isolates the visualizer as its own slice with dedicated screenshot coverage and manual visual review. The fidelity target is stylized-but-recognizable, not photorealistic, which is more realistic for the timeline. Per-nail variation and 3D are deferred specifically to protect this slice from overreach. (Grounding: kickoff-decisions #12; vertical-plan Slice 5; product-brief P2)

#### Failure Mode 5

- **Failure:** The timeline slips enough that polish time disappears into bug cleanup.
- **Trigger:** Slice 0 grows too broad, Slice 1 fails late, Slice 2 or Slice 4 hits external integration churn, or Slice 7 is treated as mandatory too early.
- **Impact:** The app may be feature-complete on paper but not polished enough for the gift handoff.
- **Signal:** Slice 4 finishes late; visualizer work starts without stable generation; unresolved error states accumulate; tablet walkthroughs happen only at the end.
- **Our answer:** The plan makes the P0 shipping line explicit at Slice 6 plus Slice 8. Chat is isolated as cuttable. Major risks are front-loaded, and tablet checks happen throughout instead of at the very end. If schedule pressure grows, the first pressure release is Slice 7 depth, not Slice 8 polish. (Grounding: vertical-plan Moldability Notes; design-discussion Section 4)

### What Assumptions Are We Making?

- **VERIFIED:** The product is single-user for v1 and only one email should be allowed to log in. (Source: product-brief P0 #1; product-discovery-brief Key Decisions Made)
- **VERIFIED:** Pinterest is the central inspiration source and must be integrated authentically. (Source: product-discovery-brief Value Proposition and Key Decisions Made; design-discussion Section 2)
- **VERIFIED:** The app is web-only in v1 and should be tablet-first but phone-compatible. (Source: product-discovery-brief Technical Constraints; product-brief Scope Boundaries)
- **VERIFIED:** Landscape is the primary tablet orientation. (Source: kickoff-decisions #9)
- **VERIFIED:** The 2D visualizer is acceptable for v1 and 3D is deferred. (Source: product-discovery-brief Session Notes; product-brief P2)
- **VERIFIED:** Per-nail variation is deferred; v1 uses one uniform design across all five nails. (Source: product-discovery-brief Key Decisions Made; product-brief Scope Boundaries)
- **VERIFIED:** Text prompt can override visual cues from references. (Source: kickoff-decisions #5)
- **VERIFIED:** Multi-reference handling is one primary reference plus ordered loose secondary style cues. (Source: kickoff-decisions #4)
- **VERIFIED:** Saved designs must support regeneration in v1. (Source: kickoff-decisions #7)
- **VERIFIED:** Gemini failure handling is one silent auto-retry followed by user-visible adjust-inputs guidance. (Source: kickoff-decisions #8)
- **VERIFIED:** No explicit presentation mode is required in v1. (Source: kickoff-decisions #10)
- **VERIFIED:** Indefinite image retention is acceptable in v1. (Source: kickoff-decisions #11)
- **VERIFIED:** Stylized-but-recognizable visual fidelity is sufficient for the hand preview. (Source: kickoff-decisions #12)
- **ASSUMED:** Pinterest app registration completes quickly enough not to materially compress Slice 2. Comfortable to proceed because the kickoff document frames it as same-day user-owned setup, but the completed status is not yet in the inputs. (Source: kickoff-decisions #1)
- **VERIFIED:** Local development no longer depends on ngrok or equivalent Pinterest OAuth callback tunneling because the integration now uses a static token. (Source: sign-off.md #17)
- **RISKY:** Gemini 2.5 Flash Image will pass the nail-design quality bar. This is specifically called out as unvalidated and can change the provider implementation plan significantly. (Source: kickoff-decisions #3)
- **ASSUMED:** Firebase Cloud Storage performance is sufficient for v1 image browsing and preview delivery. Comfortable because the inputs treat a broader CDN layer as optional and unassigned, but real behavior is not yet verified. (Source: product-brief Open Question #5; vertical-plan Deferred Items)
- **ASSUMED:** A single main workspace UI can serve both self-prep and client-facing use without a separate presentation mode. Comfortable because kickoff locked presentation mode out of v1, but this remains a UX pressure point to monitor. (Source: kickoff-decisions #10)
- **ASSUMED:** The app can remain simple in state management using App Router data flow plus local state. Comfortable because the project profile leaves state management open and no input requires a heavier store. (Source: project-profile.yaml architecture)
- **RISKY:** The visualizer can achieve enough perceived quality within the available time without custom illustration work beyond masks and layout. (Source: design-discussion Section 4; kickoff-decisions #12)
- **ASSUMED:** The normalized `references` model can serve both Pinterest and uploads cleanly. Comfortable because the horizontal plan explicitly calls for that shared shape. (Source: horizontal-plan Persistence and Core Domain)
- **ASSUMED:** The generation provider boundary is enough future-proofing for v1; no executable fallback provider path is needed unless Slice 1 fails. Comfortable because the vertical plan explicitly defers fallback implementation. (Source: horizontal-plan Gemini boundary requirement; vertical-plan Deferred Items)
- **RISKY:** The solo-developer schedule can absorb both external integrations plus visual polish before May 10, 2026. (Source: product-brief Constraints; design-discussion Section 4)

### What's the Simplest Version?

**Must have:**

- Allowlisted email login and protected routes
- Pinterest board/pin browsing via static token
- One primary reference plus optional secondary references and uploads
- Optional prompt field
- AI generation with at least one credible provider path
- Five-nail 2D visualizer
- Shape switching across four shapes
- Save, reopen, and regenerate
- Landscape-first tablet usability
- Polished enough happy path and common errors for Mother's Day demo

**Should have:**

- Clean library naming and thumbnails
- Stable visual regression coverage for the visualizer
- Good loading states for Pinterest and generation
- Narrow but reliable docs for setup and maintenance
- Real token-backed browse behavior instead of reconnect-only Pinterest behavior

**Could cut:**

- Slice 7 chat refinement in full
- Richer library presentation details if save/reopen/regenerate already works
- Extra iteration timeline UI around chat
- Any speculative provider-fallback execution work before Gemini actually fails
- Any deeper phone optimization beyond "usable"

### What Will We Wish We Had Thought Of?

- We may wish we had defined the exact `DesignDetail` DTO sooner, because save/reopen/regenerate is the main stateful seam and several slices depend on it.
- We may wish we had decided earlier how much generation history the library should expose, even if only the latest generation is surfaced in v1.
- We may wish we had documented Pinterest token replacement steps immediately after first success, because env-token failures are easy to forget once the happy path works.
- We may wish we had written clearer prompt examples for the wife, because prompt quality could influence perceived model quality even if the plumbing is sound.

### Where Are We Over-Engineering?

- The provider boundary could become over-engineered if it turns into a full strategy layer before the Gemini spike outcome is known.
- The plan should preserve a swap boundary, not a whole multi-provider orchestration framework in v1. (Grounding: horizontal-plan Gemini boundary; vertical-plan Deferred Items)
- The `chat_turns` table and associated UI are over-engineering if Slice 7 is cut; that is why they stay entirely inside the P1 slice rather than contaminating earlier migrations more than necessary. (Grounding: product-brief P1; vertical-plan Slice 7)
- Future-proofing for multi-user can become over-engineering if it creates v1 UX complexity. The correct v1 posture is `userId` plus Security Rules in the data layer, not multi-account UI or permission matrices. (Grounding: product-brief Scope Boundaries; horizontal-plan Security Rules)
- Presentation mode would be over-engineering because kickoff already rejected it for v1; the main interface itself must be good enough. (Grounding: kickoff-decisions #10)
- Deep performance benchmarking would be over-engineering relative to the current constraints; the user experience risk is mostly perceived latency and UI polish, not throughput scale. (Grounding: product-discovery-brief Technical Constraints)

## Part 8: Decision Points for Sign-Off

1. **[APPROACH]** Single-user allowlist via `ALLOWED_EMAIL` plus server-side checks and Security Rules on durable records.
   → Affirm / Change direction

2. **[SCOPE]** P1 chat refinement is included in the baseline plan as Slice 7 but is explicitly cuttable if Slice 1-6 or Slice 8 consume schedule buffer.
   → Affirm / Adjust

3. **[RISK ACCEPTANCE]** Gemini viability is gated in Slice 1; if it fails the quality bar, provider implementation pivots behind the same generation boundary.
   → Accept / Pre-commit to a specific fallback / Require additional spike criteria

4. **[TRADE-OFF]** Landscape-first tablet optimization is the primary layout target; phone remains usable, portrait is not equally tuned.
   → Affirm / Reconsider

5. **[TRADE-OFF]** Per-nail variation is deferred to v2; v1 keeps one uniform design across all five nails.
   → Affirm / Pull into v1

6. **[WORKFLOW]** Claude-spec / Codex-implement / Claude-review per slice remains the delivery workflow, with TPM validation on planning and implementation artifacts.
   → Affirm / Pause pilot

7. **[DATA MODEL]** Saved designs are draft-capable durable records that already store primary reference, secondary references, prompt, shape, and generation lineage before the final image history is complete.
   → Affirm / Simplify design persistence

8. **[ERROR UX]** Gemini failures use one silent auto-retry and then an adjust-inputs error surface rather than unlimited retry or automatic fallback switching.
   → Affirm / Adjust

9. **[PINTEREST FLOW]** Pinterest remains the main browse-first reference source, with uploads as a parallel secondary source, not the primary v1 flow.
   → Affirm / Rebalance

10. **[POLISH PROTECTION]** Slice 8 polish time is protected even if that means reducing Slice 7 depth or library niceties.
    → Affirm / Change priority

11. **[DOCS + PREREQS]** User-owned prerequisites are treated as actual blockers for implementation slices rather than assumed to be complete in the background.
    → Affirm / Change expectation

12. **[VISUAL BAR]** The preview quality bar is stylized-but-recognizable, not photorealistic.
    → Affirm / Raise bar / Lower bar

13. **[LIBRARY SEMANTICS]** Regenerate-from-saved-design must use the original stored inputs, not whatever transient UI state happens to be loaded at the time.
    → Affirm / Adjust

14. **[CUT LINE]** P0 "done" means Slice 6 plus Slice 8, even if Slice 7 never ships.
    → Affirm / Change definition of done

## Part 9: Multi-Epic Coordination

### Epic Grouping

- Epic A: Foundation + Auth
  aligns primarily to Slice 0
- Epic B: Pinterest Integration
  aligns primarily to Slice 2
- Epic C: Reference Collection + AI Generation Pipeline
  aligns primarily to Slice 3 and Slice 4
- Epic D: Visualizer + Library
  aligns primarily to Slice 5 and Slice 6
- Epic E: Chat Refinement
  aligns to Slice 7
- Epic F: Polish + Tablet UX
  aligns to Slice 8

### Cross-Epic Dependency Table

| Epic   | Depends On                                  | Why                                                                        |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------- |
| Epic A | none                                        | Establishes repo, auth, env, migrations, and shell                         |
| Epic B | Epic A                                      | Needs auth, profile persistence, middleware, and deploy surfaces           |
| Epic C | Epic A and Epic B and Slice 1 decision gate | Needs normalized auth/storage plus Pinterest browse and provider viability |
| Epic D | Epic C                                      | Needs generated outputs and stable design records                          |
| Epic E | Epic D                                      | Needs saved-design lineage and regenerate behavior                         |
| Epic F | Epic D minimum; Epic E only if shipped      | Polish must harden the real shipping path                                  |

### Shared State Conventions

- Firestore rules and indexes live under `firestore.rules` and `firestore.indexes.json`.
- Shared domain and transport types live under `lib/types.ts`.
- Auth/session helpers live under `lib/firebase/` and `middleware.ts`.
- Pinterest integration code lives under `lib/pinterest/`.
- Generation provider code lives under `lib/ai/`.
- Reference normalization code lives under `lib/references/`.
- Design lifecycle orchestration lives under `lib/designs/`.
- Env vars use the names already specified in the horizontal plan: `PINTEREST_APP_ID`, `PINTEREST_ACCESS_TOKEN`, Firebase client/admin config vars, `APP_URL`, `ALLOWED_EMAIL`.
- Nail shape enum remains exactly `almond`, `coffin`, `square`, `stiletto`.

### Handoff Points Between Epics

- Epic A must deliver:
  working login, protected shell, env validation, baseline migrations, test harness.
- Epic B can start only after:
  auth shell and profile persistence exist, and user-owned Pinterest app registration is complete.
- Epic B must deliver:
  token-backed Pinterest browse, board browsing, and pin browsing.
- Epic C can start reference ingestion only after:
  Epic B can return usable pins from the linked account and Epic A storage/auth baselines exist.
- Epic C must deliver:
  normalized references, durable design drafts, generation orchestration, and persisted generation outputs.
- Epic D can start only after:
  generated outputs are real and design rows carry stable shape and generation linkage.
- Epic D must deliver:
  convincing five-nail visualization, save/reopen/regenerate, and library browsing.
- Epic E can start only after:
  regenerate is trustworthy from stored lineage.
- Epic E must deliver:
  turn persistence, prompt accumulation, and chat-driven iteration.
- Epic F can start incrementally earlier for UI review, but final polish cannot complete until:
  the actual shipping path is stable enough to harden rather than still being under active redesign.

### Coordination Rules

- Do not add new persistence tables outside the six named in the horizontal plan.
- Do not add new slices outside Slice 0 through Slice 8.
- Do not let P1 chat requirements reshape the P0 save/reopen/regenerate contracts unless explicitly necessary.
- Treat this outline, the horizontal plan, the vertical plan, and kickoff decisions as the source-of-truth stack for story writing.
- If implementation pressure suggests changing scope, revisit Part 8 sign-off decisions instead of silently mutating slice definitions.

### Input Gaps Tracked for Downstream Work

- Exact slice duration estimates beyond the 1-day Gemini spike are not present in the provided inputs. `[data not provided]`
- Exact Firebase auth/session helper detail and some rules/index implementation details are not present in the provided inputs. `[confirm Firebase SDK detail]`
- Exact post-spike provider choice is not yet known because Slice 1 is still pending. `[data not provided]`
