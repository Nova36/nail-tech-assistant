# Codex implement prompt — story e5

You are the **frontend-developer** persona from this Hive project. Read these as your operating context — do not deviate:

- Persona file: `/Users/don/.claude/plugins/cache/plugin-hive/plugin-hive/1.2.0/hive/agents/frontend-developer.md`
- TDD step file: `/Users/don/.claude/plugins/cache/plugin-hive/plugin-hive/1.2.0/hive/workflows/steps/development-tdd/step-03-implement.md`

## Your task

Make every assertion in the e5 test files pass. Implement the minimum code that satisfies the tests. The tests are the contract. **Do NOT modify any file under `tests/`.**

## Authoritative inputs (read these first, in order)

1. **Story spec** — `.pHive/epics/epic-e-chat-refinement/stories/e5-chat-refinement-panel-integration.yaml`
2. **Dev brief** — `.pHive/epics/epic-e-chat-refinement/docs/e5-dev-brief.md` — full file-by-file acceptance, layout split, type contracts, gates.
3. **Wireframe manifest** (decisions locked) — `.pHive/wireframes/epic-e-chat-refinement/manifest.yaml`
4. **Wireframes** — `.pHive/wireframes/epic-e-chat-refinement/wireframes.html` — Layout A (right-side drawer), failure-UX option 2 (system-message-retry), iteration-timeline separate-component variant, phone tablet-only redirect.
5. **Brand tokens** — `.pHive/brand/brand-system.yaml`. Use existing token names. Do not invent colors.

## Test files you must satisfy (read-only — do not edit)

- `tests/unit/components/ChatRefinementPanel.test.tsx`
- `tests/unit/components/IterationTimeline.test.tsx`
- `tests/unit/designs/loadChatTurns.test.ts`
- `tests/unit/design-page/Confirm.success-path.test.tsx` (e5 cases at the bottom of the existing file)
- `tests/unit/design-page/page.reopen.test.tsx` (e5 cases at the bottom)
- `tests/integration/design-detail/generation-flow.test.tsx` (e5 cases at the bottom)

## Files you will create or modify (production code)

| File                                                | Op   | Purpose                                                                                                                                          |
| --------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/ChatRefinementPanel.tsx`                | new  | drawer chat panel — turn list + system-message-retry block + input                                                                               |
| `components/IterationTimeline.tsx`                  | new  | 60×60 thumbnail strip below visualizer                                                                                                           |
| `lib/designs/loadChatTurns.ts`                      | new  | server-only Admin SDK reader for `designs/{id}/chat_turns`                                                                                       |
| `lib/firestore/converters/chat-turns.ts`            | new  | converter; mirrors `designs.ts` pattern, strips `id` on toFirestore                                                                              |
| `lib/firestore/converters/index.ts`                 | edit | re-export `chatTurnConverter`                                                                                                                    |
| `app/(authenticated)/design/[designId]/Confirm.tsx` | edit | accept `initialChatTurns` + `designName` props; mount panel as drawer; mount timeline below visualizer; visualizer image override on turn-select |
| `app/(authenticated)/design/[designId]/page.tsx`    | edit | hydrate `initialChatTurns` via `loadDesignChatTurns`; pass `designName`; swallow chat-load errors                                                |

## Hard constraints (these have all bitten this codebase before — do NOT repeat)

1. **No `@ts-nocheck` / `@ts-expect-error` / `@ts-ignore`** in production code. If TS complains, fix the type, not the comment.
2. **No `declare module 'X'` global module-augmentation hacks.** Use proper types.
3. **Do NOT create test shims**, do NOT patch anything inside `node_modules/`, do NOT add new vitest config aliases.
4. **`server-only` import** at top of `lib/designs/loadChatTurns.ts` (the project already aliases it for the rules-lane via `vitest.config.rules.ts`).
5. **`@vitest-environment node`** is already on `tests/unit/designs/loadChatTurns.test.ts`. Don't change it.
6. **`tests/integration/design-detail/generation-flow.test.tsx`** is jsdom by default. Don't add a node directive.
7. **RegenerateButton stays** in the success branch as a sibling to the chat panel — the existing JSX block at `Confirm.tsx:254-281` keeps its function. The chat panel is layered on top, not a replacement.
8. **Visualizer image override**: when the user selects a non-latest turn, the `<img>` inside `<VisualizerFrame>` (`Confirm.tsx:236-242`) sources from that turn's `imageUrl`. When `viewingTurnIndex === null`, it sources from the original generation result (`state.imageUrl`).
9. **Phone scope**: hide the chat panel on viewports < 640px (Tailwind `hidden md:flex` or equivalent). Chat panel and IterationTimeline are tablet+ only.
10. **System block: collapsed-aggregate.** A single `role="status"` block above the input area lists every unresolved failed turn. ONE block per panel, not one per failed row.
11. **`Comparing turn NN`** badge label uses 2-digit zero-padded turn index based on chronological position (1-indexed). i.e. the second-from-list turn → `Comparing turn 02`.

## Acceptance gates — these must all pass before you stop

1. `pnpm tsc --noEmit` exits 0
2. The 6 test files listed above all pass with 0 failures
3. `pnpm prettier --check` is clean on every file you touched (run `pnpm prettier --write` on touched files if needed, then re-check)
4. No file under `tests/` was modified

If you hit a test that seems wrong, **stop and document it** in your final summary — do not modify the test.

## How to run tests during your loop

```bash
pnpm vitest run \
  tests/unit/components/IterationTimeline.test.tsx \
  tests/unit/components/ChatRefinementPanel.test.tsx \
  tests/unit/designs/loadChatTurns.test.ts \
  tests/unit/design-page/Confirm.success-path.test.tsx \
  tests/unit/design-page/page.reopen.test.tsx \
  tests/integration/design-detail/generation-flow.test.tsx
```

## Final output

When all gates are green, print this block exactly:

```
[E5-CODEX-COMPLETE]
typecheck: pass
tests: pass
prettier: pass
test_files_modified: none
files_changed:
  - <one path per line>
```

If any gate fails after your iteration budget, print:

```
[E5-CODEX-BLOCKED]
gate_failed: <typecheck | tests | prettier>
reason: <one-line summary>
diagnostic: <relevant error excerpt>
```

Do not commit or push — the orchestrator handles git.
