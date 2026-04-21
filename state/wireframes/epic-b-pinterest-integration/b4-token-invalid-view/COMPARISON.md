# b4 — TokenInvalidView (401) · Comparison

**Story:** Operator-facing 401 remediation page — `TokenInvalidView` at `/pinterest` (or `/pinterest/[boardId]`) when the access token is invalid or missing.

**Base:** Option C tone (base-template §7) — composed, quiet, one italic accent word, one icon glyph, `RemediationSteps` ordered list with Mulberry Dusk numerals and Mulberry Dusk border (401-specific distinction vs 403's Champagne Gold border).

**Glyph:** disconnected-link (two broken chain rings with rupture ticks) — drawn inline as a stroke-only SVG with `stroke: var(--muted-foreground)`, `stroke-width: 1.5`, `fill: none`, `aria-hidden="true"`.

---

## Variation summary

|                        | **v1 — Intimate**    | **v2 — Balanced**  | **v3 — Confident**  |
| ---------------------- | -------------------- | ------------------ | ------------------- |
| Container              | `max-w-md` (448px)   | `max-w-xl` (576px) | `max-w-2xl` (672px) |
| Glyph size             | 32px                 | 40px               | 48px                |
| Step-counter circle    | 28px, 12px numeral   | 32px, 13px numeral | 36px, 14px numeral  |
| Step vertical gap      | `space-y-4` (16px)   | `space-y-5` (20px) | `space-y-7` (28px)  |
| Eyebrow above heading  | —                    | —                  | "Token status"      |
| Heading size (desktop) | `text-3xl` (30px)    | `text-4xl` (36px)  | `text-5xl` (48px)   |
| Body copy size         | `text-sm` (14px)     | `text-sm` (14px)   | `text-[15px]`       |
| Vibe                   | Tight, debug-focused | Calm, confident    | Expansive, premium  |

**Constant across all three (Option C rule adherence):**

- One italic accent word ("fresh token")
- One icon glyph (disconnected-link)
- `.b4-mount-fade` fade-in at 240ms + 6px translateY
- Mulberry Dusk numerals, Mulberry Dusk step-counter border (401-specific)
- `role="status"` + `aria-live="polite"` + `aria-labelledby` on the section wrapper
- `.link-action` underline-grow with `:focus-visible` parity + arrow-nudge on the Pinterest dashboard link
- No shimmer on resolved view (v2 shows the separate `TokenRemediationLoadingSkeleton` shimmer sliver that precedes it — the only place shimmer appears)
- Identical step copy across all three (terse + Pinterest developer dashboard reference + Vercel env update + redeploy)

---

## Scorecard

| Criterion                                                            | v1 — Intimate | v2 — Balanced | v3 — Confident |
| -------------------------------------------------------------------- | ------------- | ------------- | -------------- |
| Brief fidelity                                                       | 5             | 5             | 5              |
| Option C tone adherence                                              | 5             | 5             | 5              |
| Layout polish                                                        | 3             | **5**         | 4              |
| Accessibility (15-pt)                                                | 5             | 5             | 5              |
| Motion (10-pt)                                                       | 5             | 5             | 5              |
| Operator-task-fit (can Don fix his token at midnight in one glance?) | **5**         | **5**         | 4              |
| **Total**                                                            | **28/30**     | **30/30**     | **28/30**      |

---

## 15-point a11y audit (summary, pass/fail)

| #   | Check                                                                               | v1  | v2  | v3  |
| --- | ----------------------------------------------------------------------------------- | --- | --- | --- |
| 1   | `<main>` wraps content, unique                                                      | ✓   | ✓   | ✓   |
| 2   | Single `<h1>` Fraunces italic accent                                                | ✓   | ✓   | ✓   |
| 3   | PinCard aria-label pattern — n/a for b4                                             | —   | —   | —   |
| 4   | Alt text for images — n/a (glyph is aria-hidden)                                    | —   | —   | —   |
| 5   | Decorative glyph `aria-hidden="true"`                                               | ✓   | ✓   | ✓   |
| 6   | Taupe-Mist copy darkened to `#6F625C`                                               | ✓   | ✓   | ✓   |
| 7   | **Step numerals use Mulberry Dusk (not Champagne Gold)** — Fix (b)                  | ✓   | ✓   | ✓   |
| 8   | Destructive — n/a for b4                                                            | —   | —   | —   |
| 9   | `aria-live` on appending grid — n/a for b4                                          | —   | —   | —   |
| 10  | `role="status" aria-live="polite"` on the section wrapper                           | ✓   | ✓   | ✓   |
| 11  | Focus rings `var(--ring)` + offset                                                  | ✓   | ✓   | ✓   |
| 12  | Touch targets ≥ 44px on interactive; inline link-action ≥ 32px                      | ✓   | ✓   | ✓   |
| 13  | New-tab link has `rel="noopener noreferrer"` + aria-label suffix                    | ✓   | ✓   | ✓   |
| 14  | `.link-action` grow fires on `:focus-visible` (keyboard parity)                     | ✓   | ✓   | ✓   |
| 15  | `prefers-reduced-motion` covers `.b4-mount-fade`, shimmer, `.link-action`, `.arrow` | ✓   | ✓   | ✓   |

---

## 10-point animations audit (summary, pass/fail)

| #   | Check                                                                       | v1  | v2  | v3  |
| --- | --------------------------------------------------------------------------- | --- | --- | --- |
| 1   | Compositor-only animated properties (opacity, transform)                    | ✓   | ✓   | ✓   |
| 2   | Every `@keyframes` has a reduced-motion override                            | ✓   | ✓   | ✓   |
| 3   | Reduced-motion renders content instantly + complete                         | ✓   | ✓   | ✓   |
| 4   | Hover uses `transform` (arrow `translateX`)                                 | ✓   | ✓   | ✓   |
| 5   | Shimmer scoped to `.sk-v1` skeleton only (v2 shows isolated loading sliver) | ✓   | ✓   | ✓   |
| 6   | Stagger — n/a for b4 (no per-step stagger per Option C rule 4)              | —   | —   | —   |
| 7   | `will-change` unused on b4 surfaces                                         | ✓   | ✓   | ✓   |
| 8   | Durations in ladder (180/220/240)                                           | ✓   | ✓   | ✓   |
| 9   | No JS animation libraries                                                   | ✓   | ✓   | ✓   |
| 10  | Icon glyph STATIC (animations-spec §5c) — no draw-in, no pulse              | ✓   | ✓   | ✓   |

---

## Gaps per rendition

### v1 — Intimate

- **Compressed feel.** The narrow container makes the screen look terminal-like rather than a designed page. Good for experienced ops; less reassuring for a less technical operator.
- Title `text-3xl` is quieter than the Fraunces hero moments established elsewhere in the app (dashboard is `text-6xl`, b2 winner uses `text-6xl` hero). The Fraunces hierarchy feels weaker here.
- No spec violations.

### v2 — Balanced

- **No gaps.** Hits Option C cleanly: max-w-xl lets the heading breathe, 40px glyph is visible but not dominant, `text-4xl` heading matches secondary-page hero scale elsewhere in the app.
- Also includes a separate `TokenRemediationLoadingSkeleton` viewport so the shimmer-sliver transition contract is visible — paste-verbatim from base-template §5a.

### v3 — Confident

- **Largest visual footprint.** 48px glyph + `text-5xl` heading start to feel like a landing-page announcement rather than a "you have a small fix to make" remediation. Right for a public-facing error; slightly overcooked for a private single-user operator screen.
- **Eyebrow "Token status"** is a nice pattern but introduces a UI element that doesn't appear on any other b4 rendition — if Don picks v3, we should consider porting the eyebrow to b4-403 v3 for symmetry.
- No critical spec violations.

---

## Recommended default

**v2 — Balanced.**

**Reason:** It hits the intended tone exactly. Option C is "composed, quiet, operator-calm"; v2 lands in the center. v1 reads as debug-tool-tight and loses the Fraunces hero moment. v3 reads as public-landing-page-big and introduces an eyebrow that doesn't match b4-403.

v2 is also the only rendition that renders the loading-sliver shimmer state alongside the resolved view, so the implementer sees the full transition contract without having to consult the spec.

---

## Glyph notes

The disconnected-link glyph is drawn as two broken chain rings with small rupture-tick accents between them. I chose this over a single broken-chain because the "two rings that don't connect" metaphor more directly communicates "the thing that connects Pinterest to us is broken" than a generic broken-chain. No substitution from the base-template spec.

The rupture ticks are the only licence I took — small 1px-weight "spark" strokes that emphasise the break point without decorating the glyph. They're included in the `stroke-width: 1` override on those specific paths so the main chain shape stays at `1.5`.

---

## Selection prompt for next session

> Which b4-401 (TokenInvalidView) rendition should I ship — v1 (Intimate, max-w-md, 32px glyph, tight), v2 (Balanced, max-w-xl, 40px glyph, medium), or v3 (Confident, max-w-2xl, 48px glyph, "Token status" eyebrow)?
>
> My recommended default is **v2** — it hits Option C's "composed, quiet" tone exactly, the heading scale matches other secondary-page Fraunces hero moments, and it's the only rendition that also renders the preceding `TokenRemediationLoadingSkeleton` shimmer sliver so the full transition contract is visible.
