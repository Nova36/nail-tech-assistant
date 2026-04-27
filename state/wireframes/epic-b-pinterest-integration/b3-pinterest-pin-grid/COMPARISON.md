# b3 — Pinterest pin grid · Comparison

**Story:** `/pinterest/[boardId]` board detail · `BoardDetailHeader` + `PinGrid` + `PinCard` + `PinGridSkeleton` + `InfiniteScrollSentinel` + `TokenPlaceholderInline` (401/403) + `BoardNotFound`.

**Renditions produced:** v1 (Denser), v2 (Editorial), v3 (Magazine). All three use the approved base: `claude-v2.html` layout cadence + `claude-v1.html` shimmer keyframes, with brand tokens corrected (`#6F625C` muted-foreground, `#B04848` destructive).

---

## Variation summary

|                         | **v1 — Denser**        | **v2 — Editorial**                | **v3 — Magazine**                     |
| ----------------------- | ---------------------- | --------------------------------- | ------------------------------------- |
| Columns (xl)            | 4                      | 3                                 | 2                                     |
| Pin aspect              | 4:5 portrait           | 1:1 square                        | 3:4 classic-pinterest                 |
| Card padding            | `px-3 py-2.5` (tight)  | `p-5` (generous)                  | `p-7` (expansive)                     |
| Card corners            | `rounded-[22px]`       | `rounded-[28px]`                  | `rounded-[32px]`                      |
| Hero title              | `text-5xl`             | `text-6xl`                        | `text-[72px]`                         |
| Header meta position    | below title            | below title                       | **above title** (eyebrow + meta line) |
| Gold hairline           | 48px below eyebrow     | 56px below eyebrow                | 80px below title, full-width-ish      |
| Pins above desktop fold | ~12                    | ~6                                | ~4                                    |
| Feel                    | Dense, utility-leaning | Calm, balanced, matches b2 winner | Slow, editorial, premium              |

---

## Scorecard

Each row 0-5. Fidelity = how faithfully the rendition executes the base-template spec. Polish = layout rhythm and visual quality. A11y = adherence to `_a11y-spec.md` 15-point checklist. Motion = adherence to `_animations-spec.md` 10-point checklist.

| Criterion                                     | v1 — Denser | v2 — Editorial | v3 — Magazine |
| --------------------------------------------- | ----------- | -------------- | ------------- |
| Brief fidelity (acceptance criteria coverage) | 5           | 5              | 5             |
| Layout polish                                 | 3           | **5**          | 4             |
| Accessibility adherence (15-pt)               | 5           | 5              | 5             |
| Motion adherence (10-pt)                      | 5           | 5              | 5             |
| Visual cohesion with b2 winner                | 3           | **5**          | 4             |
| Editorial voice (Fraunces breathing room)     | 3           | 4              | **5**         |
| **Total**                                     | **24/30**   | **29/30**      | **28/30**     |

---

## 10-point animations audit (pass/fail per rendition)

| #   | Check                                                                               | v1  | v2  | v3  |
| --- | ----------------------------------------------------------------------------------- | --- | --- | --- |
| 1   | Compositor-only animated properties                                                 | ✓   | ✓   | ✓   |
| 2   | Every `@keyframes` has reduced-motion override                                      | ✓   | ✓   | ✓   |
| 3   | Reduced-motion renders complete content (no hidden info)                            | ✓   | ✓   | ✓   |
| 4   | Hover uses `transform`, not layout                                                  | ✓   | ✓   | ✓   |
| 5   | Shimmer scoped to `.sk-v1` skeleton surfaces only                                   | ✓   | ✓   | ✓   |
| 6   | Stagger envelope implementable within 320ms (9+ cards, 40ms increment, clamp noted) | ✓   | ✓   | ✓   |
| 7   | `will-change` unused on cards (sparingly noted in spec)                             | ✓   | ✓   | ✓   |
| 8   | Durations in spec ladder (220/260/2200/2600)                                        | ✓   | ✓   | ✓   |
| 9   | No JS animation libraries                                                           | ✓   | ✓   | ✓   |
| 10  | No shimmer on non-skeleton content                                                  | ✓   | ✓   | ✓   |

---

## 15-point a11y audit (pass/fail per rendition)

| #   | Check                                                                                                                                   | v1                                              | v2      | v3      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------- | ------- |
| 1   | `<main>` wraps primary content, unique                                                                                                  | ✓                                               | ✓       | ✓       |
| 2   | Single `<h1>` with Fraunces italic accent                                                                                               | ✓                                               | ✓       | ✓       |
| 3   | PinCard is `<a>` with aria-label "title — opens in Pinterest"                                                                           | ✓                                               | ✓       | ✓       |
| 4   | PinCard cover image alt = title (wireframe covers are decorative placeholders; `aria-hidden="true"` treatment noted for implementation) | ✓                                               | ✓       | ✓       |
| 5   | Decorative glyphs `aria-hidden="true"` (gold hairline, back-arrow svg, sentinel dot)                                                    | ✓                                               | ✓       | ✓       |
| 6   | Eyebrow muted-foreground uses darkened `#6F625C` token — AA pass at 5.5:1                                                               | ✓                                               | ✓       | ✓       |
| 7   | (b4-only) — n/a for b3                                                                                                                  | —                                               | —       | —       |
| 8   | (destructive-only) — n/a for b3                                                                                                         | —                                               | —       | —       |
| 9   | `aria-live="polite"` + `aria-relevant="additions"` on PinGrid                                                                           | ✓                                               | ✓       | ✓       |
| 10  | `role="status"` on inline 401/403 placeholders; BoardNotFound uses heading hierarchy                                                    | partial (placeholder is decorative/static — ok) | partial | partial |
| 11  | Focus rings use `var(--ring)` + offset                                                                                                  | ✓                                               | ✓       | ✓       |
| 12  | Touch targets ≥ 44px (back-link padded; PinCard covers easily meet)                                                                     | ✓                                               | ✓       | ✓       |
| 13  | New-tab links have `rel="noopener noreferrer"` + aria-label suffix                                                                      | ✓                                               | ✓       | ✓       |
| 14  | `.link-action` — n/a for b3 (reserved for b4)                                                                                           | —                                               | —       | —       |
| 15  | `prefers-reduced-motion` covers shimmer + sentinel + card-enter + back-link color transition                                            | ✓                                               | ✓       | ✓       |

Note on #6: all three renditions apply Fix (a) option 1 from `_a11y-spec.md` (token darkened to `#6F625C`). Eyebrow + meta copy are now AA-legible at small sizes.

Note on #10: the 401/403 inline placeholder on the board-detail page is a temporary state preceding the b4 `TokenInvalidView`/`InsufficientScopeView`. The live region announcements come from the full b4 views (which are dedicated pages); inline placeholders here are intentionally minimal and static. The b4 renditions carry the `role="status"` contract.

---

## Gaps per rendition

### v1 — Denser

- **Density tension with editorial brand tone.** 4 cols of 4:5 portraits at xl packs ~12 pins above fold. The brand aims for calm/editorial (b2 winner direction); v1 leans functional. Good for a power-user, less so for the target operator (Don's wife, browsing for inspiration).
- **Smaller Fraunces title** (text-5xl vs text-6xl on v2) loses some of the Fraunces hierarchy moment.
- No critical gaps.

### v2 — Editorial

- **Matches b2 winner layout grammar** (3-col, generous padding, 28px corners, text-6xl hero). Lands squarely in the established visual voice.
- Slight pin-aspect mismatch with Pinterest's native vertical bias — 1:1 square hides some pin content when Pinterest images are naturally taller. **Minor:** real images will be object-cover cropped; not a blocker.
- No critical gaps.

### v3 — Magazine

- **Boldest editorial voice**, but 2-col at xl with 3:4 portraits shows only ~4 pins above fold. For a browse flow this might feel sparse — the user has to scroll more to see variety.
- The "eyebrow + meta line above title" treatment is the most distinctive design move across the three, but it's also a departure from b2 (where meta sits below the title).
- **Risk:** cohesion with b2 winner is softer than v2's.

---

## Recommended default

**v2 — Editorial.**

**Reason:** It inherits the b2 winner's layout grammar (3-col, 1:1 square, generous padding, text-6xl hero) so b3 reads as a natural continuation of the same page family rather than a different screen with the same nav. Motion and a11y scores are tied with v1/v3, but visual cohesion is stronger. v3 is compelling but introduces a layout inversion (meta above title) that would need its own sign-off at b2 review — right now it would clash.

If Don wants the Pinterest detail screen to feel **more special** than the boards index, promote v3 instead. If he wants **more pins visible per scroll**, promote v1. Default to v2 for consistency.

---

## Selection prompt for next session

> Which b3 rendition should I ship — v1 (Denser, 4-col, 4:5 portrait), v2 (Editorial, 3-col, 1:1 square, matches b2 winner), or v3 (Magazine, 2-col, 3:4 classic-pinterest, eyebrow+meta above title)?
>
> My recommended default is **v2** — it inherits the b2 winner's layout grammar and reads as a continuation of the same page family. v1 packs more pins above fold but feels functional rather than editorial. v3 is the most distinctive but introduces a title/meta inversion that departs from b2.

---

## DECISION

**Selected:** `v2.html` (Editorial — 3-col, 1:1 square, matches b2 winner layout grammar)
**Approved by:** Don
**Approved at:** 2026-04-20 (Touchpoint 1; recorded in commit `77f08157` message)
**Backfilled to this file at:** 2026-04-27 (per Don's confirmation "lets go with v2 of them all")
**Pruned variants:** v1 (Denser) and v3 (Magazine) removed from disk after selection.
