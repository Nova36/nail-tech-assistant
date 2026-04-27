# Wireframe comparison — internal `ui-designer` vs Anthropic Claude design

**Story:** `b2-pinterest-boards-grid` (Epic B)
**Brief both tools received:** `PROMPT.md` (identical input)
**Output format spec:** single self-contained `.html` per rendition; multiple breakpoints stacked; `data-component=""` annotations; inline `:root` token block; Tailwind v4 CDN; no NEW brand elements.
**Files compared:** `v{1,2,3}.html` (internal) vs `claude-v{1,2,3}.html` (external).

## Headline scorecard

| Check                                          | ui-v1                     | ui-v2                | ui-v3               | cl-v1                             | cl-v2                  | cl-v3                 |
| ---------------------------------------------- | ------------------------- | -------------------- | ------------------- | --------------------------------- | ---------------------- | --------------------- |
| Tailwind v4 CDN script                         | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| **Inline `:root` token block** (per spec)      | ✅                        | ✅                   | ✅                  | ❌                                | ❌                     | ❌                    |
| Fraunces + Inter via Google Fonts              | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| **`data-component=""` annotations** (per spec) | 9                         | 9                    | 9                   | **0**                             | **0**                  | **0**                 |
| `gradient-signature` reservation respected     | ✅ (1x in token def only) | ✅                   | ✅                  | ✅ (0x — but token never inlined) | ✅                     | ✅                    |
| `lib/utils` / `cn()` violation                 | none                      | none                 | none                | none                              | none                   | none                  |
| Skeleton component present                     | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| Sentinel component present                     | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| 401 token-invalid branch                       | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| 403 insufficient-scope branch                  | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| Empty-state slot                               | ✅                        | ✅                   | ✅                  | ✅                                | ✅                     | ✅                    |
| Brand-palette purity (no NEW hex colors)       | ✅ 12/12 brand            | ✅ 12/12 brand       | ✅ 12/12 brand      | ❌ 2 extras                       | ❌ 3 extras            | ❌ 3 extras           |
| Section / article / aside count                | 3 / 15 / 2                | 3 / 12 / 2           | 3 / 8 / 2           | 9 / 21 / 12                       | 9 / 13 / 12            | 9 / 11 / 12           |
| Breakpoint widths in markup                    | 375 / 768 / 1280          | 375 / 768 / 1280     | 375 / 768 / 1280    | 390 / 820 / 1280                  | 390 / 820 / 1280       | 390 / 820 / 1280      |
| File size (lines)                              | 392                       | 340                  | 366                 | 421                               | 347                    | 350                   |
| Title format                                   | `b2-... — v1 Denser`      | `... — v2 Editorial` | `... — v3 Magazine` | `/pinterest · v1 — Denser`        | `... · v2 — Editorial` | `... · v3 — Magazine` |

## Brief-fidelity gaps

### Internal `ui-designer` — followed brief faithfully

- All 7 required surfaces present in every rendition
- Inline `:root` block matches `app/globals.css` byte-for-byte (12 brand hexes)
- `data-component` annotations on every region with consistent naming (BoardGrid, BoardCard, BoardGridSkeleton, EmptyBoardsState, InfiniteScrollSentinel, PageHeader, PinterestBoardsPage, PrivateBadge, TokenInvalidPlaceholder)
- Brand palette purity 12/12 — zero NEW colors, zero NEW gradients
- Breakpoint widths exactly `375 / 768 / 1280` per spec
- Tighter HTML structure (3 sections, 8-15 articles, 2 asides) — closer to a real React component tree

### External Claude design — partial adherence, two real misses

- **MISS 1: No inline `:root` token block.** The spec explicitly required pasting `app/globals.css` lines 4-44 into an inline `<style>` so the wireframe color matches the app. Claude design relied on Tailwind defaults + invented some beige variants. Practical impact: **the wireframe palette doesn't perfectly match what the deployed app will look like**, so visual review is misleading.
- **MISS 2: No `data-component` annotations.** The spec called these out specifically to make HTML→React mapping unambiguous. Claude design omitted them entirely. Practical impact: **the developer has to infer component boundaries from `class` strings instead of reading the data attribute** — slower, more error-prone.
- **MISS 3 (minor): NEW hex colors introduced.** v1 added `#e8dfd4`, `#ede4d9`. v2 added `#dcd0c2` on top. v3 added `#d7cbbd`. None of these are in the brand system. The brief said "zero new colors". Claude design slipped in 2-3 cream/beige variants per file.
- **MISS 4 (minor): Breakpoint widths are 390/820 instead of 375/768.** Off-spec but representative — iPhone-13 width vs spec 375px, common tablet sim vs spec 768px. Cosmetic.

### Where Claude design IS stronger

- **Annotation density:** 12 `<aside>` callouts per file vs ui-designer's 2. Claude design treats annotations as a teaching layer; ui-designer treats them as marginal. Either approach is defensible — depends on whether annotations are for the developer (light) or for design review (heavy).
- **Semantic decomposition:** 9 `<section>`s per file vs ui-designer's 3. Claude design splits the page into more discrete semantic regions, which can be easier to skim.
- **More articles in v1:** 21 vs 15. More cards rendered = denser visual sample of how the boards grid will actually look populated.

## Verdict

**Internal ui-designer wins on brief fidelity.** Three checks Claude design missed (inline tokens, data-component annotations, brand-palette purity) are non-negotiable for this comparison's stated goal: "produce wireframes that match the project's actual brand and map cleanly to React components". The internal tool nailed both.

**Claude design wins on annotation density.** If you wanted a more documented, more-explained set of wireframes for design-review purposes (vs developer-handoff), Claude's `<aside>` density is genuinely useful. But for the b2 use case where the next step is the developer agent implementing the React, ui-designer's output is more directly usable.

**Visual quality is not assessed by this report.** Both sets need to be opened in a browser. Auto-detection can confirm structural fidelity but not whether v3 Magazine actually feels editorial vs busy.

## Recommended action

1. **Open both sets in a browser side-by-side.** That's the only way to evaluate the felt-quality bar (warmth, hierarchy, restraint vs over-design).
2. **Pick from one set** — don't mix-and-match across tools, that defeats the comparison.
3. **If the internal ui-designer's set passes the wife-test:** approve one (probably v2 Editorial or v3 Magazine based on typical Pinterest aesthetics, but your call), update the b2 story `wireframes:` block, and unblock the story for execute.
4. **If Claude design's set looks meaningfully better visually despite the brief misses:** flag the misses as known-gap, ask Claude to revise (re-paste the prompt with the misses called out), and re-compare.

## Selection prompt for next session

When you're ready to lock in the choice, tell me:

- Which file you want approved (path)
- Any small tweaks (one revision cycle)
- Whether to also use this winning approach as the template for b3 + b4 wireframes

---

## DECISION

**Selected:** `claude-v2.html` (Editorial)
**Shimmer keyframe source:** `claude-v1.html` — kept on disk for the implementation step to lift its shimmer keyframes; not a competing layout option.
**Approved by:** Don
**Approved at:** 2026-04-20 (Touchpoint 1; recorded in commit `77f08157` message)
**Backfilled to this file at:** 2026-04-27 (per Don's confirmation "lets go with v2 of them all")
**Internal-vs-external note:** the verdict above recommends the internal `ui-designer` set on brief-fidelity grounds (inline `:root` tokens + `data-component` annotations the Claude design set lacks). Don's ship-pick is `claude-v2` regardless. The developer agent should compensate by importing the inline `:root` block from `app/globals.css` when porting, and inferring `data-component` boundaries from class strings rather than relying on annotations.
