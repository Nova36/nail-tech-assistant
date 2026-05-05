# Epic E — Manual Test Handoff for `/plugin-hive:test`

**Purpose:** Per-story manual test scenarios captured during execution so the
testing hive can produce simulated user walkthroughs, edge-case probes, and
security-relevant flows without re-deriving them from the code.

**How to consume:** After PR1 backend ships, run
`/plugin-hive:test --target epic-e-chat-refinement --include backend` against
this doc as the scenario seed. After PR2 ships, re-run with `--include ui,e2e`.

**Convention:** Each story section lists:

- **Happy path** — the primary user journey
- **Edge cases** — boundary conditions worth probing
- **Security probes** — input/auth/authz adversarial cases
- **Regression watches** — unrelated paths that must remain green

---

## e1 — chat_turns persistence (schema + rules + indexes)

**Surface:** Firestore Security Rules + indexes. Validated via `tests/rules/chat-turns.rules.test.ts`
(16 tests) and `tests/rules/indexes.test.ts` (4 structural tests). Run with `pnpm test:rules`.

**Storage shape (locked):**
`{ userId, designId, message, status, generationId|null, createdAt, updatedAt }` at
`designs/{designId}/chat_turns/{turnId}`.

### Happy path

- Authenticated owner of a parent design creates a chat_turn whose `userId` matches `request.auth.uid`
  and whose `designId` matches the parent path → ALLOWED.
- Owner reads their own chat_turn → ALLOWED.
- Owner advances lifecycle: update with diff `{status, generationId, updatedAt}` only → ALLOWED.
- Owner deletes their chat_turn → ALLOWED.

### Edge cases

- Mismatched `designId` in payload vs. URL path → DENIED on create (path consistency check).
- Concurrent write across two designs by same user → independent docs, no cross-contamination.
- Update with empty diff (no fields changed) → vacuously ALLOWED by hasOnly() (verify behavior).
- Delete on a chat_turn whose parent design was already deleted → still ALLOWED for owner since
  the rule reads `resource.data.userId` (no parent lookup).

### Security probes

- Token forgery: client sends `userId: alice` while auth.uid = bob → DENIED (cross-user).
- Field smuggling: update with `{status: 'success', userId: bob}` → DENIED (userId immutable).
- Field smuggling: update with `{message: 'edited'}` → DENIED (message frozen).
- Field smuggling: update with `{rogueField: 'x', updatedAt: ...}` → DENIED (whitelist).
- Anonymous client tries any operation → DENIED.
- Read sibling unknown subcollection (`designs/{id}/unknown_sub/x`) → DENIED (default-deny).
- Collection-group query without auth → DENIED.

### Regression watches

- `tests/rules/designs-shape-rule.test.ts` must remain green (parent designs rules untouched).
- `tests/rules/generations-update-rule.test.ts` and friends (Epic C lanes) must remain green.
- `tests/rules/indexes.test.ts` shape guard must remain green after the new entry.

### Handoff notes for `/plugin-hive:test`

- Scope this story's manual tests to rules-lane only — no UI surface here.
- "Evaluation error @ L56" warnings in test output are benign — the parent `designs/{id}` update
  clause references field shapes not present on chat_turn docs, so it short-circuits to false and
  default-deny catches. Tests pass; logs are noisy by design.

## e2 — chat-refinement.ts accumulation lib + ChatTurn type

_Populated at e2 integrate step._

## e3 — lifecycle.ts chat-turn lineage attachment

_Populated at e3 integrate step._

## e4 — POST /api/designs/[id]/chat route

_Populated at e4 integrate step._

## e5 — ChatRefinementPanel + /design/[id] integration

_Populated at e5 integrate step (post-wireframe gate)._

## e6 — Playwright chat-refinement.spec.ts e2e

_Populated at e6 integrate step._
