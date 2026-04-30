## What Are We Doing?

Epic C is the first real bridge from inspiration gathering to an actual generated nail-design image. The job is not "add AI" in the abstract. The job is to let the authenticated user collect references from two sources, normalize them into one durable input set, save that input set as a design draft, and then run generation without lying about success when any leg of the pipeline fails. (.pHive/planning/prd.md:345-347, .pHive/planning/prd.md:393-406)

I think the core product promise here is pretty crisp: one primary reference, ordered secondary references, optional prompt text, durable design state, then either a stored generated image or a guided recovery path. If we get any of those seams wrong, Epic D inherits bad state and fake confidence. (.pHive/planning/prd.md:360-362, .pHive/planning/prd.md:382-406, .pHive/planning/prd.md:458-466)

What "done" looks like to me:

- The user can choose a Pinterest pin as primary, add more Pinterest pins and/or uploads as secondary, and see that mixed set reflected in one reference panel. (.pHive/planning/prd.md:360-362, .pHive/planning/vertical-plan.md:157-166)
- The app blocks invalid reference states instead of letting zero-primary or multi-primary nonsense leak downstream. (.pHive/planning/prd.md:361, .pHive/planning/prd.md:424-425)
- The optional prompt is persisted as a first-class input and is allowed to override conflicting visual cues. (.pHive/planning/prd.md:371-373, .pHive/planning/prd.md:427-428)
- A durable design record exists before or at generation time so later reopen and regenerate flows are built on saved inputs, not transient client state. (.pHive/planning/prd.md:375-384, .pHive/planning/prd.md:430-431)
- Pressing generate creates a real generation attempt, shows a pending state that acknowledges AI latency, and resolves to either a stored output image or an explicit guided failure state. (.pHive/planning/prd.md:393-406, .pHive/planning/prd.md:453-456)

I also think the real constraint here is that Epic C is not a blank-sheet architecture exercise anymore. The PRD, vertical plan, and structured outline already define Slice 3 and Slice 4 boundaries. So this doc should tighten the path through those decisions, not reopen them. (.pHive/planning/prd.md:346-347, .pHive/planning/vertical-plan.md:155-166, .pHive/planning/structured-outline.md:222-321)

Non-goals are important because this epic can sprawl fast:

- No visualizer work beyond a raw generated preview. (.pHive/planning/prd.md:413-416, .pHive/planning/vertical-plan.md:199-208)
- No library browse/reopen flow beyond the durable-state groundwork Epic D will rely on. (.pHive/planning/prd.md:413-415, .pHive/planning/vertical-plan.md:202-208)
- No speculative multi-provider orchestration beyond preserving the provider boundary. (.pHive/planning/prd.md:416)
- No story decomposition advice here. The planning stack already covers that next step if this design discussion is sound. (.pHive/planning/structured-outline.md:1102, .pHive/planning/vertical-plan.md:151-217)

## What I Found

Epic B already gave us the Pinterest boundary we should reuse instead of rebuilding. `lib/pinterest/client.ts` is server-only, already wraps bearer-token fetches with `cache: 'no-store'`, and already exposes `verifyPinterestToken()`, `listPinterestBoards()`, and `listPinterestBoardPins()`. That means Epic C does not need a new Pinterest auth model, just a new ingest path that sits on top of the existing one. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:13-44)

The existing Pinterest types and error normalization are also good enough to anchor the new ingest work. `PinterestPin` already includes image variants, and `normalizePinterestResponse()` already maps `401/403/404/429` into a stable error vocabulary. I think that is important because pin selection failures need user-facing differentiation, not generic crashes. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:46-111, .pHive/planning/prd.md:362, .pHive/planning/prd.md:395-406)

There is prior art for Pinterest UI reuse too. The browse routes and components already exist under `app/(authenticated)/pinterest/*` and `components/pinterest/*`, including token-invalid and insufficient-scope views. My read is that Epic C should extend that surface with selection affordances rather than inventing a second Pinterest browser. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:132-137, .pHive/epics/epic-c-reference-and-generation/docs/research-brief.md:7-9)

Where the repo gets much thinner is Storage. The raw findings are blunt: there is no `getStorage()` usage anywhere, no `storage.rules`, and `firebase.json` only wires Firestore and Auth emulators today. So every cached Pinterest image, uploaded reference image, and generated output image path is greenfield in this repo even though the env already has a storage bucket configured. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:150-168)

The closest reusable Firebase pattern is `lib/firebase/server.ts`. It already shows the server-only Admin SDK init, the `Symbol.for(...)` global cache, and the inlined service-account hydration workaround for Next/Vercel bundle behavior. I think that pattern matters a lot because a naive Storage helper that depends on `lib/env.ts` side effects is likely to fail in exactly the same way `server.ts` was written to avoid. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:170-240)

The domain model is also greenfield. `lib/types.ts` only knows about `NailShape`, `AuthUser`, and `Profile`. `firestore.rules` only admits `/profiles/{uid}`. No `Reference`, `Design`, `Generation`, converters, or ordered-secondary-reference storage contract exists yet. So this epic is doing real contract formation work, not just wiring UI to existing tables. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:248-270, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:567-584)

The planning docs are aligned on the intended record shapes even if the exact TypeScript contracts are not finished. Slice 3 explicitly names shared `references` ingestion plus design creation, and Slice 4 explicitly names generation orchestration plus persisted lifecycle state. The unresolved bit is not whether those things exist. The unresolved bit is the exact internal shapes and whether ordered secondary references live as an array or subcollection. (.pHive/planning/structured-outline.md:230-259, .pHive/planning/structured-outline.md:281-309, .pHive/planning/vertical-plan.md:161-165)

I found one important architecture ambiguity that should not stay fuzzy. The outline names both server actions and REST routes for the same flows, while repo prior art says server actions are the normal UI mutation surface and route handlers are used more sparingly. My concern is lifecycle drift if we pretend both are equally primary. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:377-410)

Testing infrastructure is decent, but not complete for this epic. Vitest is already wired, including the `server-only` alias shim. Rules testing is already present through `vitest.config.rules.ts` and `@firebase/rules-unit-testing`. Playwright exists, but its web server only starts the Auth emulator right now, so Epic C will need Firestore and Storage added to that path. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:467-507)

The big test-gap callout is MSW. The outline expects MSW for Pinterest and Gemini mocking, but the raw findings confirm there are zero `msw` references in the repo and it is not installed. So the verification plan can name MSW, but it also needs to say explicitly that MSW is a required addition rather than pretending it already exists. (.pHive/planning/structured-outline.md:527-537, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:481-484, .pHive/epics/epic-c-reference-and-generation/docs/research-brief.md:57-60)

The generation side is even more greenfield than Storage. The raw scan found no Gemini or generation code in the app today. The plan currently points at Firebase AI Logic with Gemini 2.5 Flash Image, but the actual server-runtime support question is still unresolved and the provider spike from Slice 1 has not been executed yet. That is not a small footnote. That is the main gate on whether Slice 4 is executable as currently written. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:317-350, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625, .pHive/planning/prd.md:395, .pHive/planning/prd.md:470-471)

I also found a subtle UI/platform constraint: the authenticated shell already gives us `session.uid` in server contexts and the sidebar is where `New Design` and `Library` nav entries will need to land. That is trivial work mechanically, but it means Epic C touches shared shell navigation, not just a new page. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:428-452, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646)

The overall picture is pretty consistent:

- Pinterest browse foundation exists and is reusable. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:13-142)
- Storage, collection contracts, and generation are mostly greenfield. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:158-240, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:248-350)
- The planning stack already decided the slice boundaries and expected verification surfaces. (.pHive/planning/structured-outline.md:222-321, .pHive/planning/vertical-plan.md:151-217)
- The biggest unresolved risk is still the provider gate, not the UI. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625, .pHive/planning/prd.md:470-471)

## My Proposed Approach

I think the cleanest approach is to treat Epic C as three linked but distinct contracts: reference ingestion, durable design state, and generation lifecycle. If we collapse those into one big mutation, debugging will get ugly fast. (.pHive/planning/prd.md:421-449, .pHive/planning/structured-outline.md:236-241, .pHive/planning/structured-outline.md:282-299)

Step 1 is to settle the canonical data shape before touching the UI flow too much. I would define one internal `ReferenceRecord` shape that both Pinterest and upload ingestion produce, then make the design draft reference only those durable records. That keeps FR-C-1 and FR-C-2 enforceable in one place instead of scattered across components. (.pHive/planning/prd.md:421-425, .pHive/planning/structured-outline.md:248-259, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:642-643)

Step 2 is to add the Firebase persistence baseline for Slice 3. That means `references`, `designs`, and the ordered-secondary-reference representation in Firestore, plus `storage.rules` and Storage emulator wiring. I would not treat uploads or Pinterest caching as "just file IO" because the rules, path layout, and owner scoping are part of the product contract here. (.pHive/planning/structured-outline.md:230-241, .pHive/planning/vertical-plan.md:161-166, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:160-168, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:236-240)

Step 3 is to implement a dedicated server-side Storage helper modeled after `lib/firebase/server.ts`. My opinion is that this helper should own user-scoped path construction for cached Pinterest references, uploaded references, and generated outputs so the rest of the code never hand-rolls bucket paths. That is the best shot at keeping ownership rules and cleanup semantics consistent. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:170-240, .pHive/planning/vertical-plan.md:161-166, .pHive/planning/vertical-plan.md:195-200)

Step 4 is to build `lib/references/ingest.ts` and `lib/references/reference-set.ts` as the real Slice 3 core. I would make `ingestPinterestPin` fetch the selected pin metadata from the existing Pinterest layer, choose the best available image variant, copy it into app-owned storage, then emit the same normalized record shape that upload ingestion emits. That keeps the "mixed-source reference panel" honest. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:64-86, .pHive/planning/structured-outline.md:236-237, .pHive/planning/structured-outline.md:263-271)

Step 5 is to keep the UI mutation surface opinionated: server actions first, route handlers only if there is a concrete need the action model cannot satisfy. The raw findings already point this way, and it reduces the chance that `selectPinterestPin`, `uploadReference`, `createDesign`, and `generateDesign` drift into duplicate business logic. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:383-410, .pHive/planning/prd.md:448-449)

Step 6 is to put the new workspace at `app/(authenticated)/design/new/page.tsx` and reuse existing Pinterest browse pieces rather than clone them. I think the page should compose four visible states: selection from Pinterest, upload, prompt entry, and the assembled reference panel. The app should not let generation be the first moment we discover the reference set is invalid. (.pHive/planning/structured-outline.md:232-240, .pHive/planning/vertical-plan.md:157-166, .pHive/planning/prd.md:360-373)

Step 7 is to create the design draft explicitly before generation. I do not want a flow where generation is secretly responsible for the first durable save. The PRD leaves "before or at generation time" open, but I think "before" is the safer interpretation because it gives clearer failure boundaries and better future reopen/regenerate semantics. (.pHive/planning/prd.md:430-431, .pHive/planning/prd.md:382-384, .pHive/planning/structured-outline.md:240-241)

Step 8 is to keep the generation boundary narrow. `lib/ai/generate.ts` should assemble the provider request from durable references, prompt text, and nail shape, while `lib/designs/lifecycle.ts` should own pending/success/failure transitions plus latest-generation linkage. I think separating provider IO from lifecycle persistence is what keeps partial-failure handling testable. (.pHive/planning/structured-outline.md:281-299, .pHive/planning/prd.md:433-446)

Step 9 is to preserve the provider abstraction aggressively because the Slice 1 gate is still unresolved. Even though the current plan names Firebase AI Logic, I would keep the call site and error vocabulary provider-agnostic enough that a server-native Google SDK swap does not force a rewrite of the UI or persistence model. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:621-625, .pHive/planning/prd.md:411, .pHive/planning/prd.md:470-471)

Step 10 is to use a discriminated result envelope for all user-triggered failures in Epic C. The Pinterest `loadMore` actions can throw because they are narrow browse helpers. Epic C cannot get away with that because the UX has to distinguish storage failure, provider refusal, retry exhaustion, and unresolved provider gate. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:117-130, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:383-397, .pHive/planning/prd.md:393-406)

Step 11 is to make pending-state and failure-state behavior part of the implementation, not polish. The PRD explicitly says latency is expected and guided failure is required. So `GenerateButton`, `GenerationPreview`, and `GenerationErrorState` are not decorative component work. They are the visible product contract for Slice 4. (.pHive/planning/prd.md:393-406, .pHive/planning/prd.md:453-456, .pHive/planning/structured-outline.md:285-287)

Step 12 is to land nav and image-host follow-through as part of the same slice work. `app/(authenticated)/layout.tsx` will need Studio nav updates, and `next.config.ts` likely needs Firebase Storage image-host allowance for previews. Small changes, but I would rather name them now than let them appear as "surprise glue work" later. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:446-447, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:593-594, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646)

## What Could Go Wrong

**high** The Slice 1 provider decision is still unresolved, and Slice 4 explicitly depends on it. If that spike changes the SDK or even the provider family, generation code written too concretely now will churn. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625, .pHive/planning/vertical-plan.md:189, .pHive/planning/prd.md:470-471)

**high** Partial generation persistence can create fake success or permanently stuck `pending` state if provider success, output storage, and Firestore status updates are not coordinated. This is the scariest data-integrity risk in the epic. (.pHive/planning/prd.md:404-406, .pHive/planning/prd.md:445-446, .pHive/planning/structured-outline.md:315-321)

**high** Reference ingestion can split into Pinterest-shaped and upload-shaped records. If that happens, Slice 4 request assembly becomes a branching mess and later regenerate/reopen work inherits that complexity. (.pHive/planning/prd.md:421-425, .pHive/planning/structured-outline.md:265-271, .pHive/epics/epic-c-reference-and-generation/docs/research-brief.md:48-49)

**medium** Storage is greenfield end to end. No helper, no rules file, no emulator wiring, and no current path conventions means there are several ways to get ownership or testability wrong on the first pass. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:158-168, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:236-240)

**medium** The outline naming both server actions and route handlers can lead to duplicate lifecycle logic if no one chooses a canonical entrypoint per flow. That is a classic drift problem, especially under time pressure. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:399-410, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:636-637)

**medium** The generation SDK/runtime story is still uncertain. Firebase AI Logic is the planned direction, but the raw findings only found web-SDK examples and explicitly call out unresolved Next.js server-runtime support. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:621-622)

**medium** Playwright and integration coverage can look better on paper than in reality if the emulator wiring is not upgraded for Firestore and Storage. Right now the E2E harness only starts Auth. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:487-508)

**low** Pinterest image caching rights are still not validated in the planning inputs. I do not think that blocks technical planning, but it is a product/legal assumption hiding inside the reference-ingestion design. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:630-631)

**low** Sidebar and image-host updates are easy to underestimate because they look like tiny edits, but they touch shared shell behavior and preview rendering. Missing them would create annoying late-cycle UI breakage. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:593-594, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646)

## Dependencies and Constraints

The biggest dependency is not code. It is the provider gate. Epic C production generation depends on the Slice 1 decision artifact, and the raw findings say that spike has not been executed yet. So any Slice 4 implementation plan has to preserve that uncertainty instead of burying it. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625, .pHive/planning/prd.md:470-471)

Epic C also depends on Epic B delivering usable Pinterest browse and token-remediation flows, because Slice 3 assumes the user can already reach pins and select one. That part looks healthy based on the existing route and component surfaces. (.pHive/planning/prd.md:347, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:132-137)

Security constraints are strict and already established. All writes need to stay user-scoped under `session.uid`, and the repo’s Firestore posture is explicit opt-in with default deny. Epic C should extend that posture, not soften it. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:428-452, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:567-584)

Environment constraints are real too:

- The Firebase storage bucket is configured in env but unused in code today. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:167-168)
- There is no AI credential in `lib/env.ts` yet, so provider work requires schema and provisioning updates. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:533-554, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:624-625)
- Node 20 and the existing Firebase/Next versions are the execution baseline. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:595-599)

Testing constraints matter because the verification plan assumes tools that are only partially present:

- Vitest is present. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:467-480)
- Playwright is present. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:485-508)
- Rules-unit-testing is present. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:477-480, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:597-598)
- MSW is planned but not installed. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:481-484)

One more planning constraint: the project-level horizontal plan, vertical plan, and structured outline already cover Epic C Slice 3 and Slice 4 in detail. I do not think this design discussion should invent alternate slice boundaries or new decomposition structure. (.pHive/planning/prd.md:346-347, .pHive/planning/structured-outline.md:222-321, .pHive/planning/vertical-plan.md:151-217)

## Open Questions

Q1, Q2, Q3, and Q4 should resolve before story authoring because they affect contracts, verification setup, or whether Slice 4 is implementable as planned. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-643)

1. For `US-C-4`, `US-C-5`, `FR-C-5`, `FR-C-6`, and `FR-C-7`, what is the actual Slice 1 provider go/no-go artifact, and who owns approving it before production generation starts? (.pHive/planning/prd.md:395-406, .pHive/planning/prd.md:470-471, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-620)
2. For `US-C-4` and `FR-C-5`, is Firebase AI Logic on the Next.js server runtime still the chosen path, or are we preserving the same provider/model target while switching to a server-native SDK? (.pHive/planning/vertical-plan.md:196-200, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:321-350, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:621-622)
3. For `US-C-1`, `US-C-3`, `FR-C-2`, and `FR-C-4`, do ordered secondary references live on `designs` as an ordered array, or as a separate `design_secondary_references` structure? (.pHive/planning/vertical-plan.md:161-164, .pHive/planning/structured-outline.md:230, .pHive/planning/structured-outline.md:250-251)
4. For `FR-C-1` and `FR-C-5`, what is the canonical `ReferenceRecord` shape: storage path only, or storage path plus MIME type and any fetch-time metadata needed for request assembly? (.pHive/planning/structured-outline.md:248-255, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:299, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:642-643)
5. For `FR-C-10`, are server actions the canonical mutation surface for workspace flows, with route handlers reserved for exceptional cases, or is the project intentionally supporting both per flow? (.pHive/planning/prd.md:448-449, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:399-410, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:636-637)
6. For `US-C-1` and `FR-C-1`, what are the approved upload limits and is upload supposed to be server-proxied to Storage or direct-to-bucket with browser credentials? (.pHive/planning/structured-outline.md:233, .pHive/planning/structured-outline.md:258-259, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:627-628)
7. For `US-C-4` and `US-C-5`, what exact guided-failure copy and recovery branches are approved for refusal, rate limit, and post-retry failure states? The PRD is clear on outcome shape, but not final wording. (.pHive/planning/prd.md:394-406, .pHive/planning/structured-outline.md:287, .pHive/planning/structured-outline.md:315-316)
8. For `US-C-1` and `US-C-5`, are the sidebar `New Design` and `Library` entries fully in Epic C scope, or is `Library` only scaffolding that lands now because later slices depend on the nav slot existing? (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:446-447, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:645-646)

## Verification Strategy

I think verification should mirror the planning docs pretty closely, but with one important reality check: Vitest, Playwright, and Firebase rules/integration tooling exist now, while MSW does not and must be installed before we claim mocked provider coverage. (.pHive/planning/structured-outline.md:527-537, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:467-507)

For Slice 3, I would automate the pure reference-set rules in Vitest, the owner-scoped Firestore/Storage behavior in integration and rules tests, and the mixed-source assembly flow in Playwright. That lines up with the outline and vertical plan and keeps the highest-risk contract seams under automation. (.pHive/planning/structured-outline.md:242-244, .pHive/planning/structured-outline.md:263-269, .pHive/planning/vertical-plan.md:177-181)

For Slice 4, I would automate request-builder logic, one-retry behavior, and generation persistence transitions in Vitest/integration tests, then cover happy path and guided failure path in Playwright. Manual review still matters for whether generated images are credible nail-design material, because that is not something a unit test can meaningfully score. (.pHive/planning/structured-outline.md:289-292, .pHive/planning/structured-outline.md:312-319, .pHive/planning/structured-outline.md:533-537, .pHive/planning/vertical-plan.md:210-215)

I would also explicitly run rules tests for `references`, `designs`, and `generations`, not just component and route tests. The whole point of the epic is durable user-scoped state, and the current repo already has a rules test lane waiting to be used. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:477-480, .pHive/planning/prd.md:383-384, .pHive/planning/prd.md:454)

Not verifying:

- I would not do performance/load testing here beyond observing pending-state UX under normal generation latency, because the PRD frames latency as a UX-handling concern, not a throughput target. (.pHive/planning/prd.md:453)
- I would not claim legal/TOS validation for Pinterest caching through engineering tests. That is outside the test stack. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:630-631)

```text
VERIFICATION PLAN:
  Tools: Vitest, Playwright, Firebase emulator, @firebase/rules-unit-testing, MSW (needs install)
  Platforms: Desktop Chrome for debugging; iPadOS Safari/Chrome primary; iPhone secondary for smoke coverage
  Automated: Reference-set ordering, prompt persistence, Storage/Firestore owner scoping, generation request assembly, retry behavior, persistence transitions, reference assembly E2E, generation happy/error E2E
  Manual: Primary/secondary affordance clarity, prompt helper-text clarity, pending/error UX quality on tablet, generated-image credibility review
  Not verifying: Load/perf benchmarks beyond normal flow observation; legal validation of Pinterest image caching rights
```

## Scale Assessment

I think this is a medium-to-large implementation surface in raw engineering terms, but not a "needs more planning before stories" situation. The repo reality is greenfield in a lot of places, yet the planning reality is that Epic C already has project-level horizontal planning, vertical slice planning, and a structured outline that covers exactly the Slice 3 and Slice 4 scope we need. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:158-168, .pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:248-350, .pHive/planning/structured-outline.md:222-321, .pHive/planning/vertical-plan.md:151-217)

The size indicators are real:

- A lot of new files are expected across domain, persistence, UI, tests, and rules. (.pHive/planning/structured-outline.md:230-244, .pHive/planning/structured-outline.md:281-292, .pHive/epics/epic-c-reference-and-generation/docs/research-brief.md:115-151)
- At least four subsystems move together: Pinterest reuse, Firebase Storage, Firestore contracts/rules, and generation/provider orchestration. (.pHive/planning/vertical-plan.md:161-166, .pHive/planning/vertical-plan.md:195-200)
- There is no data migration, but there is a first-time data contract for `references`, `designs`, and `generations`. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:248-270)
- There is one major unknown, and it is concentrated: provider execution details behind the Slice 1 gate. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625)

What keeps me from asking for another planning layer is that the existing planning docs already answer the "how should this be sliced and sequenced?" question. Slice 3 and Slice 4 are already separated cleanly, the verification surfaces are already enumerated, and the project-level outline already names the expected file/system footprint. I do not see a structural planning gap. I see an implementation-execution gap plus a provider-gate dependency. (.pHive/planning/structured-outline.md:222-321, .pHive/planning/structured-outline.md:527-571, .pHive/planning/vertical-plan.md:151-217)

So my recommendation is to proceed to stories, with the caveat that story authoring should not hide the provider decision dependency. If that gate is unresolved, the stories need to either encode it explicitly or stop short of pretending full Slice 4 production delivery is unblocked. (.pHive/epics/epic-c-reference-and-generation/docs/research-raw-findings.md:618-625, .pHive/planning/prd.md:470-471)

```text
SCALE ASSESSMENT:
  Files affected: ~25-35
  Subsystems: Pinterest reuse, Firebase Storage, Firestore contracts/rules, design lifecycle, generation provider boundary, authenticated workspace UI, test harness
  Migration required: no
  Cross-team coordination: no
  Unknowns: 4 major planning-level unknowns, with the provider gate being the main one

  RECOMMENDATION: Proceed to stories
  RATIONALE: Project-level horizontal/vertical planning plus the structured outline already cover Epic C Slice 3 and Slice 4 in enough detail; the remaining issues are contract clarifications and the Slice 1 provider gate, not a missing planning decomposition layer
```
