# e5 — ChatRefinementPanel + /design/[id] Integration · Dev Brief

> Codex implement target. TDD: tests already failing on disk before codex starts. Codex's job = make every assertion pass without modifying any test file.

## Decisions locked (from `.pHive/wireframes/epic-e-chat-refinement/manifest.yaml`)

| #   | Decision                      | Choice                                                                            |
| --- | ----------------------------- | --------------------------------------------------------------------------------- |
| 1   | tablet-landscape-layout       | right-side drawer                                                                 |
| 2   | iteration-timeline-separation | separate component (`IterationTimeline.tsx`)                                      |
| 3   | orphaned-turn-failure-ux      | system-message-retry, **collapsed-aggregate** (one block, not per-row)            |
| 4   | current-image-indicator       | user-selectable; badge label = `Current` (latest) / `Comparing turn NN` (earlier) |
| 5   | phone-scope                   | tablet-only; sub-640px → read-only redirect notice, no chat panel                 |

**RegenerateButton stays in the left column as P0 fallback.** Chat panel layers on top, does not replace it.

---

## Files to create

### 1. `components/ChatRefinementPanel.tsx` (new)

Client component. Props:

```ts
export type ChatRefinementPanelProps = {
  designId: string;
  designName?: string | null;
  initialChatTurns: ChatTurnView[];
  onTurnImageSelect: (turn: ChatTurnView | null) => void;
  /**
   * Surface index of the turn currently being viewed (matches the visualizer
   * image). null when viewing the latest successful turn (default).
   */
  viewingTurnIndex: number | null;
};

export type ChatTurnView = {
  id: string;
  message: string;
  status: 'pending' | 'success' | 'failed';
  generationId: string | null;
  imageUrl: string | null; // resolved server-side; null for pending/failed
  createdAt: string;
};
```

UI structure (tablet-only render — caller hides on phone):

- **Header**: eyebrow `Refine with chat`, title `{designName}`, counter `{turns}/5 turns`, context line.
- **Empty state** (no turns): hint copy + 3 example chips (`make it more pastel`, `add gold accents`, `shorter, almond shape`). Chips do NOT auto-submit; clicking one populates the input.
- **Turn list**: ordered turns, one row per turn. Row = `[NN] [badge: Success | Sent | Generating]` + optional `[Current]` or `[Comparing turn NN]` badge + relative time + message text. Clicking a row calls `onTurnImageSelect(turn)`. Failed turn rows render the neutral `Sent` badge — no red on the row.
- **System block** (renders only when ≥1 unresolved failed turn exists in current session):
  - Sticky-ish above the input area.
  - One entry per unresolved failed turn: `Turn NN didn't generate · Retry · dismiss`.
  - `Retry` → POST `/api/designs/[id]/chat` with `{ retryTurnId: turn.id }` (route already accepts this from e4).
  - `dismiss` → local-only; removes entry from block, leaves turn row alone.
- **Input area**: textarea (max 500 chars), char counter, footer (`Enter to send · Shift+Enter for newline`), Send button.
  - **Disabled when**: any turn is `pending` (generating) OR session is full (5 turns).
  - **Session-full state**: replaces input affordance with `Session full. ... start a new design from this` link.

A11y:

- Turn list = `role="list"`, each row = `role="listitem"`.
- Pending turn row carries `aria-live="polite"` so the badge transition is announced.
- System block has `role="status"` + destructive-tone copy.
- Send button has `aria-disabled` when blocked, with a visible reason in tooltip/footer.

### 2. `components/IterationTimeline.tsx` (new)

Client component. Props:

```ts
export type IterationTimelineProps = {
  turns: ChatTurnView[];
  viewingTurnIndex: number | null; // null = latest successful
  onTurnSelect: (turn: ChatTurnView | null) => void;
};
```

UI:

- Horizontal strip pinned below the visualizer area (inside the left column).
- Cell size 60×60. One cell per turn, in chronological order.
- Cell states (visual only — no per-state copy on the strip):
  - `success` → thumbnail of generated image (via `imageUrl`)
  - `pending` → animated stripe pattern (use existing motion-safe class)
  - `failed` → diagonal stripe + small `!` glyph in muted tone
  - `current` (latest successful, viewingTurnIndex === null) → primary border ring + `Current` micro-label
  - `comparing` (viewingTurnIndex matches this cell) → primary border ring + `Comparing` micro-label
- Clicking a cell → `onTurnSelect(turn)`. Clicking the cell that's already current/comparing → `onTurnSelect(null)` to return to latest.
- A11y: `role="tablist"`, each cell = `role="tab"` with `aria-selected`. Keyboard: arrow keys move selection.

### 3. `lib/designs/loadChatTurns.ts` (new)

Server-only module (`import 'server-only'` at top). Exports:

```ts
export async function loadDesignChatTurns(input: {
  designId: string;
  userId: string;
}): Promise<ChatTurnView[]>;
```

Implementation:

- Admin SDK via `createServerFirebaseAdmin()`.
- Query `designs/{designId}/chat_turns` ordered by `createdAt ASC`, capped at 5.
- For each turn with `generationId`, batch-load `generations/{id}` via Admin SDK and resolve `resultStoragePath` through `resolveImageUrl`. Pending and failed turns get `imageUrl: null`.
- Cross-user safety: if any turn's `userId !== input.userId`, log `[loadChatTurns] cross-user turn dropped` and exclude it.
- All errors swallowed with structured log + return `[]` (panel renders empty state, page still loads).

### 4. `lib/firestore/converters/chat-turns.ts` (new) + barrel update in `index.ts`

Match the existing converter pattern in `designs.ts`. Strip `id` on `toFirestore`. Re-export from `lib/firestore/converters/index.ts`.

---

## Files to modify

### `app/(authenticated)/design/[designId]/Confirm.tsx`

- Add prop `initialChatTurns: ChatTurnView[]` (defaulted `[]` for backwards safety).
- Add prop `designName?: string | null`.
- Wrap success-branch children in a 2-column grid:
  - Left column (60% landscape, 56% portrait, 100% phone): existing visualizer + prompt block + RegenerateButton + Back-to-adjust + new IterationTimeline pinned below VisualizerFrame.
  - Right column (40% / 44% / hidden): ChatRefinementPanel.
- Phone (≤640px): chat panel hidden via Tailwind `hidden md:flex` (or equivalent breakpoint utility). On phone, render a separate `<PhoneRedirectNotice>` near the back-to-adjust button reading "Refinement chat works best on tablet — open this design on your iPad."
- New local state:
  - `chatTurns: ChatTurnView[]` (seeded from `initialChatTurns`)
  - `viewingTurnIndex: number | null` (null = latest successful)
- When user clicks a turn or timeline cell with non-null generationId, override `state.imageUrl` (visualizer image) with that turn's resolved URL until they pick latest again.
- Existing generation state machine (`idle | pending | success | failure`) is **untouched**. Chat panel manages its own per-turn state.

### `app/(authenticated)/design/[designId]/page.tsx`

- Import `loadDesignChatTurns`.
- After `loadDesignDetail` resolves, also `loadDesignChatTurns({ designId, userId: session.uid })`.
- Pass result as `initialChatTurns` to `<Confirm>`.
- Pass `designName={designDetail.design.name}`.
- Errors from chat-turns load must NOT block the page — fall through with `[]`.

---

## Test plan (TDD-red before codex)

All test files written by orchestrator BEFORE codex runs. Codex must NOT modify test files.

### New component tests

- **`tests/unit/components/ChatRefinementPanel.test.tsx`** (new file)
  - Renders empty state with 3 example chips when `initialChatTurns: []`.
  - Renders ordered turn rows by `createdAt`.
  - Failed turn row uses neutral `Sent` badge (NOT `Failed`).
  - System block aggregates 2+ failed turns into one block above input; each entry has Retry + dismiss.
  - Dismiss removes entry from block, does not retry.
  - Input disabled when any turn is `pending`.
  - Session full (5 turns) → replaces input with locked notice.
  - Clicking a turn row → calls `onTurnImageSelect` with that turn.
  - Badge label switches `Current` → `Comparing turn 03` when `viewingTurnIndex === 2`.

- **`tests/unit/components/IterationTimeline.test.tsx`** (new file)
  - Renders one cell per turn in chronological order.
  - Cell with `viewingTurnIndex === null` AND highest-index successful turn shows `Current` micro-label.
  - Cell matching `viewingTurnIndex` shows `Comparing` micro-label.
  - Clicking a cell → `onTurnSelect(turn)`. Clicking the active cell → `onTurnSelect(null)`.
  - Failed cell renders stripe + `!` glyph.
  - `role="tablist"` + `role="tab"` + `aria-selected` are correct.

### Extend existing test lanes

- **`tests/unit/design-page/page.reopen.test.tsx`** (extend)
  - Mock `loadDesignChatTurns` to return 2 turns.
  - Assert `<Confirm>` receives `initialChatTurns` prop with those 2 turns.
  - Assert page still renders when `loadDesignChatTurns` rejects (no throw bubbles).

- **`tests/unit/design-page/Confirm.success-path.test.tsx`** (extend)
  - When `initialChatTurns: []`, ChatRefinementPanel still renders (empty state).
  - When `initialChatTurns` has turns, panel renders the turn list.
  - Clicking a non-current successful turn → visualizer image updates to that turn's `imageUrl`.
  - Clicking the active timeline cell → visualizer reverts to latest.

- **`tests/integration/design-detail/generation-flow.test.tsx`** (extend)
  - Existing flows still pass.
  - With `initialChatTurns` populated, regenerate button still works (P0 fallback preserved).

### New server-reader test

- **`tests/unit/designs/loadChatTurns.test.ts`** (new file, `node` env)
  - Stubs Admin SDK + `resolveImageUrl`.
  - Reads `designs/{id}/chat_turns` ordered correctly.
  - Resolves `imageUrl` only for turns with non-null `generationId`.
  - Drops cross-user turns + logs.
  - Returns `[]` on Admin SDK throw (no rethrow).

---

## Acceptance gates (gating commit)

1. `pnpm tsc --noEmit` exits 0.
2. `pnpm vitest run tests/unit/components/ChatRefinementPanel.test.tsx tests/unit/components/IterationTimeline.test.tsx tests/unit/designs/loadChatTurns.test.ts tests/unit/design-page/Confirm.success-path.test.tsx tests/unit/design-page/page.reopen.test.tsx tests/integration/design-detail/generation-flow.test.tsx` exits 0 with all assertions green.
3. `pnpm prettier --check` exits 0 on all changed files.
4. No new test file modified by codex (orchestrator owns the test surface).

## Out of scope for e5

- Playwright happy-path (that's e6).
- Animation polish beyond `motion-safe:` defaults — animations-specialist sidecar at review will surface gaps; codex doesn't pre-optimize.
- Phone-first chat panel (deferred per decision 5).
- Pinterest/reference re-edit from inside the chat panel.

## Memory pointers

- `feedback_animations_sidecar_review.md` — sidecar runs at review step, not pre-implement.
- `feedback_implement_typecheck_circuit_breaker.md` — codex `status:completed` + `typecheck:false` = repair signal.
- `feedback_test_file_extension_lane.md` — `.test.tsx` for component lanes; `.test.ts` for rules-lane only.
- `feedback_jsdom_FormData_node_env.md` — server-reader test uses `@vitest-environment node` directive.
- `feedback_actions_file_transitive_env.md` — design page tests must stub `PINTEREST_ACCESS_TOKEN` if they import the actions module path transitively.
