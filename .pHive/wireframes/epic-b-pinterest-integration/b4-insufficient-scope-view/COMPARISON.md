# b4 — InsufficientScopeView (403) · Comparison

**Story:** Operator-facing 403 remediation page — `InsufficientScopeView` at `/pinterest` (or `/pinterest/[boardId]`) when the access token is valid but missing `boards:read` or `pins:read` scopes.

**Architect:** MAJOR-2 — this is a separate screen from `TokenInvalidView` (not a shared component variant). Layout matches `TokenInvalidView` exactly (base-template §7 rule 5: "Layout is identical across 401 vs 403 — only icon, accent word, border color, and step-2 copy differ"). Motion is identical per animations-spec §6d.

**Glyph:** key-ring with one missing key — ring at top, two present keys drawn as full strokes, and a dashed loop showing where the third (missing) key would hang. Communicates "you have a key, but not the right one for this door."

---

## Variation summary

Same three-way split as b4-401 so the layouts stay symmetric.

|                        | **v1 — Intimate**    | **v2 — Balanced**  | **v3 — Confident** |
| ---------------------- | -------------------- | ------------------ | ------------------ |
| Container              | `max-w-md`           | `max-w-xl`         | `max-w-2xl`        |
| Glyph size             | 32px                 | 40px               | 48px               |
| Step-counter circle    | 28px, 12px numeral   | 32px, 13px numeral | 36px, 14px numeral |
| Step vertical gap      | `space-y-4`          | `space-y-5`        | `space-y-7`        |
| Eyebrow above heading  | —                    | —                  | "Scope status"     |
| Heading size (desktop) | `text-3xl`           | `text-4xl`         | `text-5xl`         |
| Vibe                   | Tight, debug-focused | Calm, confident    | Expansive          |

**403-specific (all three):**

- Italic accent: "broader access"
- Glyph: key-ring with missing key
- Step-counter border: **Champagne Gold** (the one color-pop the 403 carries, per fix (b))
- Step numerals: Mulberry Dusk (AA 6.90:1)
- Step 2 copy: "Re-issue the token with `boards:read` + `pins:read`"
- Steps 1, 3, 4 copy identical to 401

---

## Scorecard

| Criterion                                    | v1 — Intimate | v2 — Balanced | v3 — Confident |
| -------------------------------------------- | ------------- | ------------- | -------------- |
| Brief fidelity                               | 5             | 5             | 5              |
| Option C tone adherence                      | 5             | 5             | 5              |
| Layout polish                                | 3             | **5**         | 4              |
| Accessibility (15-pt)                        | 5             | 5             | 5              |
| Motion (10-pt)                               | 5             | 5             | 5              |
| Visual parity with 401 (same rendition tier) | 5             | 5             | 4              |
| **Total**                                    | **28/30**     | **30/30**     | **28/30**      |

Note on parity: v1/v2 match 401's v1/v2 exactly except for the 3 allowed differences (glyph, border color, step-2 copy). v3 has an "Scope status" eyebrow whereas 401 v3 has "Token status" eyebrow — this is correct (different remediation context), but symmetric. If Don picks v3 for both, copy reads well as a pair.

---

## 15-point a11y audit (summary)

Identical to b4-401 per story spec (structurally identical surfaces). All 15 checkpoints pass on all three renditions. The only 403-specific notes:

- **Check #7** (step numerals not Champagne Gold): verified. Numerals are `color: var(--primary)` (Mulberry Dusk 6.90:1 on card background). The Champagne Gold is on the 1px border only, which per `_a11y-spec.md` does not require 4.5:1 contrast — it is a decorative UI tint, 3:1 threshold doesn't apply to ornamental borders.
- **Check #10** (`role="status"` on wrapper): all three use `role="status" aria-live="polite" aria-labelledby="..."` as required.
- **Distinguishability from 401:** three signals carry it — glyph shape (key-ring vs disconnected-link), step-border color (gold vs mulberry), step-2 copy ("Re-issue with scopes" vs "Generate a fresh token"). Screen readers differentiate via the heading text alone ("broader access" vs "fresh token"). Color-blind users get the glyph + heading difference without needing to discern the 45°-hue-rotated border.

---

## 10-point animations audit (summary)

Identical to b4-401 — all 10 pass on all three renditions. Motion is deliberately identical to 401 (animations-spec §6d: "making motion differ would confuse the signal"). Both screens are operator-facing remediation; both deserve the same composed tone.

---

## Gaps per rendition

### v1 — Intimate

- Same concern as 401 v1: compressed feel, `text-3xl` heading weakens Fraunces hierarchy. Good if Don wants 401 and 403 to both feel debug-tool-tight.

### v2 — Balanced

- **No gaps.** Lands squarely in Option C's intended tone. Expected default.

### v3 — Confident

- "Scope status" eyebrow is a pair to 401 v3's "Token status" — they read well together if Don picks v3 on both. Mixing (v3 on one, v2 on other) would be allowed but introduces a small asymmetry.
- Same size-creep risk as 401 v3 — 48px glyph + `text-5xl` feels larger than a typical remediation screen. Ok for a premium brand tone; slightly overcooked for a private single-user op screen.

---

## Recommended default

**v2 — Balanced.**

**Reason:** Matches the recommended default for b4-401. Pair consistency matters here — the two views are functionally a pair ("something is wrong with your Pinterest token, here's how to fix it") and should look like they come from the same designed moment. v2/v2 is the cleanest pairing. v3/v3 is also coherent if Don wants the extra breathing room.

Avoid mixing (e.g., v2 on 401 and v3 on 403). The architect made these separate screens precisely so they can be visited independently, but they share a mental model — visual asymmetry between them would feel unintentional.

---

## Glyph notes

The key-ring-with-missing-key glyph uses:

- A circle at top as the ring
- Two full key silhouettes (simplified: a stub stem + a single tooth + end ring for the grip)
- One dashed loop descending from the ring, trailing off to where the missing key would be (tail ends in an open hook, not a complete key)
- A small muted-foreground dot below centre as a "gap indicator"

The dashed-loop "missing key" metaphor is the choice I made over the base-template suggestion of "key-ring with missing key." I kept the metaphor but interpreted it as: "the ring is here, some keys are here, one slot is empty" rather than drawing a visibly missing key that would have required showing both the key-that-exists and the key-that-doesn't, which would have been visually busy at 32-48px sizes. This is a substitution I'm logging explicitly for review.

**Substitution:** empty-slot-with-dashed-loop interpretation of the key-ring-with-missing-key concept.

---

## Selection prompt for next session

> Which b4-403 (InsufficientScopeView) rendition should I ship — v1 (Intimate, max-w-md, 32px key-ring), v2 (Balanced, max-w-xl, 40px key-ring, expected default), or v3 (Confident, max-w-2xl, 48px key-ring, "Scope status" eyebrow)?
>
> My recommended default is **v2** to pair with b4-401 v2 — they share the same composed Option C tone, matched sizes, and only differ by the 3 allowed variables (glyph shape, step-border color, step-2 copy). Avoid mixing rendition tiers between the two 401/403 views — they should be visited as a pair.

---

## DECISION

**Selected:** `v2.html` (Balanced — max-w-xl, 40px key-ring-with-empty-slot glyph)
**Approved by:** Don
**Approved at:** 2026-04-20 (Touchpoint 1; recorded in commit `77f08157` message)
**Backfilled to this file at:** 2026-04-27 (per Don's confirmation "lets go with v2 of them all")
**Pruned variants:** v1 (Intimate) and v3 (Confident) removed from disk after selection.
**Pair note:** Matches `b4-token-invalid-view` v2 selection — the two screens render as a matched pair sharing Option C tone, differing only in the architect MAJOR-2 allowed variables (glyph shape, step-border color, step-2 copy).
