# Epic E — Chat Refinement: Design Discussion

## 1. What Are We Doing?

We are deciding how to add a cuttable, P1-only chat refinement layer on top of the saved-design flow that Epic D is already building. The feature is not "AI chat" in the broad sense. It is much narrower: take a saved design, let the tech type a refinement like "make it more pastel," generate a new result, then let them type a second refinement like "add gold accents" and have that second turn build on the first instead of resetting context. (prd.md L618-L700, structured-outline.md L420-L465)

I think the important framing is that Epic E is downstream of saved-design lineage, not parallel to it. The user is not starting over. They are reopening an existing design, preserving its references and prompt base, and layering small turn-by-turn nudges on top. The direct behavioral contract is already described in Epic D's reopen/regenerate path and Epic E should reuse that seam, not invent a second generation pipeline. (brief §Saved-design lineage, brief §d8 regenerate as direct implementation template)

"Done" looks pretty concrete to me.

- A saved design can accept a first refinement turn.
- That turn persists in ordered history tied to the design.
- A new generation is produced from stored design inputs plus accumulated refinement instructions.
- A second turn can build on the first.
- The user can tell which image is current and what happened if generation fails. (prd.md L628-L648, structured-outline.md L451-L459)

Just as important, "done" also includes what must not break. Epic E is explicitly stretch scope, and PRD cut-line guidance says this is the first major cut if schedule compresses. So the implementation has to stay isolated enough that removing it leaves the P0 save/reopen/regenerate path intact. If chat leaks requirements back into Epic D, we are doing it wrong. (prd.md L673-L699, prd.md L975)

## 2. What I Found

The core thing I found is that most of the hard plumbing already has a shape. `designs/{designId}` is the lineage root, `generations/{generationId}` already stores the full provider request, and `persistGenerationResult` already does the atomic "generation success + design.latestGenerationId update" transaction. That means Epic E does not need a new root model. It needs one new turn collection and one attachment point into the existing design->generation chain. (brief §Saved-design lineage, researcher-raw-findings.md L29-L43, researcher-raw-findings.md L81-L89)

`loadDesignDetail` is the other big anchor. It already returns the hydrated design, resolved references, stale-reference count, and latest generation. That matters because the d8 regenerate story already chose the right contract: regenerate from stored inputs, not whatever the client happens to post back. Epic E should follow that same path and only add refinement accumulation before the provider call. I would treat d8 as the direct template, not just inspiration. (brief §Hydration shape from GET /api/designs/[id], brief §d8 regenerate as direct implementation template)

The Firestore precedent is stable and boring in a good way. Existing collections all use explicit ownership-scoped matches above the deny-all clause. Composite indexes also follow a simple pattern tied to the main query order. So for `chat_turns`, I do not see any reason to get fancy. Add explicit rules, add the oldest-first `designId + createdAt` index, and preserve the same `userId` ownership model as `designs` and `generations`. (brief §Firestore rules + indexes precedent, researcher-raw-findings.md L95-L125)

On the UI side, `Confirm.tsx` is clearly the insertion surface. The design page already hydrates server-side through `loadDesignDetail`, then hands a compact state bundle into `Confirm`. There is no existing chat shell, no timeline component, and no two-column layout waiting for us. My read is that `ChatRefinementPanel` should start as an in-flow panel below the visualizer and prompt display, because a sidebar version would force layout work that smells more like Epic F polish than Slice 7 behavior. (brief §UI integration surface, researcher-raw-findings.md L149-L196)

I also found a useful constraint hiding in plain sight: the project is TDD-first, but Slice 7 spans multiple test lanes. The pure accumulation logic is straightforward unit-test-first work. The rules/index work should mirror the rules-lane precedent from earlier persistence slices even though the manifest only explicitly calls out the unit and e2e test files. And the route/lifecycle seam really wants integration-style confidence through the existing action/route testing patterns plus a final Playwright pass on a real saved design. (brief §Constraints carried into design-discussion, structured-outline.md L428-L435)

One subtle but important source correction: the research brief references `lib/ai/buildGeminiRequest.ts`, but the current code exports `buildGeminiRequest` from `lib/ai/generate.ts`. I do not think that changes the design, but it does mean the implementation notes should point at the actual current module boundary instead of a stale filename. (brief §Validation Notes, `rg` verification in repo)

My overall read is that the repo already gives us a narrow path:

- Reuse `loadDesignDetail` for stored-input hydration.
- Reuse the d8 persist/generate/persist lifecycle ordering.
- Add one net-new persistence concept: `chat_turns`.
- Add one pure library for prompt accumulation.
- Add one UI panel, with the timeline component explicitly conditional. (brief §Slice 7 Manifest, structured-outline.md L428-L435)

That is why I think this is a medium vertical slice, not an architecture exercise.

## 3. My Proposed Approach

I would sequence this exactly like a TDD-friendly version of d8, with story chunks that map back to the Slice 7 manifest and keep the Epic D seam explicit. The d8 regenerate-from-stored-inputs pipeline is the direct template here. Epic E should be "d8 plus accumulated chat instructions plus turn persistence," not a separate generation architecture. (brief §d8 regenerate as direct implementation template, structured-outline.md L439-L447)

First, I would revise the expected chunk list only slightly. The user's proposed e1-e7 split is basically right. The only nuance I would add is that e1 includes its rules-lane coverage even though the manifest only names `firestore.rules` and `firestore.indexes.json`, because under this project's TDD discipline I do not want schema/rules changes landing without the rules-lane mirror. That is precedent-following, not scope creep. (brief §Constraints carried into design-discussion)

e1: `chat_turns` schema + rules + indexes.

- Manifest items: `firestore.rules`, `firestore.indexes.json`. (structured-outline.md L428)
- I would define `chat_turns` as a net-new collection keyed by turn id, carrying at minimum `designId`, `userId`, `message`, ordered timestamps, a status field, and nullable linkage to the resulting `generationId`.
- I think the tricky part is failure semantics. Because US-E-2 explicitly cares about persisted turns whose generation later fails, the schema needs room for "persisted but not successful yet" state, not just a blind message log. (prd.md L641-L648)
- TDD shape: rules-lane test first, mirroring the earlier Firestore ownership pattern used for design/generation collections.

e2: `lib/designs/chat-refinement.ts` accumulation logic.

- Manifest items: `lib/designs/chat-refinement.ts`, `tests/unit/designs/chat-accumulation.test.ts`. (structured-outline.md L431-L433)
- This should be a pure function and it should land before the route.
- I would start with the simplest v1 contract: accumulate prior turns in chronological order, append the next message, and emit a compiled instruction block for the provider request.
- I do not think we should jump to summarization logic in v1. My default is newline or structured-block concatenation with a hard turn cap.
- This is the cleanest TDD story in the slice: failing unit tests for ordering, empty state, cap enforcement, and corruption guards before implementation.

e3: `app/api/designs/[id]/chat/route.ts` as a lifted d8 pipeline.

- Manifest item: `app/api/designs/[id]/chat/route.ts`. (structured-outline.md L430)
- This is where I would be strict about reuse.
- Order should be: auth via `getSession(req)` -> `loadDesignDetail` -> stale-reference guard -> load prior chat turns -> persistGenerationStart -> build accumulated provider request -> generate -> persistGenerationResult -> write/update `chat_turns`.
- The one place I want to consciously diverge from the user's draft is write ordering for the turn itself. US-E-2 says a failed generation after persistence must still be understandable. That implies the turn record itself needs to exist before provider execution starts, with an explicit in-progress or pending-result state, then be updated once generation succeeds or fails. So I would split the "chat_turn write" into pre-generate create and post-generate finalize, even if the route still conceptually follows the d8 start/generate/result pipeline. (prd.md L641-L648, structured-outline.md L455-L459)
- I would also keep route input validation intentionally thin unless we discover a stronger existing schema pattern: reject empty string, trim whitespace, enforce max length, and return explicit failure payloads.

e4: `lifecycle.ts` extension to attach `chatTurnId` to generation lineage.

- Manifest item: `lib/designs/lifecycle.ts`. (structured-outline.md L432)
- I would keep this as small as possible.
- The existing lifecycle already owns generation row creation and final result persistence. Epic E should extend that seam just enough that a generation can be associated back to the turn that triggered it.
- My preference is passing optional `chatTurnId` through lifecycle inputs rather than creating a parallel helper tree. That keeps lineage logic in one place and avoids route-level ad hoc Firestore mutations.

e5: `ChatRefinementPanel.tsx`.

- Manifest item: `components/ChatRefinementPanel.tsx`. (structured-outline.md L429)
- This is blocked less by data plumbing than by clarity. The panel has to show ordered turns, input state, and pending/failure/success state without making the current image ambiguous.
- I would mount it inside `Confirm.tsx` below the visualizer and prompt summary, not as a new sidebar shell in v1.
- I also think wireframes are a real blocker here. There is no existing turn-history component, and the repo has no current two-column tablet shell to inherit from. So I would not let UI implementation outrun a quick layout decision.

e6: `IterationTimeline.tsx` only if Q4 resolves to "yes, the panel alone is not enough."

- Manifest item: `components/IterationTimeline.tsx` conditional. (structured-outline.md L435)
- I would not schedule this by default.
- If the chat panel can show ordered turns plus a clear "current result" marker, a second timeline strip is probably redundant for v1.
- If reviewers conclude the visualizer area needs explicit sequence context tied to image changes, then add it as a follow-on story after e5, not before.

e7: Playwright e2e on a real saved design.

- Manifest item: `tests/e2e/chat-refinement.spec.ts`. (structured-outline.md L434)
- This should verify the actual user story, not just the happy plumbing.
- I would cover first refinement, second refinement accumulation, and understandable failure presentation if the test harness can force a provider failure without turning the spec into theater.
- This story is hard-blocked on d8 merge because it depends on the real saved/reopen/regenerate contract actually existing in the app path. (brief §Epic D Dependency State)

If I compress that into a critical path, it is basically:

1. e1 schema/rules/indexes first.
2. e2 pure accumulation lib plus unit tests second.
3. e4 lifecycle seam in parallel with e3 route if the lifecycle shape is agreed.
4. e3 route once d8 contract is stable enough to copy.
5. e5 panel after the route contract is known.
6. e6 only if explicitly justified.
7. e7 last, once the end-to-end path exists.

That sequencing gives us real progress even if Epic D slips, because e1 and e2 are genuinely independent of d8 merge.

## 4. What Could Go Wrong

**HIGH** — Epic D not shipped. d8 is the direct template and FR-E-3 dependency, but d7-d9 are still in flight on `epic-d/visualizer-library`. We can outline against the d8 contract now, but route integration and e2e confidence are blocked until d8 actually lands. My mitigation is explicit dependency tagging: e1 and e2 can move now, e3+e7 should carry a visible `blocked-until: d8-merged` marker so the queue does not pretend everything is equally ready. (brief §Epic D Dependency State, prd.md L667-L699)

**HIGH** — Schedule pressure. There are 9 days to the 2026-05-10 demo, and the PRD is blunt that Epic E is the first major cut if time compresses. If Epic D burns more budget than expected, Epic E probably gets cut wholesale, not "partially kind of shipped." Mitigation: keep stories thin, keep `IterationTimeline` conditional, and do not let Epic E requirements pull Epic D back into redesign. (brief §Constraints carried into design-discussion, prd.md L975)

**MEDIUM** — Prompt accumulation sprawl. Slice 7 already calls this a silent-break risk, and I agree. The scary version is not a crash. It is the model quietly following the wrong blend of instructions after several turns, which makes the feature look flaky. I am not treating the mitigation as settled here because it is really an open decision about prompt strategy and hard caps. I surface that in Q3 instead. (structured-outline.md L458-L460)

**MEDIUM** — Orphaned turn on generation failure. The PRD explicitly says the app must make failed post-persist turns understandable. If we persist the generation first and the turn second, or if we only write the turn after success, we cannot represent that failure state cleanly. My concern is write ordering and status modeling, not provider behavior. The mitigation is to persist the turn before the provider call with an explicit pending state, then finalize success/failure afterward. (prd.md L641-L648)

**MEDIUM** — Tablet landscape layout fit. `ChatRefinementPanel` goes into `Confirm.tsx`, but the current page is not a two-column shell. On portrait-ish widths or smaller tablets, it is easy to create a cramped panel that fights the visualizer. Mitigation: start with an in-flow panel, keep the timeline optional, and reserve bigger shell changes for Epic F unless a blocker appears. (brief §UI integration surface, prd.md L683-L684)

**LOW** — Validation style drift. The repo has `zod` installed and used in places, but the generation lifecycle and design loaders already lean on manual validation patterns. If we over-engineer the chat route with a one-off schema abstraction, we risk style inconsistency for little gain. The fix is just to make an explicit decision in Q6 and stay consistent. (brief §Validation Notes)

## 5. Dependencies and Constraints

The main internal dependency is Epic D, specifically the d8 regenerate-from-stored-inputs contract. Epic E is not blocked on all of Epic D equally, but it is absolutely shaped by d8's loader and lifecycle seam. The route story and the e2e story should be treated as d8-dependent work, even if schema and accumulation stories are not. (brief §Epic D Dependency State)

The external dependencies are the same ones generation already uses: auth session handling, Firestore via Admin SDK, provider request construction, and storage-backed generation result handling. I do not see a new service dependency here. That is a good sign for cuttability. (prd.md L694-L699)

The environment constraint is tablet-first UX. This is not a desktop-only control panel. The PRD and project profile both bias toward landscape tablet behavior, so a panel that is technically functional but spatially confusing would still miss the bar. (brief §Constraints carried into design-discussion, prd.md L683-L684)

The process constraint is TDD. For this slice, that means different failing-first artifacts by layer:

- rules-lane coverage for `chat_turns` access control
- unit tests for accumulation logic
- route behavior tests where practical
- Playwright for the real multi-turn user path

The release-window constraint is the big one. Because Epic E is explicitly cuttable and the demo date is fixed at 2026-05-10, any story that starts dragging Epic D or Epic F work into its orbit should be cut or deferred fast rather than heroically expanded. (prd.md L975)

## 6. Open Questions

Q1 and Q2 must resolve before story authoring begins because they change the shape of the work, not just the implementation details.

1. **Should Epic E ship in v1 at all?** `prd.md` says Epic E is the first major cut if schedule compresses, Epic D is still incomplete, and only 9 days remain to 2026-05-10. My recommendation set for Don is:
   A. plan + ship E as the current default
   B. plan now but defer execution until Epic D ships and budget is re-evaluated
   C. cut E entirely and reinvest that budget into Epic F polish + tablet hardening
   I think A is defensible only if Epic D closes cleanly and quickly. If not, B or C is the adult call. (prd.md L975, brief §Epic D Dependency State)

2. **What is the Epic D dependency contract?** At the epic level everything points to Epic D, but the finer-grained reality is better than that. e1 and e2 can start independently. e3 needs d8's `loadDesignDetail` and generation-result contract stable. e7 needs the actual regenerate UI path proven. Should we explicitly mark e3+e7 as `blocked-until: d8-merged` so the execute queue does not pop them prematurely? I think yes. (brief §Epic D Dependency State, structured-outline.md L439-L447)

3. **Prompt accumulation strategy.** Do we want plain concat-with-newlines, structured prefix blocks, or some future summarize-prior-turns path? My current recommendation is simple structured concatenation with a hard cap of 5 turns for v1 and an explicit "session full" UX after that. I do not think LLM summarization belongs in the first cut because it adds a second hidden-behavior layer to a feature that is already prompt-sensitive. Validate or counter. (structured-outline.md L458-L460)

4. **IterationTimeline — ship or defer?** Slice 7 manifest item #8 is conditional, and the repo has no existing turn-history UI. Does `ChatRefinementPanel`'s own turn history give enough sequence clarity, or does the visualizer area need a separate timeline strip showing image progression across turns? My bias is defer unless testing shows the panel alone is not enough. (structured-outline.md L435, brief §UI integration surface)

5. **Failure UX for orphaned turns.** If a turn persists and generation fails, what is the preferred user recovery? Show the failed turn with a regenerate affordance, mark it invalid and force a fresh message, or auto-retry? I lean toward visible failed turn + explicit retry because it preserves history without pretending the provider call succeeded. (prd.md L641-L648)

6. **Should the chat route use `zod` input validation?** The brief leaves this open. My default is no for v1 unless we find a stronger route-schema precedent nearby: manual validation with trim, non-empty guard, and max length around 500 chars is probably enough and matches surrounding lifecycle style better. Validate or counter. (brief §Validation Notes)

## 7. Verification Strategy

I would keep verification narrow and layered. This is not a load-testing story. It is a correctness and clarity story.

VERIFICATION PLAN:
Tools: vitest, Playwright, Firestore rules-lane coverage
Platforms: web, tablet landscape
Automated: chat accumulation unit tests; rules-lane tests for `chat_turns`; route-path coverage where practical; Playwright e2e for a two-turn refinement flow on a real saved design
Manual: layout fit on a real tablet; prompt-coherence sanity check such as "make it more pastel" followed by "add gold accents"; failure-state readability when generation fails after turn persistence
Not verifying: load testing; prompt-token-budget behavior beyond the chosen hard cap; multi-design parallel chat sessions

Concretely, the unit lane should prove that prior turns stay in order and the compiled instruction output is deterministic. The rules lane should prove one user cannot read or create another user's turns and that allowed writes match the intended state model. The e2e lane should prove the actual product claim: first turn works, second turn accumulates, and the latest result remains understandable. (structured-outline.md L451-L459)

Manual checks still matter here because the biggest failure modes are partly perceptual. A technically correct but incoherent prompt chain, or a panel that makes the current image ambiguous on a tablet, will not be caught by narrow automated assertions alone. (prd.md L641-L648, prd.md L683-L684)

## 8. Scale Assessment

This looks like medium scope to me.

Files modified: 8 from the Slice 7 manifest, plus `lib/designs/lifecycle.ts` as the extra lifecycle extension already called out by the manifest. (structured-outline.md L428-L435)

Subsystems affected:

- data layer: Firestore rules and indexes for `chat_turns`
- API: `POST /api/designs/[id]/chat`
- lib/domain: prompt accumulation logic
- lifecycle: generation lineage attachment
- UI: chat panel and maybe timeline
- tests: unit, rules-lane, and e2e

This is definitely cross-stack work. It crosses schema, API, lifecycle, UI, and tests. That said, it is still one coherent vertical slice because every piece serves the single user behavior of iterative refinement on a saved design. (brief §Slice 7 Manifest)

Migration required: no. `chat_turns` is a net-new collection, so we are extending the model rather than rewriting existing persisted records. That reduces rollout risk quite a bit.

Cross-team coordination: effectively no in the org-chart sense, but yes in the internal planning sense because Epic E is coupled to Epic D's d8 contract and to schedule decisions about what makes the demo cut. (brief §Epic D Dependency State, prd.md L975)

Unknowns remain, but they are bounded:

- prompt accumulation correctness and hard-cap policy
- whether `IterationTimeline` is actually needed
- the exact UX for post-persist generation failure

Because those unknowns are already surfaced in the structured outline and this project already has the Slice 7 manifest and interfaces written down, I do not think we need another planning layer before decomposition. The project-level vertical plan already cut Slice 7 as a coherent unit, and the structured outline already specifies the file manifest and interface contracts. My recommendation is to skip Phase B2 and move straight to stories once Don signs off the decisions above. (structured-outline.md L420-L465)

SCALE: Medium
ROUTING: Medium + --fast (skip H/V; project H/V already cut Slice 7)
NEXT: Phase C story decomposition after Don signs off this design discussion
