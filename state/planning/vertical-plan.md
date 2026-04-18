# Vertical Plan

## 1. Slicing Strategy

1. The slice order follows the TPM memo’s principle: foundation first, then de-risk the largest unknown, then complete the user flow from inspiration to saved design.
2. The thinnest first working increment is an authenticated empty app, because every later slice assumes protected routes, Firebase wiring, and a deployable shell.
3. The highest-risk unknown is Gemini quality, so the next increment is a deliberate spike before the production generation pipeline is built.
4. The Pinterest browse flow comes before reference ingestion because it is the main inspiration source and it exposes token-path friction early.
5. Reference collection is split out from generation so the team can validate “what goes into the prompt” separately from “how the provider responds.”
6. Raw image generation lands before the visualizer because the generated image itself is the first meaningful AI success condition.
7. The visualizer becomes its own slice because it is a distinct UX/rendering concern and the product’s main wow moment.
8. Save, browse, reopen, and regenerate stay together because they share the same persisted design contract and lifecycle semantics.
9. Chat refinement is isolated as P1 so it can be cut without destabilizing the P0 path.
10. Polish is its own final slice because the project is a gift and tablet feel is a product requirement, not incidental cleanup.
11. Total slices in the TPM memo: 9, numbered `0` through `8`.
12. First slice goal: “authenticated empty app is live.”
13. Final slice goal: “tablet landscape flow feels polished, errors are graceful, and the full E2E suite passes.”
14. Natural boundaries between slices:
15. Boundary A: authentication and scaffolding before any external integration.
16. Boundary B: Gemini viability before production generation investment.
17. Boundary C: Pinterest browsing before durable reference-set composition.
18. Boundary D: reference-set composition before provider orchestration.
19. Boundary E: provider output before visualization polish.
20. Boundary F: visualization before library/regenerate lifecycle work.
21. Boundary G: P0 completion before P1 chat refinement.
22. Boundary H: feature completion before tablet-UX polish.
23. The kickoff decisions mention “Gemini spike (Slice 0.5).”
24. The TPM memo labels that same work as `Slice 1`.
25. This plan keeps the TPM memo numbering intact and treats the kickoff note as a sequencing label discrepancy, not a second extra slice.
26. The progression from MVP to complete is therefore:
27. `Slice 0` foundation
28. `Slice 1` Gemini decision gate
29. `Slice 2` Pinterest browse
30. `Slice 3` reference collection
31. `Slice 4` AI generation
32. `Slice 5` visualizer + shapes
33. `Slice 6` library + regenerate
34. `Slice 7` chat refinement
35. `Slice 8` polish + tablet UX

## 2. Vertical Slice Plan

### Slice 0 — Foundation Scaffold

Goal: An authenticated empty app is live.

BUILDS ON: none

WHAT WORKS AFTER THIS STEP: Log in with the allowed email, land in the authenticated shell, and run a passing auth-focused baseline test path.

LAYERS TOUCHED
- Infrastructure: Vercel app scaffold, Firebase project wiring, env handling, GitHub PR checks, dev/build conventions.
- Persistence: `profiles` collection, initial Security Rules, baseline Firestore/index/rules workflow, storage/bucket scaffolding only if required by app bootstrap.
- Auth: email-link login, `ALLOWED_EMAIL` enforcement, Firebase client/admin helpers, route middleware, and no Pinterest callback exemption.
- UI Primitives: shared shell, header, canvas frame, touch-sized tokens sufficient for the empty authenticated app.
- Feature UI: `/login` page, authenticated home shell, basic dashboard placeholder.
- Testing: Vitest harness, Playwright harness, initial auth acceptance coverage.

NOT YET
- Pinterest browse.
- Pinterest boards or pins.
- Uploads.
- Reference ingestion.
- Design creation beyond scaffolding.
- Gemini generation.
- Visualizer.
- Library.
- Regenerate.
- Chat refinement.

VERIFIED BY
- Playwright auth test.
- Vitest unit test run passes.
- Vercel preview deploy is green.

COMMIT REPRESENTS: `chore: foundation scaffold + auth`

### Slice 1 — Gemini Quality Spike

Goal: Validate Gemini 2.5 Flash Image on reference-guided nail generation before committing to the production generation path.

BUILDS ON: Slice 0

WHAT WORKS AFTER THIS STEP: Upload a reference image plus optional text on a throwaway spike page, submit, inspect Gemini output, and make a go/no-go provider decision.

LAYERS TOUCHED
- Infrastructure: Firebase AI Logic availability in runtime env.
- Core Domain: minimal prompt builder only for spike evaluation.
- API / Server Actions: minimal spike-only invocation path if needed by the page.
- Feature UI: throwaway `/spike/gemini` page for manual upload-and-generate review.
- Testing: manual quality review workflow over at least five reference types.

NOT YET
- Persistence of spike outputs.
- Production `generations` flow.
- Saved-design linkage.
- Retry policy in full domain flow.
- Reference-set builder with Pinterest and uploads together.
- Visualizer.
- Library.
- Chat.

VERIFIED BY
- Manual quality review across 5+ reference types.
- Explicit provider decision recorded from spike outcome.

COMMIT REPRESENTS: `spike: Firebase AI Logic reference-guided nail generation — DECIDE`

### Slice 2 — Pinterest Browse

Goal: Use the static Pinterest token and browse boards and pins.

BUILDS ON: Slice 0

WHAT WORKS AFTER THIS STEP: See boards, open one board, and view its pin grid using the configured static Pinterest token.

LAYERS TOUCHED
- Infrastructure: env-based Pinterest token setup and preview/dev testing surfaces.
- Persistence: `references` collection may be scaffolded but is not yet functionally used.
- Auth: normal authenticated-route protection remains; no callback-route exception is needed.
- External Integrations: static bearer-token handling, boards fetch, board pins fetch.
- API / Server Actions: `/api/pinterest/boards`, `/api/pinterest/boards/[id]/pins`.
- Feature UI: Pinterest ready-state UI, board browser grid, pin browser grid.
- Testing: Playwright mocked browse flow and real-token smoke test.

NOT YET
- Pin selection into a reference set.
- Upload ingestion.
- Primary vs secondary selection semantics.
- Design creation.
- Generation.
- Visualizer.
- Library.
- Chat.

VERIFIED BY
- Playwright with Pinterest API mocked.
- Manual smoke with the configured static token.

COMMIT REPRESENTS: `feat: Pinterest static-token browse`

### Slice 3 — Reference Collection

Goal: Build a reference set from Pinterest pins and uploaded images.

BUILDS ON: Slice 2

WHAT WORKS AFTER THIS STEP: Choose one primary Pinterest pin, add secondary pins and/or uploads, and see the assembled reference panel in the app.

LAYERS TOUCHED
- Persistence: `references` collection fully active, `references` storage bucket active, `design_secondary_references` may be needed as a subcollection or ordered array if designs are created at this stage.
- External Integrations: Pinterest image fetch/cache path now used for selected pins.
- Core Domain: `ingestPinterestPin(pinId)`, `ingestUpload(file)`, reference set builder, primary/secondary ordering rules.
- API / Server Actions: `selectPinterestPin(pinId)`, `uploadReference(file)`, `createDesign(input)` if the reference set is persisted as a design immediately.
- Feature UI: primary/secondary pin selection affordances, upload tile, reference set panel, optional prompt input with override helper.
- Testing: reference transform tests, Firebase integration coverage for Security Rules/storage, Playwright pick-and-build flow.

NOT YET
- Provider generation call.
- Raw generated image preview.
- Visualizer.
- Library viewing.
- Regenerate.
- Chat.

VERIFIED BY
- Vitest reference transform tests.
- Firebase integration test covering Security Rules plus storage.
- Playwright reference pick/build flow.

COMMIT REPRESENTS: `feat: reference collection (Pinterest pins + uploads)`

### Slice 4 — AI Generation Pipeline

Goal: Generate a nail design image from the assembled reference set plus optional text.

BUILDS ON: Slice 3 and the provider decision from Slice 1

WHAT WORKS AFTER THIS STEP: Press generate, wait through a polished pending state, and receive a stored generated nail-design image or a guided error state.

LAYERS TOUCHED
- Persistence: `generations` collection active, `generations` storage bucket active, `designs.latest_generation_id` linkage begins mattering.
- External Integrations: production Firebase AI Logic request assembly, transient-error retry once, refusal/rate-limit/network classification.
- Core Domain: `generateDesign(referenceSetId, promptText, nailShape)` orchestration, pending/success/failure status updates, result storage.
- API / Server Actions: generation-triggering action via `createDesign(input)` and/or `regenerateDesign(designId)` surface as needed for the initial run.
- Feature UI: generate button, progress state, error surface, raw image preview.
- Testing: MSW-mocked Gemini success/failure coverage, retry logic tests, Playwright happy/error paths.

NOT YET
- Five-nail visualizer.
- Shape-aware rendering polish beyond carrying the chosen shape through the design record.
- Library browsing.
- Saved-design reopen flow.
- Chat refinement.

VERIFIED BY
- MSW-backed Vitest coverage for Gemini request/response handling.
- One-retry logic test.
- Playwright generation happy path.
- Playwright generation error-state path.

COMMIT REPRESENTS: `feat: AI generation pipeline`

### Slice 5 — Visualizer + Shape Selector

Goal: Render the generated design onto a five-nail hand with live shape switching.

BUILDS ON: Slice 4

WHAT WORKS AFTER THIS STEP: View the generated image mapped across five nails and switch between almond, coffin, square, and stiletto live.

LAYERS TOUCHED
- UI Primitives: shape-mask SVG assets or equivalent primitive rendering assets for the four supported shapes.
- Feature UI: `NailVisualizer`, shape selector tab bar, hand layout, texture/mask mapping behavior, generation result viewer upgraded from raw preview to visualized preview.
- Persistence: `designs.nail_shape` is now visibly exercised as part of the saved design model.
- Testing: Playwright shape-switch path and screenshot snapshots for each shape.

NOT YET
- Design library browsing UI.
- Saved-design reopening.
- Regenerate from the library.
- Chat refinement.

VERIFIED BY
- Playwright shape-switch test.
- Playwright visual regression snapshots per shape.

COMMIT REPRESENTS: `feat: 2D nail visualizer + shape selector`

### Slice 6 — Design Library + Regenerate

Goal: Save, browse, reopen, and regenerate persisted designs.

BUILDS ON: Slice 5

WHAT WORKS AFTER THIS STEP: A generated design can be named, revisited later, reopened into the visualizer, and regenerated from the same stored inputs to create a new latest result.

LAYERS TOUCHED
- Persistence: durable design naming, `latest_generation_id` linkage, stable saved input set for regenerate behavior.
- Core Domain: save/reload/regenerate lifecycle behavior now fully active.
- API / Server Actions: `saveDesign(designId, name?)`, `regenerateDesign(designId)`.
- Feature UI: design library grid, saved design viewer, inline naming, regenerate button.
- Testing: Security Rules integration for saved assets, Playwright save-reload-regenerate flow.

NOT YET
- Chat refinement.
- Dedicated final-polish pass across all error states and tablet ergonomics.

VERIFIED BY
- Playwright save-reload-regenerate flow.
- Security Rules-focused integration test.

COMMIT REPRESENTS: `feat: design library + regenerate`

### Slice 7 — Chat Refinement [P1, stretch]

Goal: Refine a design through multi-turn chat-driven regeneration.

BUILDS ON: Slice 6

WHAT WORKS AFTER THIS STEP: Submit a refinement such as “make it more pastel,” generate a new iteration, then submit a second turn such as “add gold accents” and get the next result in sequence.

LAYERS TOUCHED
- Persistence: `chat_turns` table becomes active.
- Core Domain: conversation-aware prompt accumulation over prior turns plus generation linkage.
- API / Server Actions: `sendChatTurn(designId, message)`.
- Feature UI: chat panel, turn history, text input, iteration progress state.
- Testing: unit tests for turn accumulation and Playwright happy-path iteration flow.

NOT YET
- Nothing else in MVP; this is the last feature slice.

VERIFIED BY
- Playwright chat happy path.
- Turn accumulation unit tests.

COMMIT REPRESENTS: `feat: chat refinement (P1)`

### Slice 8 — Polish + Tablet UX

Goal: Reach a confident Mother’s Day demo state with polished tablet-first behavior and graceful failure handling.

BUILDS ON: Slice 6 for P0-only shipping, or Slice 7 if chat is included

WHAT WORKS AFTER THIS STEP: The landscape-first tablet flow feels intentional, loading states and failures are polished, and the end-to-end suite passes across the core demo path.

LAYERS TOUCHED
- UI Primitives: transition polish, skeleton refinement, touch-target review.
- Feature UI: landscape tuning, error-state pass, consultation-friendly layout confidence.
- Testing: full Playwright suite run, manual tablet walkthrough.
- Cross-layer cleanup: final wiring fixes discovered by full-path execution.

NOT YET
- Nothing; this is the final slice.

VERIFIED BY
- Manual tablet walkthrough.
- Full Playwright suite green.

COMMIT REPRESENTS: `polish: tablet UX + error handling + final E2E pass`

## 3. Overlay Diagram

```text
VERTICAL SLICE OVERLAY
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
Layer / Slice              │ S0 Found. │ S1 Gemini Spike │ S2 Pinterest │ S3 References │ S4 Generate │ S5 Visualizer │ S6 Library │ S7 Chat │ S8 Polish
───────────────────────────┼───────────┼─────────────────┼──────────────┼───────────────┼─────────────┼───────────────┼────────────┼─────────┼──────────
Infrastructure             │ auth env   │ AI Logic cfg    │ token env     │ reuse          │ reuse        │ reuse          │ reuse       │ reuse    │ final fit
Persistence                │ profiles   │ [not persisted] │ [reuse]       │ references     │ generations   │ shape visible   │ saved links │ chat_turns│ harden
Auth                       │ full       │ reuse           │ reuse         │ reuse           │ reuse         │ reuse           │ reuse       │ reuse    │ audit
External: Pinterest        │ [none]     │ [none]          │ token+browse  │ ingest images   │ reuse inputs  │ [none]          │ reuse       │ [none]   │ harden
External: AI Logic         │ [none]     │ spike test      │ [none]        │ [none]          │ prod pipeline │ reuse output    │ regenerate   │ turn regen│ harden
Core Domain                │ scaffold   │ prompt sketch   │ [minimal]     │ ref builder     │ orchestrator  │ reuse           │ lifecycle    │ chat acc.│ fit/finish
API / Server Actions       │ login      │ spike entry     │ auth+boards    │ select/upload   │ generate      │ reuse           │ save/regens  │ send turn│ harden
UI Primitives              │ shell      │ reuse           │ browse states  │ upload/panel    │ pending/error │ masks/selectors │ reuse        │ reuse    │ polish
Feature UI                 │ login/home │ spike page      │ connect+browse │ ref assembly    │ raw preview   │ hand viewer     │ library      │ chat     │ tablet pass
Testing                    │ auth base  │ manual review   │ browse mocks   │ rules/storage   │ MSW+retry     │ snapshots       │ flow tests   │ turn tests│ full suite
───────────────────────────┴───────────┴─────────────────┴──────────────┴───────────────┴─────────────┴───────────────┴────────────┴─────────┴──────────
```

## 4. Deferred Items

1. Fallback provider implementation is deferred from all slices; only the boundary is preserved because the memo says “NOT built.”
2. Multi-user behavior is deferred; the schema preserves `user_id`, but no slice implements multi-tenant UI or permissions.
3. Billing, scheduling, inventory, and other product-growth features remain outside every slice because they are v2+ from discovery and product docs.
4. Per-nail variation is deferred; every slice keeps the v1 invariant of a uniform design across five nails.
5. 3D rendering is deferred; Slice 5 intentionally solves only the 2D visualizer.
6. Explicit client-presentation mode is deferred because kickoff locked it out of v1.
7. Image pruning/retention policy work is deferred because kickoff locked indefinite retention for v1.
8. A broader CDN/image-optimization layer is not assigned to any slice because the TPM memo does not require it.
9. Broad cross-browser matrix work is deferred because the verification strategy stays narrow and tablet-focused.
10. Load/performance testing is deferred; no slice claims it.
11. Accessibility certification is deferred; no slice claims it.
12. Spike-output persistence is deferred even within Slice 1 because the memo explicitly keeps the spike throwaway.
13. Final provider pivot implementation is conditionally deferred: if Slice 1 fails, the TPM memo says pivot, but the current slice plan itself still documents Gemini as the production path.
14. Any work beyond P1 chat refinement is deferred from the executable plan.

## 5. Risk by Slice

1. Slice 0 risk: auth and middleware scaffolding can sprawl if foundation work stops being “thin” and turns into a platform sprint.
2. Slice 1 risk: Gemini may produce attractive images that still do not read as usable nail designs, forcing a provider pivot.
3. Slice 2 risk: Pinterest token expiration or revocation can stall the first real inspiration flow.
4. Slice 3 risk: reference ingestion can fragment into Pinterest-vs-upload branching instead of one normalized record path.
5. Slice 4 risk: provider failures and retry rules can leave generation states inconsistent if status updates and storage writes are not coordinated.
6. Slice 5 risk: the 2D hand can technically work while still feeling visually cheap if masks or scaling look stretched.
7. Slice 6 risk: regenerate can fail semantically if the saved design record does not preserve the original reference set and prompt cleanly enough.
8. Slice 7 risk: chat refinement can sprawl because each new turn extends both prompt logic and UI state.
9. Slice 8 risk: polish time can disappear into bug triage if earlier slices leave too many rough edges or incomplete error states.
10. Cross-slice risk: the Claude-spec / Codex-implementation workflow can drift if each slice contract is not explicit and testable.
11. Cross-slice risk: the hard May 10, 2026 deadline leaves little slack for rework after Slice 4.

## 6. Moldability Notes

1. Slice 7 is the easiest slice to drop; the memo already marks it P1/stretch.
2. Slice 8 cannot be dropped entirely, but its depth can expand or contract based on schedule because it is primarily fit-and-finish work.
3. Slice 6 can shrink to the minimum saved-design reopen/regenerate flow if naming or library presentation detail becomes expensive.
4. Slice 5 should not move ahead of Slice 4 because the visualizer needs a real generated image to prove value.
5. Slice 3 should not merge backward into Slice 2 unless schedule pressure is extreme; keeping token-backed browsing separate from reference ingestion reduces debugging scope.
6. Slice 1 must stay before production AI work, regardless of whether it is called “Slice 1” or “Slice 0.5.”
7. Slice 2 can start only after the user-owned Pinterest app registration prerequisite is satisfied.
8. If Gemini quality fails in Slice 1, the overall slice order still mostly holds, but Slice 4’s provider implementation changes behind the preserved generation boundary.
9. The P0 shipping line is after Slice 6 plus Slice 8; everything else is either de-risking work before it or stretch work after it.
