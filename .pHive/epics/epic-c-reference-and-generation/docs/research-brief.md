# Epic C Research Brief — Reference Collection + AI Generation Pipeline

## Goal

Epic C delivers the first full inspiration-to-image bridge: the authenticated user can assemble a mixed-source reference set from Pinterest pins and uploaded photos, optionally add prompt text, persist a durable design input set, and run generation to reach either a stored generated nail-design image or a guided failure state that explains how to recover instead of leaving the flow in a misleading partial state. Source: `.pHive/planning/prd.md:345-347`, `.pHive/planning/prd.md:466`, `.pHive/planning/vertical-plan.md:157-166`, `.pHive/planning/vertical-plan.md:191-200`

## Foundation Reuse

- `lib/pinterest/client.ts` already exports `verifyPinterestToken()`, `listPinterestBoards()`, and `listPinterestBoardPins()` as server-only Pinterest API surfaces; Epic C reuses the same server-side Pinterest boundary instead of introducing a client-side token path. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:13-44`
- `lib/pinterest/client.ts` already centralizes authenticated Pinterest fetch behavior through internal `pinterestFetch(path, init)` with `Authorization: Bearer ${env.PINTEREST_ACCESS_TOKEN}` and `cache: 'no-store'`; Epic C should reuse that pattern for metadata fetches, not re-implement bearer handling. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:15-30`
- `lib/pinterest/types.ts` already defines the Pinterest payload types Epic C consumes: `PinterestBoard`, `PinterestPinImageVariant`, `PinterestPin`, and `PinterestPaginated<T>`. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:46-87`
- `lib/pinterest/errors.ts` already exports `PinterestError` and `normalizePinterestResponse(res)`; Epic C can reuse the same 401/403/404/429 normalization for Pinterest API responses instead of inventing a second error map. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:88-112`
- `lib/pinterest/token-replacement-copy.ts` already exports `tokenInvalidCopy` and `insufficientScopeCopy`; Epic C can reuse the existing token-remediation wording when Pinterest-backed reference selection fails because of token state. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:113-116`
- `app/(authenticated)/pinterest/actions.ts` already provides a server-action exemplar for Pinterest flows via `loadMoreBoards()` and `loadMorePins()`; Epic C should reuse the authenticated server-mutation posture while switching to discriminated result envelopes for mutation-heavy flows. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:117-130`
- `app/(authenticated)/pinterest/page.tsx` and `app/(authenticated)/pinterest/[boardId]/page.tsx` already ship the Pinterest browse UI, token-verify gate, and pin-grid entry point that Epic C builds on for pin selection rather than replacing. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:132-138`
- `components/pinterest/PinGrid`, `PinGridSkeleton`, `TokenInvalidView`, and `InsufficientScopeView` already exist as browse-surface components Epic C can extend with selection affordances instead of creating a second pin browser. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:135-137`
- `lib/pinterest/__fixtures__/boards.ts` and `lib/pinterest/__fixtures__/pins.ts` already provide fixture pages and cursor sentinels suitable for Epic C unit and integration tests that need stable Pinterest inputs. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:139-143`
- `lib/firebase/server.ts` already exports `createServerFirebaseAdmin()` and establishes the server-only Admin SDK initialization pattern Epic C should mirror for Firebase Cloud Storage access, including the inlined service-account hydration guard. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:170-208`
- `lib/firebase/client.ts` already exports `createBrowserFirebaseClient()` and passes `storageBucket` in the browser Firebase config, which means Epic C inherits an initialized browser app surface if any client-only Firebase Cloud Storage read helper is later needed. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:209-235`
- `app/(authenticated)/layout.tsx` plus `lib/firebase/session.ts` already provide the authenticated shell and `session.uid` contract Epic C must reuse for all Firestore and Firebase Cloud Storage ownership scoping. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:428-452`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:559-565`
- `lib/env.ts` already validates the Firebase, auth, app URL, and Pinterest env keys Epic C depends on; only the generation-provider credential is missing from the schema today. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:533-554`
- `firestore.rules` already establishes the default-deny, explicit-opt-in rule posture Epic C should extend instead of replacing. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:567-584`
- `vitest.config.ts`, `vitest.config.rules.ts`, and the existing Pinterest/Auth/Firebase test suites already provide the test harness patterns Epic C should reuse, including the `server-only` alias shim required for server-only modules under Vitest. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:463-480`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:510-527`

## New Surfaces

### Domain

- `references` becomes the normalized input record for both Pinterest-selected and uploaded images, with one shared shape required by FR-C-1. Source: `.pHive/planning/prd.md:421-423`, `.pHive/planning/horizontal-plan.md:72-76`
- `designs` becomes the durable input-set record for primary reference, ordered secondary references, prompt text, shape, and latest generation linkage, with FR-C-4 and later reopen/regenerate semantics depending on that durability. Source: `.pHive/planning/prd.md:430-432`, `.pHive/planning/horizontal-plan.md:77-81`
- `generations` becomes the append-only attempt log for request payload, provider metadata, output path, status, and failure detail, with FR-C-6 and FR-C-9 depending on consistent state transitions. Source: `.pHive/planning/prd.md:436-446`, `.pHive/planning/horizontal-plan.md:83-86`
- Ordered secondary references remain unresolved between a `design_secondary_references` subcollection and an ordered array on `designs`; the planning inputs name both options but do not settle one. Source: `.pHive/planning/horizontal-plan.md:62`, `.pHive/planning/horizontal-plan.md:88-91`, `.pHive/planning/structured-outline.md:230`, `.pHive/planning/vertical-plan.md:161`

### External Integrations

- Pinterest image ingestion reuses the shipped browse integration for pin metadata, then adds a new server-side image fetch and cache step that copies the selected pin image into the app’s Firebase Cloud Storage `references` bucket for durable generation input. Source: `.pHive/planning/horizontal-plan.md:154-157`, `.pHive/planning/horizontal-plan.md:171-173`, `.pHive/planning/vertical-plan.md:161-166`
- Generation remains gated on the Slice 1 provider decision. The production plan currently names Firebase AI Logic with Gemini 2.5 Flash Image as the generation path, but the raw findings confirm that no provider code is shipped yet and that server-runtime support for the `firebase/ai` SDK is still unconfirmed. Source: `.pHive/planning/vertical-plan.md:189-200`, `.pHive/planning/horizontal-plan.md:175-199`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625`
- Gemini SDK choice and version are not confirmed in the loaded inputs. What is confirmed today: `firebase@^12.12.0` is already installed and includes the Firebase AI Logic web submodule, while a server-friendly Node SDK would be an additional dependency if the team does not use Firebase AI Logic on the Next.js Node runtime. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:318-350`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:595-599`

### Persistence

- Firebase Firestore must add active collection contracts for `references`, `designs`, and `generations`, plus ordered-secondary-reference support. Source: `.pHive/planning/horizontal-plan.md:61-64`, `.pHive/planning/structured-outline.md:230-241`, `.pHive/planning/structured-outline.md:281-283`
- Firebase Cloud Storage is greenfield in the repo and must add user-scoped write/read rules, a `references` bucket path for uploads and cached Pinterest images, and a `generations` bucket path for generated outputs. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:158-169`, `.pHive/planning/horizontal-plan.md:63`, `.pHive/planning/horizontal-plan.md:103-109`
- `firestore.rules` requires deltas for `references`, `designs`, `generations`, and any nested ordered-reference path while preserving the existing default-deny posture. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:256-258`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:567-584`
- `firestore.indexes.json` needs confirmation of current contents before Epic C assumes any compound index is present; the raw findings explicitly left that file state unconfirmed. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:257-258`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:639-640`
- `storage.rules` is greenfield and `firebase.json` does not yet register the Firebase Cloud Storage emulator, so Epic C adds both if the plan keeps Firebase Cloud Storage as the persistence surface. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:160-168`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:238-240`

### Server Actions

- Planned action names from the inputs are `selectPinterestPin(pinId)`, `uploadReference(file)`, `createDesign(input)`, and `generateDesign(input)`. Those names align with the PRD and slice docs, but the inputs also list parallel route handlers, so the final public mutation surface remains an architecture call rather than a settled contract. Source: `.pHive/planning/vertical-plan.md:163-166`, `.pHive/planning/horizontal-plan.md:254-277`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:393-410`
- The action/result contract should be a discriminated envelope, not a throw-on-failure `loadMore` shape, because US-C-1 through US-C-5 require differentiated outcomes such as cache failure, upload failure, refusal, rate limit, and post-provider storage failure. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:130`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:383-397`, `.pHive/planning/prd.md:360-406`

### UI Surface

- `app/(authenticated)/design/new/page.tsx` is the new workspace surface that combines Pinterest selection, upload, prompt entry, and generation entry. Source: `.pHive/planning/structured-outline.md:232-240`, `.pHive/planning/structured-outline.md:284-287`
- Epic C adds primary/secondary selection affordances on top of the existing Pinterest browse flow so the user can choose exactly one primary reference and preserve ordered secondary references. Source: `.pHive/planning/prd.md:360-362`, `.pHive/planning/vertical-plan.md:157-166`, `.pHive/planning/horizontal-plan.md:314-320`
- Epic C adds an upload tile or upload zone for direct image references and an optional prompt input whose helper text explicitly states that text can override conflicting visual cues. Source: `.pHive/planning/structured-outline.md:233-235`, `.pHive/planning/horizontal-plan.md:318-320`
- Epic C adds a reference panel that shows the normalized reference set state before generation. Source: `.pHive/planning/structured-outline.md:232`, `.pHive/planning/vertical-plan.md:157`, `.pHive/planning/horizontal-plan.md:319-320`
- Epic C adds a generate button with a polished pending state, a raw generation preview, and a guided error state after the one silent auto-retry budget is exhausted. Source: `.pHive/planning/prd.md:393-406`, `.pHive/planning/structured-outline.md:285-287`, `.pHive/planning/horizontal-plan.md:324-327`
- The raw findings call out authenticated-shell navigation updates for `New Design` and `Library`, but the exact final nav labels and placement are not specified in the planning inputs. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:446-447`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646`

### Testing

- Unit coverage adds reference-set ordering tests, Gemini request-builder tests, and retry tests. Source: `.pHive/planning/structured-outline.md:242-244`, `.pHive/planning/structured-outline.md:289-292`
- Integration coverage adds Firebase-backed persistence and Firebase Cloud Storage write-path tests for references and generations. Source: `.pHive/planning/structured-outline.md:243`, `.pHive/planning/structured-outline.md:291`, `.pHive/planning/structured-outline.md:527-537`
- Playwright adds reference-assembly and generation happy/error flows. Source: `.pHive/planning/structured-outline.md:244`, `.pHive/planning/structured-outline.md:292`, `.pHive/planning/structured-outline.md:527-537`
- The plan expects MSW for Pinterest and Gemini mocking, but the raw findings confirm `msw` is not installed yet. Source: `.pHive/planning/horizontal-plan.md:354-355`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:481-484`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:633-634`

## Contract Anchors

The outline names `ReferenceRecord`, `Design`-creation inputs, and generation lifecycle interfaces, but it does not define full TypeScript document shapes for `Reference`, `Design`, or `Generation`. The minimal shapes below are proposed anchors derived from the outline’s Slice 3 and Slice 4 interfaces and should remain provisional until the architecture owner confirms them. Source anchors: `.pHive/planning/structured-outline.md:248-257`, `.pHive/planning/structured-outline.md:296-299`

```ts
export type Reference = {
  id: string;
  userId: string;
  source: 'pinterest' | 'upload';
  sourceUrl: string | null;
  storagePath: string;
  pinterestPinId: string | null;
  createdAt: string;
};

export type Design = {
  id: string;
  userId: string;
  name: string | null;
  primaryReferenceId: string;
  secondaryReferenceIds: string[];
  promptText: string | null;
  nailShape: NailShape;
  latestGenerationId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Generation = {
  id: string;
  designId: string;
  requestJson: unknown;
  resultStoragePath: string | null;
  providerResponseMetadata: unknown;
  status: 'pending' | 'success' | 'failure';
  errorMessage: string | null;
  createdAt: string;
};
```

Field sources for the provisional document shapes above: `.pHive/planning/horizontal-plan.md:72-91`

## Risk Inventory

| Severity | Risk                                                                                                                                                                                                                                                                                                                                                      | Mitigation                                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Provider gate is still unresolved, and Epic C production generation depends on Slice 1 passing first. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-620`, `.pHive/planning/prd.md:470-471`                                                                                                                      | Do not treat production generation as ready until the Slice 1 artefact records a provider go/no-go outcome.                                              |
| High     | Partial generation persistence can leave misleading state if provider success, Firebase Cloud Storage write, and Firestore status updates are not coordinated. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:636-638`, `.pHive/planning/structured-outline.md:317-321`                                              | Create the generation row before invocation, then test pending/success/failure transitions explicitly and fail deterministically on output-write errors. |
| Medium   | Reference ingestion can fork into Pinterest-specific and upload-specific record shapes, which silently breaks later generation assembly. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:642-643`, `.pHive/planning/structured-outline.md:265-271`                                                                    | Normalize both sources through one `references` contract and keep ordering/primary logic independent of source.                                          |
| Medium   | Firebase Cloud Storage is entirely greenfield here: no helper, no `storage.rules`, and no emulator wiring exist yet. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:158-169`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:627-629`                                                   | Add a dedicated server helper, explicit rules, and emulator/test coverage before relying on Firebase Cloud Storage-backed ingestion or outputs.          |
| Medium   | Firebase AI Logic server-runtime support is unconfirmed in the loaded findings, so SDK choice may still shift even if Gemini 2.5 Flash Image remains the model target. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:621-623` | Keep generation code behind the provider boundary already planned in `lib/ai/generate.ts` and resolve runtime support in the Slice 1 spike record.       |
| Medium   | `firestore.indexes.json` contents were not confirmed during research, so Epic C could assume indexes that do not exist. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:639-640`                                                                                                                                      | Confirm the actual index file before finalizing any query contract that depends on ordered per-user reads.                                               |
| Low      | Pinterest image caching rights and hotlinking constraints were not validated in the loaded inputs. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:630-632`                                                                                                                                                           | Treat this as a product-owner/legal confirmation item rather than silently assuming durable caching rights.                                              |
| Low      | MSW-backed test plans are documented, but `msw` is not installed yet. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:633-634`                                                                                                                                                                                        | Add `msw` and the corresponding test harness setup before claiming mocked Pinterest/Gemini coverage.                                                     |

## Open Questions

1. `US-C-4`, `US-C-5`, `FR-C-5`, `FR-C-6`, `FR-C-7`: What is the recorded Slice 1 go/no-go artefact for Gemini 2.5 Flash Image, and who owns the provider-decision sign-off before Epic C production generation begins? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-620`, `.pHive/planning/vertical-plan.md:7`, `.pHive/planning/prd.md:470-471`
2. `US-C-4`, `FR-C-5`: Does the production implementation use Firebase AI Logic from the Next.js Node runtime, or does the team switch to a server-native Google SDK while keeping the same provider boundary and Gemini 2.5 Flash Image target? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:621-623`
3. `US-C-4`, `US-C-5`, `FR-C-7`: For refusal, rate-limit, and low-quality outcomes, what exact UX wording and recovery branches are approved for the post-retry state, especially where low quality is not a transport failure? Source: `.pHive/planning/structured-outline.md:605-612`, `.pHive/planning/prd.md:394-406`
4. `US-C-4`, `FR-C-5`: What generation-provider credential is required in `lib/env.ts` and `.env.example`, and how will it be provisioned now that the raw findings confirm no AI key is currently present in the env schema? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:553`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:624-625`
5. `US-C-1`, `US-C-3`, `FR-C-2`, `FR-C-4`: Is ordered secondary-reference persistence represented as a `design_secondary_references` subcollection or as an ordered array on the `designs` document? Source: `.pHive/planning/horizontal-plan.md:62`, `.pHive/planning/horizontal-plan.md:88-91`, `.pHive/planning/vertical-plan.md:161`
6. `US-C-1`, `FR-C-1`, `FR-C-10`: Which mutation surface is canonical for Epic C: server actions, route handlers, or a mixed model with one designated public contract per flow? The loaded inputs currently name both. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:399-410`, `.pHive/planning/horizontal-plan.md:254-277`
7. `US-C-1`, `FR-C-1`: What are the accepted file-type and file-size limits for upload ingestion, and does the product require direct browser uploads or server-proxied uploads into Firebase Cloud Storage? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:627-629`, `.pHive/planning/structured-outline.md:258-259`
8. `FR-C-1`, `FR-C-5`: What is the canonical `ReferenceRecord` shape used by request assembly: does it carry only `storagePath`, or does it also expose a resolved URL, MIME type, and fetch-time metadata needed for Gemini request building? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:299`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:642-643`
9. `FR-C-5`: What is the canonical `GeminiRequestPayload` type? The outline names it, but the loaded inputs never define the payload contract. Source: `.pHive/planning/structured-outline.md:297`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:299`
10. `US-C-1`, `US-C-5`: Are shell-navigation updates for `New Design` and `Library` in Epic C scope or only scaffolding that lands now for later epics? Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:446-447`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646`

## Files to Touch

### NEW

- `app/(authenticated)/design/new/page.tsx`
- `app/api/references/upload/route.ts`
- `app/api/references/pinterest/select/route.ts`
- `app/api/designs/create/route.ts`
- `app/api/designs/generate/route.ts`
- `components/ReferencePanel.tsx`
- `components/UploadZone.tsx`
- `components/PromptInput.tsx`
- `components/GenerateButton.tsx`
- `components/GenerationPreview.tsx`
- `components/GenerationErrorState.tsx`
- `lib/references/ingest.ts`
- `lib/references/reference-set.ts`
- `lib/ai/generate.ts`
- `lib/designs/lifecycle.ts`
- `lib/generations/errors.ts`
- `lib/firebase/storage.ts`
- `lib/firestore/converters/`
- `lib/firestore/converters/designs.ts`
- `tests/unit/references/reference-set.test.ts`
- `tests/unit/gemini/request-builder.test.ts`
- `tests/unit/gemini/retry.test.ts`
- `tests/integration/references-storage.test.ts`
- `tests/integration/generations-persistence.test.ts`
- `tests/e2e/reference-assembly.spec.ts`
- `tests/e2e/generation-flow.spec.ts`
- `tests/rules/`
- `storage.rules`

### MODIFY

- `app/(authenticated)/pinterest/[boardId]/page.tsx`
- `app/(authenticated)/pinterest/actions.ts`
- `app/(authenticated)/layout.tsx`
- `lib/env.ts`
- `lib/types.ts`
- `lib/pinterest/client.ts`
- `next.config.ts`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `.env.example`
- `playwright.config.ts`
- `tests/setup/integration.ts`

Manifest sources: `.pHive/planning/structured-outline.md:230-244`, `.pHive/planning/structured-outline.md:281-292`, `.pHive/planning/structured-outline.md:700-740`, `.pHive/planning/vertical-plan.md:161-166`, `.pHive/planning/vertical-plan.md:195-200`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:238-240`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:399-410`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:505-508`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:593-594`

## Test Strategy

- Vitest unit coverage should stay focused on pure contracts: primary/secondary ordering, prompt-preservation behavior, Gemini request assembly, and one-silent-retry classification. Source: `.pHive/planning/structured-outline.md:242`, `.pHive/planning/structured-outline.md:289-290`, `.pHive/planning/structured-outline.md:533-537`
- Integration coverage should own the Firebase boundaries: reference writes, generation row transitions, Firebase Cloud Storage path persistence, and Security Rules behavior for `references`, `designs`, and `generations`. Source: `.pHive/planning/structured-outline.md:243`, `.pHive/planning/structured-outline.md:291`, `.pHive/planning/structured-outline.md:527-537`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:479-480`
- MSW should be the mocking layer for Pinterest and generation-provider behavior once installed, because the planning docs explicitly depend on mocked success/failure coverage for both external boundaries. Source: `.pHive/planning/horizontal-plan.md:354-355`, `.pHive/planning/vertical-plan.md:200`, `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:633-634`
- Playwright should cover the real user seams only: reference assembly happy path, generation happy path, and generation guided-failure path. Source: `.pHive/planning/structured-outline.md:244`, `.pHive/planning/structured-outline.md:292`, `.pHive/planning/vertical-plan.md:179-181`, `.pHive/planning/vertical-plan.md:212-215`
- Keep the existing Vitest alias pattern for `server-only` modules; Epic C server-only helpers and Pinterest reuse depend on it, and the raw findings identify that alias as the canonical test posture. Source: `.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:467-476`
