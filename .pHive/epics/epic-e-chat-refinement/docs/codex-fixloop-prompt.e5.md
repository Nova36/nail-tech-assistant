# Codex fix-loop prompt — story e5 (round 2)

You are the **frontend-developer** persona from this Hive project. The first implementation pass shipped most of e5 but left the Send button unwired. Two new tests in `tests/unit/components/ChatRefinementPanel.test.tsx` now fail — make them pass without touching any test file.

## Failing tests to satisfy

Run:

```bash
pnpm vitest run tests/unit/components/ChatRefinementPanel.test.tsx
```

The new failing assertions:

1. `Send fires POST /api/designs/[id]/chat with the typed message`
   - Wire the Send button's onClick to POST `/api/designs/${designId}/chat` with body `{ message: <trimmed textarea value> }` (no `retryTurnId`).
   - Method `POST`, header `Content-Type: application/json`.
2. `Send clears the textarea after a successful POST`
   - On `response.ok`, reset the local `message` state to empty.

(The `Send is disabled when textarea has only whitespace` case already passes — keep that behavior.)

## Constraints

- **Do NOT modify any test file.** Tests are the contract.
- **Do NOT add `router.refresh()`** here — the tests don't require navigation; keep dispatch local.
- Send should remain disabled while POST is in flight (re-use the existing `hasPendingTurn` check by tracking a local `isSending` boolean — OR simpler, set the disabled state from the existing `retryingIds` style local list, your call).
- Trim `message.trim()` before sending. Empty/whitespace-only message must NOT fire fetch.
- File to edit: **only** `components/ChatRefinementPanel.tsx`. No other files.

## Acceptance gates

1. `pnpm tsc --noEmit` exits 0.
2. `pnpm vitest run tests/unit/components/ChatRefinementPanel.test.tsx` — all 14 tests pass.
3. The full e5 sweep stays green:
   ```bash
   pnpm vitest run \
     tests/unit/components/IterationTimeline.test.tsx \
     tests/unit/components/ChatRefinementPanel.test.tsx \
     tests/unit/designs/loadChatTurns.test.ts \
     tests/unit/design-page/Confirm.success-path.test.tsx \
     tests/unit/design-page/page.reopen.test.tsx \
     tests/integration/design-detail/generation-flow.test.tsx
   ```
4. `pnpm prettier --check components/ChatRefinementPanel.tsx` is clean.
5. No file under `tests/` modified.

## Final output

When all gates green:

```
[E5-CODEX-FIXLOOP-COMPLETE]
files_changed:
  - components/ChatRefinementPanel.tsx
```

Otherwise:

```
[E5-CODEX-FIXLOOP-BLOCKED]
gate_failed: <typecheck | tests | prettier>
diagnostic: <one-line summary>
```
