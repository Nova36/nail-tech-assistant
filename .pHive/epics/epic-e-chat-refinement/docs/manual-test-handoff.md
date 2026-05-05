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

**Surface:** Pure library at `lib/designs/chat-refinement.ts`. Validated via
`tests/unit/designs/chat-accumulation.test.ts` (11 tests). Run with
`pnpm exec vitest run tests/unit/designs/chat-accumulation.test.ts`.

**Public API:**

- `type ChatTurn` — canonical persistence shape mirror.
- `class EmptyMessageError extends Error` — thrown on empty/whitespace next message.
- `accumulateChatInstructions({ priorTurns, nextMessage }) → { compiledPrompt, sessionFull? }`.

### Happy path

- 0 prior turns + valid next → single `[Refinement 1]: <msg>` block.
- N prior turns (1 ≤ N ≤ 4) + valid next → N+1 chronological blocks joined by `\n`.

### Edge cases

- Whitespace-only next message → `EmptyMessageError` thrown synchronously, no prompt emitted.
- Prior turns with surrounding whitespace in `message` → trimmed in compiled output.
- Caller-supplied prior-turn order is preserved verbatim — the lib does NOT re-sort by
  `createdAt` (callers own ordering, e.g., e4 route loads with `orderBy('createdAt', 'asc')`).
- Boundary: 4 prior turns + new → emits `[Refinement 5]`, no `sessionFull` signal.
- Boundary: 5 prior turns + new → returns `sessionFull: true`, `compiledPrompt` covers
  the 5 prior turns only, the would-be `[Refinement 6]` is NOT in the output.

### Security probes

- N/A — pure function with no external surface, no Firestore, no provider call.
- Adversarial input via `message` strings (e.g., shell metacharacters, prompt-injection
  patterns) is the responsibility of the e4 route layer + the provider sandbox; e2 only
  composes deterministic strings.

### Regression watches

- The lib must remain free of `server-only`, Firestore SDK, `firebase-admin`, `next/*`,
  or provider imports. A regression here would force the file out of the unit lane.

### Handoff notes for `/plugin-hive:test`

- Treat `sessionFull` as a hard cap. If the testing hive simulates a 6th-turn user input,
  expect the UI in e5 to surface a banner — not a silent truncation.
- The structured prefix `[Refinement N]:` is API-level contract; downstream stories
  (e4 prompt assembly, Playwright snapshots) lock the format.

## e3 — lifecycle.ts chat-turn lineage attachment

**Surface:** `persistGenerationResult` in `lib/designs/lifecycle.ts` extended with optional
`chatTurnId`. Validated via `tests/unit/designs/lifecycle-chat.test.ts` (4 tests) and the
preserved `tests/unit/designs/persist-generation-result.test.ts` (7 tests, no regression).

### Happy path

- Chat-driven success (chatTurnId present): one `runTransaction` callback issues 3 atomic
  `txn.update` calls — generation `{status, resultStoragePath, chatTurnId, updatedAt}`,
  design `{latestGenerationId, updatedAt}`, chat_turn `{generationId, status: 'success',
updatedAt}`.
- Non-chat success (chatTurnId omitted): exactly 2 `txn.update` calls (generation + design).
  No chat_turn ref is constructed and no chat_turns subcollection is touched.

### Edge cases

- Provider failure with chatTurnId: generation row is patched to include `chatTurnId` so
  failed generations remain queryable by chat lineage. The chat_turn doc itself is NOT
  touched at lifecycle layer — e4 owns the orphan-prevention `'failed'` status update.
- Storage rescue with chatTurnId: the rescue patch also tags `chatTurnId` so the failure
  row is consistent.
- Firestore txn fails after storage upload: existing single error log preserved with
  `code` + `message` keys.

### Security probes

- Confused-deputy / cross-tenant: lifecycle does NOT verify chatTurnId belongs to the
  same `(userId, designId)`. The route layer (e4) MUST gate this. If e4 ever calls
  lifecycle with a forged chatTurnId, the transaction would write to the wrong chat_turn
  doc — but Security Rules at `designs/{designId}/chat_turns/{turnId}` deny cross-user
  access at the rule layer, so the txn would fail and roll back cleanly.
- Path traversal: chat_turn ref is constructed via `db.collection('designs').doc(designId)
.collection('chat_turns').doc(chatTurnId)` — no string concat.
- Generation row pollution: an arbitrary `chatTurnId` value lands in the generation patch
  unmodified. e4 must validate format/ownership before passing in.

### Regression watches

- `persist-generation-result.test.ts` 7/7 green — non-chat success/failure paths unchanged.
- `pnpm typecheck` clean — `chatTurnId?: string` widening is the only signature change.

### Handoff notes for `/plugin-hive:test`

- Simulate a failed Firestore txn after storage success with `chatTurnId` present →
  expect `firestore_failure` reason in result, expect log entry with `[lifecycle]
firestore transaction failed after storage write succeeded` + `code` + `message`.
- The 3-doc atomicity is the AC1 hinge — any test that catches a partial write would
  flag a regression.

## e4 — POST /api/designs/[id]/chat route

_Populated at e4 integrate step._

## e5 — ChatRefinementPanel + /design/[id] integration

_Populated at e5 integrate step (post-wireframe gate)._

## e6 — Playwright chat-refinement.spec.ts e2e

_Populated at e6 integrate step._
