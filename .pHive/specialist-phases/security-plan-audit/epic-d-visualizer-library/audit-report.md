# Security Plan-Audit — Epic D

**Auditor:** architect
**Date:** 2026-05-01
**Scope:** d2, d6, d7, d8, d9 cumulative firestore.rules surface

## VERDICT: revise-required

**Blocking finding:** Owner-identity field name drift between existing rules/converter (`userId`) and story YAML intent (`ownerUid`). Three stories (d2, d9, and d9's implement block) reference `ownerUid` — a field that does not exist on any Firestore document in this app. If stories write rules using `ownerUid`, every rule clause will silently evaluate as `undefined == request.auth.uid` → `false`, denying ALL access including legitimate owners.

---

## A. Per-story soundness

### d2 — PATCH /api/designs/[id]/shape

- Auth gate: implied (story says "owner-only PATCH"). No explicit rule draft in YAML — only code_example shows `affectedKeys().hasOnly(['nail_shape', 'updatedAt'])`.
- Owner check: story says "authenticated owner" but doesn't prescribe field name in the rule. The implement step says to update `firestore.rules` — field name choice is left to the implementer. **Risk:** implementer may pick `ownerUid` (seeing d9's intent) rather than the canonical `userId`.
- Field-scope: `affectedKeys().hasOnly(['nail_shape', 'updatedAt'])` — correct and tight.
- Cross-user denial: existing baseline deny is the catch-all; the field-scope rule is additive and won't open cross-user access.
- Read surface: d2 does not modify read rules. ✓
- **Finding (soft):** Add an explicit field-name note (`userId`, not `ownerUid`) in the d2 implement step before dispatch.

### d6 — GET /api/designs/[id]

- Auth gate: existing rule at `/designs/{designId}` requires `request.auth != null`. ✓
- Owner check: existing rule uses `resource.data.userId == request.auth.uid`. ✓
- Read-only: the implement step says "verify owner-read on /designs/{id} + /references; update only if missing." The existing baseline already covers both. No new rule needed unless the baseline is changed.
- References collection: existing `/references/{refId}` rule gates on `resource.data.userId == request.auth.uid`. This is the **document owner's userId**, not the parent design's owner. If a reference was saved by the same user (invariant from epic C ingest), this is safe. Cross-reference ownership drift is explicitly called out in the baseline comment as "validated at ingest by c8/c9, NOT here."
- **Finding (soft):** d6 likely needs no rule change. The implement step hedges with "verify/update if missing" — confirm in research step and treat as a no-op if baseline already covers it.

### d7 — POST /api/designs/[id]/save (rename)

- Auth gate: required (story AC #5 says cross-user → 403/rules denial). ✓
- Owner check: implement step says "persist via Firestore Admin with field-scoped write" AND "Update firestore.rules for /designs/{id} write to allow `name` + `updatedAt` only via this route's path pattern (or rely on field-diff hasOnly)."
- Field-scope: `affectedKeys().hasOnly(['name', 'updatedAt'])` — correct.
- **Critical ambiguity:** "via this route's path pattern" — Firestore rules have no awareness of HTTP route paths. Rules can only inspect the doc diff. If the implementer attempts to gate by path, this is a misunderstanding of Firestore rules semantics. The `hasOnly` diff-key approach is the correct one.
- **Finding (soft):** Strike "via this route's path pattern" from the implement instruction before dispatch; replace with explicit `hasOnly(['name', 'updatedAt'])` diff constraint.

### d8 — POST /api/designs/[id]/regenerate

- Auth gate: Admin SDK is used server-side; rules are bypassed for all writes (persistGenerationStart/persistGenerationResult go through Admin). ✓
- The story's `files_to_modify` says: "deny direct mutation of `latestGenerationId` / `generations` rows from client; verify; epic C may already cover this."
- **Verified:** Epic C baseline already has `/generations/{generationId}` with `allow create/update/delete: if request.auth != null && resource.data.userId == request.auth.uid`. This allows authenticated owners to write generation rows directly from the client — it does NOT restrict to server-only. This is the correct pre-existing posture: no rule change needed for d8.
- The story's "deny direct client mutation" goal is already met by the design invariant (Admin SDK bypasses rules; client SDK writes would hit rules, but the app doesn't expose a client SDK write path for generations). No rule tightening is available in Firestore rules that distinguishes Admin SDK from client SDK.
- **Finding (info):** The rule comment in the baseline ("Lifecycle status transitions are NOT enforced here; c15 owns that") is still accurate. d8 needs no rule change. The implement step's "verify; epic C may already cover" is the right hedge — it will verify as covered.

### d9 — /library grid + list query

- Auth gate: required.
- Owner check: implement step says "allow where ownerUid == request.auth.uid" — **HARD BLOCKER.** The field is `userId`, not `ownerUid`. This would write a broken rule that denies all list access.
- Read surface: list queries require a rule that matches the `where` clause. The existing `allow read` clause on `/designs/{designId}` covers single-document reads but **does not cover collection-level list queries** where the client SDK filters client-side. For a server component using Admin SDK, rules are bypassed entirely — but if the rules-lane test uses a client SDK emulator assertion against a list query, the rule must be present.
- **Finding (hard):** d9 implement + rules-lane test must use `userId`, not `ownerUid`. The implement step must be corrected before dispatch.

---

## B. Cross-story interaction

### d2 + d7 field-scoped update coexistence

- d2 adds: `allow update: if ... && affectedKeys().hasOnly(['nail_shape', 'updatedAt'])`
- d7 adds: `allow update: if ... && affectedKeys().hasOnly(['name', 'updatedAt'])`
- Firestore evaluates `allow` clauses disjunctively — any matching clause grants. These two clauses are safe to coexist as separate `allow update` conditions.
- **Collision risk:** A client that sends `{nail_shape: ..., name: ..., updatedAt: ...}` (3-key diff) would be denied by both clauses (neither `hasOnly` matches). This is the correct behavior — no rule gap.
- **No collision.** ✓

### d2/d7 vs existing Epic C update rule

- Existing baseline: `allow update: if request.auth != null && resource.data.userId == request.auth.uid && request.resource.data.userId == resource.data.userId`
- This existing clause allows ANY field update by the owner (only constraint is userId immutability).
- **HARD BLOCKER:** Adding `hasOnly` field-scoped clauses alongside the existing permissive update rule is **ineffective**. The existing rule already grants update permission for any field to the owner. The field-scoped d2/d7 rules would be redundant — the existing clause always fires first (or simultaneously, since evaluation is disjunctive).
- **Fix required:** The existing `/designs/{designId} allow update` clause must be **replaced** by the union of the field-scoped clauses from d2 + d7 (plus any other legitimate update surface). Simply adding `hasOnly` clauses does NOT tighten security while the permissive clause exists.

### d6 + d9 read coexistence

- d6 uses single-doc read (existing rule covers). ✓
- d9 uses list query — requires a separate explicit list-read rule or the existing single-doc rule must be broadened.
- **Finding:** The existing `/designs/{designId}` rule covers document reads but list queries in Firestore rules require a match on `request.auth.uid` in the `where` clause. For Admin SDK list queries (server component), rules don't apply. For rules-lane emulator tests using the client SDK, the rule must explicitly permit the list. Recommend adding: `allow list: if request.auth != null && request.auth.uid == resource.data.userId` or using `allow read` (which covers both get and list) scoped properly.

---

## C. Owner-identity contract

**HARD BLOCKER — drift confirmed.**

| Location                                                       | Field name                                   |
| -------------------------------------------------------------- | -------------------------------------------- |
| `firestore.rules` (baseline, all collections)                  | `userId`                                     |
| `lib/firestore/converters/designs.ts`                          | `userId`                                     |
| `lib/firestore/converters/references.ts` (inferred from rules) | `userId`                                     |
| d2 YAML rule intent                                            | not explicit — **risk of implementer drift** |
| d7 YAML rule intent                                            | not explicit — risk                          |
| d9 YAML implement block                                        | **`ownerUid`** ← WRONG                       |
| d9 YAML code_examples                                          | not shown                                    |

The d9 implement step says "allow where ownerUid == request.auth.uid" — this is incorrect. The canonical field is `userId` throughout the existing rules and converter. Any rule written with `ownerUid` will silently deny all access.

**Required correction:** d9 implement step must replace `ownerUid` with `userId` before dispatch.

---

## D. List query scope (d9)

- d9's list query: `where userId == request.auth.uid ORDER BY createdAt DESC` (inferred from `firestore.indexes.json`).
- Index: `firestore.indexes.json` already has a composite index on `designs`: `userId ASC + createdAt DESC`. ✓ — this index covers the expected query.
- Rule matchability: Firestore list rules with `request.auth.uid` in the `where` clause are matchable. The existing single-doc `allow read` does NOT automatically cover list queries in the client SDK emulator. Recommend explicit `allow list` or broadening `allow read` to cover list at the collection level.
- **Finding:** Index is present. Rule coverage for list needs explicit addition (see B above).

---

## E. Server-side bypass

| Story              | Firestore access                                                                                                                                                                                                                                                        | Rules needed?                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| d2 PATCH shape     | **Ambiguous.** Story says PATCH route, auth via `getSession(req)`. Code example implies `affectedKeys()` rule — this is a client-rule pattern. If the route uses Admin SDK, the rule is redundant but harmless. If the route uses client SDK, the rule is load-bearing. | Verify in research step.                                                   |
| d6 GET design      | Admin SDK (specified: "load via Firestore Admin SDK with converter"). Rules bypassed for the server read. Rules-lane tests use client emulator to assert the rule independently.                                                                                        | Rules needed for rules-lane test validity only.                            |
| d7 POST rename     | Admin SDK (specified: "Persist via Firestore Admin with field-scoped write").                                                                                                                                                                                           | Same as d6.                                                                |
| d8 POST regenerate | Admin SDK (lifecycle.ts).                                                                                                                                                                                                                                               | No client-side write path. Rule verification is informational only.        |
| d9 library list    | Admin SDK (server component).                                                                                                                                                                                                                                           | Same as d6/d7 — rules needed for rules-lane test; not for production path. |

**Key finding on d2:** The PATCH route spec says `getSession(req)` (server-side auth gate). If it then writes via Admin SDK, the Firestore rule is defense-in-depth only. If it writes via client SDK token forwarding, the rule is required. The story is ambiguous. The research step should confirm and the implement step should explicitly choose Admin SDK (consistent with epic C convention) and note the field-scoped rule as defense-in-depth.

---

## F. References + Storage

- `/references/{refId}` baseline rule: `allow read: if request.auth != null && resource.data.userId == request.auth.uid`. ✓
- This gates on the reference document's own `userId` field, not the parent design's ownership. Since epic C ingest (c8/c9) always sets `userId` on references to the same user who owns the design, this is safe in practice.
- d6's rules-lane test spec says "references collection read allowed only via parent design ownership" — this is NOT what the rule does. The rule checks the reference's own `userId`. The test spec's phrasing is misleading but the actual security posture is equivalent (same user). The tester should write the test to assert `reference.userId == request.auth.uid`, not a cross-doc parent-design lookup.
- Storage rules: not modified by any d2-d9 story. ✓

---

## G. Anti-patterns

1. **Existing permissive update clause shadows field-scoped additions (HARD BLOCKER):** The baseline `allow update` on `/designs/{designId}` grants any-field writes to the owner. d2 + d7's `hasOnly` additions are security theater unless the baseline clause is narrowed or replaced.

2. **`ownerUid` in d9 implement step (HARD BLOCKER):** Would write a broken rule; all list access denied for legitimate owners.

3. **`allow read` on `/designs/{designId}` covers `get` AND `list`** — in Firestore rules, `allow read` is shorthand for both `allow get` and `allow list`. The existing rule thus already permits list queries by the owner. This makes the rules-lane list test straightforward. (This is actually a mitigant for the d9 list concern — re-verification recommended.)

4. **Delete rule scope:** All three collections (designs, references, generations) have `allow delete: if request.auth != null && resource.data.userId == request.auth.uid`. No story in d2-d9 adds delete capability. None of the d-epic stories should touch delete rules. ✓

5. **d7 "via this route's path pattern" wording:** Firestore rules have no HTTP route context. If implemented literally, this is a misunderstanding that would produce an invalid rule. Must be corrected to `hasOnly` diff-key constraint.

---

## Recommendations

1. **[HARD — fix before d2 dispatch]** Replace the existing permissive `/designs/{designId} allow update` baseline clause with the union of field-scoped clauses from d2 + d7 + any other intended update surface. The current baseline allows any-field owner updates, making d2/d7's `hasOnly` additions non-functional as security controls.

2. **[HARD — fix before d9 dispatch]** Correct d9's implement step: replace all occurrences of `ownerUid` with `userId`. The canonical owner field throughout this app's Firestore schema is `userId`.

3. **[SOFT — add to d2 implement note]** Explicitly specify `userId` (not `ownerUid`) in d2's rule diff-key constraint, and confirm whether the PATCH route uses Admin SDK (rules are defense-in-depth) or client SDK (rules are load-bearing). The research step should surface this.

4. **[SOFT — fix d7 implement wording]** Strike "via this route's path pattern" from d7's implement step; replace with: "use `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['name', 'updatedAt'])` as the field-scope constraint."

5. **[INFO — confirm in d6 research step]** Verify that `allow read` on `/designs/{designId}` already covers list queries (it does — `allow read` = get + list). d6 + d9 likely need no new rule for the production Admin SDK path; the rules-lane tests need the rule to exist for emulator assertions.

6. **[INFO — d6 tester note]** The d6 rules-lane test spec phrasing "references collection read allowed only via parent design ownership" is misleading. The actual rule checks `reference.userId == request.auth.uid`. The test should be written against the actual rule semantics, not a cross-doc lookup.

---

## Approved rules composition (VERDICT == revise-required — this is the INTENDED north star, pending fix of items 1-2 above)

```firestore-rules
// /designs/{designId} — revised cumulative composition for d2 + d6 + d7 + d8 + d9
match /designs/{designId} {
  // Read (get + list): owner only. `allow read` covers both get and list.
  allow read: if request.auth != null
    && resource.data.userId == request.auth.uid;

  // Create: owner sets userId on the new document.
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;

  // Shape update (d2): only nail_shape + updatedAt may change.
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.userId == resource.data.userId
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['nail_shape', 'updatedAt']);

  // Name update (d7): only name + updatedAt may change.
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.userId == resource.data.userId
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['name', 'updatedAt']);

  // Delete: owner only (no story changes this; kept from baseline).
  allow delete: if request.auth != null
    && resource.data.userId == request.auth.uid;
}

// /references/{refId} — unchanged from Epic C baseline.
match /references/{refId} {
  allow read: if request.auth != null
    && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.userId == resource.data.userId;
  allow delete: if request.auth != null
    && resource.data.userId == request.auth.uid;
}

// /generations/{generationId} — unchanged from Epic C baseline.
// d8 writes via Admin SDK (bypasses rules). No rule changes needed.
match /generations/{generationId} {
  allow read: if request.auth != null
    && resource.data.userId == request.auth.uid;
  allow create: if request.auth != null
    && request.resource.data.userId == request.auth.uid;
  allow update: if request.auth != null
    && resource.data.userId == request.auth.uid
    && request.resource.data.userId == resource.data.userId;
  allow delete: if request.auth != null
    && resource.data.userId == request.auth.uid;
}
```

**Note on the existing permissive `/designs` update clause:** The baseline's single `allow update` (any field, owner-only) MUST be replaced by the two field-scoped `allow update` clauses above. Do NOT add the field-scoped clauses alongside the existing permissive one — that leaves the permissive clause in effect and the field constraints are never enforced.
