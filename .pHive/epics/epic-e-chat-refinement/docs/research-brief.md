# Epic E — Chat Refinement: Research Brief

## Goal

- Epic E adds a cuttable, P1-only chat layer on top of saved-design lineage so refinement instructions accumulate into sequential iterations rather than restarting the design flow. The implementation target is Slice 7: multi-turn chat-driven regeneration layered on the saved/reopen/regenerate contract from Epic D. (prd.md L620-L623, structured-outline.md L420-L424)
- The user-facing bar is: submit a first refinement, generate a new result, submit a second refinement that builds on the first, and keep iteration state understandable without destabilizing the P0 path. (prd.md L635-L648, prd.md L691-L699, structured-outline.md L451-L459)

## Codebase Context

### Saved-design lineage (Epic D outputs Epic E layers on)

- `createDesignDraft` persists the design lineage root at `designs/{designId}` with `id`, `userId`, reference IDs, `promptText`, `nailShape`, `latestGenerationId`, and timestamps; `latestGenerationId` starts `null`. (researcher §1; researcher-raw-findings.md L7-L12)
- The `designs` converter stores the canonical persisted shape; note the on-disk `nail_shape`/`nailShape` compatibility in `fromFirestore`, which matters for any chat-turn lineage reads that join back to designs. (researcher §1; researcher-raw-findings.md L13-L28)
- `generations` already carry `designId`, `userId`, and full `requestJson`, so Epic E does not need a new lineage root; it layers turn metadata onto the existing design→generation chain. (researcher §1; researcher-raw-findings.md L29-L43)
- `persistGenerationResult` is the canonical attachment point: the Firestore transaction updates both `generations/{generationId}` and `designs/{designId}.latestGenerationId` atomically. Researcher explicitly flags that chat turns must reference both `designId` and resulting `generationId`. (researcher §1; researcher-raw-findings.md L81-L89)

### Hydration shape from GET /api/designs/[id]

- `GET /api/designs/[id]` returns `{ design, references, latestGeneration }`, where `references` includes `primary`, `secondary`, `staleReferenceCount`, and optional `primaryReferenceMissing`; `latestGeneration` is sanitized for API use. (researcher §1; researcher-raw-findings.md L45-L71)
- `loadDesignDetail` already resolves cross-user/not-found to `null`, batches reference hydration, loads `latestGeneration` from `design.latestGenerationId`, and surfaces stale-reference state. That loader is the current reopen contract Epic E must layer on rather than replace. (researcher §1; researcher-raw-findings.md L63-L71)
- Current page hydration into `Confirm.tsx` includes `designId`, `nailShape`, `promptText`, `latestGenerationId`, and `initialImageUrl`; researcher notes Epic E will need `initialChatTurns?: ChatTurn[]` added for reopen hydration. (researcher §3; researcher-raw-findings.md L173-L185)

### Firestore rules + indexes precedent

- Existing collections all use the same ownership gate: `request.auth != null && resource.data.userId == request.auth.uid`, with explicit collection matches above a deny-all fallback. `designs`, `generations`, and `references` are the precedent collections. (researcher §2; researcher-raw-findings.md L95-L104)
- `designs` client updates are deliberately narrow (`nail_shape + updatedAt` and `name + updatedAt` only); other lifecycle mutations run through Admin SDK flows. That is the pattern to preserve if `chat_turns` needs constrained client writes. (researcher §2; researcher-raw-findings.md L99-L103)
- Researcher provides the expected `chat_turns` rules shape: explicit `read`/`create` ownership checks and scoped `update/delete` rules, added above the deny-all clause. (researcher §2; researcher-raw-findings.md L106-L113)
- Existing composite indexes are `designs [userId ASC, createdAt DESC]`, `generations [designId ASC, createdAt DESC]`, and `references [userId ASC, createdAt DESC]`; researcher calls out `chat_turns [designId ASC, createdAt ASC]` as the accumulation-order precedent, with optional `userId ASC, createdAt DESC` for ownership queries. (researcher §2; researcher-raw-findings.md L115-L125)
- Converter precedent is `lib/firestore/converters/designs.ts` plus barrel re-export from `lib/firestore/converters/index.ts`; route-handler precedent is `app/api/designs/[id]/route.ts` using `getSession(req)`, converter-backed loaders, sensitive-field stripping, and 500 logging. (researcher §2; researcher-raw-findings.md L126-L143)

### d8 regenerate as direct implementation template

- Researcher marks d8 (`d8-regenerate-from-stored-inputs.yaml`) as the direct implementation template: it calls `loadDesignDetail`, uses stored `primaryReference`, `secondaryReferences`, `promptText`, and `nailShape`, blocks on `staleReferenceCount > 0`, and runs `persistGenerationStart -> provider generate -> persistGenerationResult`. (researcher §1; researcher-raw-findings.md L73-L79)
- The d8 request path uses `lib/ai/buildGeminiRequest.ts` with stored inputs only, which aligns with FR-E-3's dependency on trustworthy regenerate behavior rather than request-body reconstruction. (researcher §1; researcher-raw-findings.md L75-L79, prd.md L667-L668, prd.md L697-L699)
- Epic E sequencing therefore has a hard seam at the d8 contract: chat accumulation compiles the next message set, but regeneration still rides the existing stored-input pipeline. (researcher §1; researcher-raw-findings.md L73-L89, prd.md L697-L699)

### UI integration surface

- The design page server component uses `getSessionForServerAction()`, calls `loadDesignDetail` directly, and hydrates the `Confirm` client component inside the existing max-width tablet-oriented shell. (researcher §3; researcher-raw-findings.md L149-L156)
- `Confirm.tsx` is the current design-page state machine. Researcher identifies the natural insertion point for `ChatRefinementPanel` after the `<VisualizerFrame>` and prompt display, before "Back to adjust"; a sidebar would require layout restructuring because there is no current two-column shell. (researcher §3; researcher-raw-findings.md L157-L166)
- Action precedent splits by transport: server action for initial generate, route handler for shape PATCH. Researcher explicitly states chat should follow the route-handler pattern with `POST /api/designs/[id]/chat`, not a server action. (researcher §3; researcher-raw-findings.md L167-L172, structured-outline.md L439-L447)
- There are no existing timeline/chat/turn-history components in the repo; `ChatRefinementPanel` and optional `IterationTimeline` are net-new UI surfaces. (researcher §3; researcher-raw-findings.md L194-L196)

## Epic D Dependency State

- d1-d6 SHIPPED on epic-d/visualizer-library (per epic.yaml story index + git log)
- d7 (rename), d8 (regenerate-from-stored-inputs), d9 (library) IN FLIGHT
- d8 is the direct implementation template AND the FR-E-3 dependency. Epic E story sequencing must outline against the d8 contract; integration tests (e2e + lifecycle attachment) gate-block on d8 merge.

## Validation Notes (context7/web research)

- `firebase-admin`: confidence high. Codebase already uses Admin SDK and converter patterns throughout; researcher marks external lookup unnecessary for this brief. (researcher Validation Note; researcher-raw-findings.md L202-L209)
- `@google/genai (vertexai:true)`: confidence medium. Established in prior epic context, but researcher did not read `lib/ai/buildGeminiRequest.ts`; open item for design-discussion: verify the current builder signature before specifying chat-prompt compilation details. (researcher Validation Note; researcher-raw-findings.md L203-L205)
- `zod`: confidence medium. Researcher confirms Epic C uses it for reference validation, but lifecycle/converter paths here use manual validation; open item for design-discussion: decide whether chat route input validation should mirror existing `zod` usage in `lib/`. (researcher Validation Note; researcher-raw-findings.md L205-L209)
- Auth surface: confidence high. Server components use `getSessionForServerAction()`; route handlers use `getSession(req)`. Chat route must follow the route-handler auth pattern. (researcher Validation Note; researcher-raw-findings.md L206-L209)
- Source note: researcher findings are codebase-only; no context7/web runs were performed for this memo. Treat the two medium-confidence items above as explicit follow-ups, not settled implementation facts. (researcher Validation Note; researcher-raw-findings.md L208-L209)

## Slice 7 Manifest (verbatim from structured-outline lines 420-460)

1. **`firestore.rules`** and **`firestore.indexes.json`** — extend coverage for `chat_turns` if P1 ships. (Source: prompt-required manifest example; horizontal-plan Persistence) (structured-outline.md L428)
2. **`components/ChatRefinementPanel.tsx`** — render turn history, input, and iteration state. (Source: prompt-required manifest example) (structured-outline.md L429)
3. **`app/api/designs/[id]/chat/route.ts`** — accept a chat turn and trigger the next generation. (structured-outline.md L430)
4. **`lib/designs/chat-refinement.ts`** — accumulate prior refinement instructions and map them into the next provider request. (structured-outline.md L431)
5. **`lib/designs/lifecycle.ts`** — extend generation orchestration to attach generation lineage to chat turns. (structured-outline.md L432)
6. **`tests/unit/designs/chat-accumulation.test.ts`** — verify turn ordering and prompt accumulation logic. (structured-outline.md L433)
7. **`tests/e2e/chat-refinement.spec.ts`** — verify multi-turn refinement on one saved design. (structured-outline.md L434)
8. **`components/IterationTimeline.tsx`** — show recent chat-driven generation results only if the P1 UI needs explicit sequence context. (structured-outline.md L435)

## Constraints carried into design-discussion

- TDD methodology (project default; tests precede implementation per existing rules-lane + chat-accumulation patterns)
- Tablet-first landscape layout (prd.md L683-L684, project-profile.yaml L7-L10)
- P1/stretch — Epic E must not destabilize P0 ship line; cuttable (structured-outline.md L420, prd.md L620-L623, prd.md L673-L689)
- Brand-system locked at `.pHive/brand/brand-system.yaml` (no creative palette decisions)
- 9-day window to 2026-05-10 demo deadline (project-profile.yaml L7-L10)
