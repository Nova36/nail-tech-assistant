# Epic D Visualizer — Aesthetic Options

**Phase 1 gate — awaiting Don's pick before Phase 2 full wireframes.**

Primary device target: tablet landscape. Fingers fan horizontally.  
Design image placeholder: Signature Wash gradient (brand-defined for generation placeholders).  
Skin tone note: Options A and C use a stylized neutral silhouette — skin tone is an unmade decision, trivially deferred or parameterized later. Option B forces a real skin tone and is flagged accordingly.

---

## Option Comparison Table

|                              | Option A — Flat Silhouette | Option B — Photo Composite | Option C — Line-Art Sketch |
| ---------------------------- | -------------------------- | -------------------------- | -------------------------- |
| **Implementation cost**      | Low                        | High                       | Medium                     |
| **Brand fit**                | Excellent                  | Poor–Medium                | Excellent                  |
| **Skin tone risk**           | None (stylized)            | High (forces a choice)     | None (stylized)            |
| **Landscape-tablet fit**     | Strong                     | Medium (photo crop tricky) | Strong                     |
| **9-day deadline viability** | Yes                        | Risky                      | Yes                        |
| **Shape switching**          | Clean SVG clip-path swap   | Photo angle mismatch risk  | Stroke-redraw per shape    |
| **Feeling evoked**           | Modern studio tool         | Product catalog            | Gift / handcrafted         |

---

## Option A — Flat Illustrated Silhouette

**Aesthetic:** Clean vector outline of a palm and five fanned fingers in a warm neutral tone (think #F0EBE3 Warm Parchment fill, #D4CBC5 Pearl Fog stroke). The generated design image is masked into each nail-shaped SVG cutout using `clipPath`. Nails sit proud of the finger silhouette, catching the design. Minimal shading — a single soft drop shadow on the hand reads as dimensional without adding complexity.

**Feeling:** Modern, confident, purposeful. Feels like a professional design tool. The simplicity lets the nail artwork dominate the frame — which is the point.

**Implementation cost:** Low. One SVG hand template. Four `clipPath` variants (almond/coffin/square/stiletto) swapped client-side. No external assets.

**Brand fit:** Excellent. Ivory Cream background, Warm Parchment hand fill, and Mulberry Dusk shape-selector chips all feel native to the design system. Signature Wash gradient as nail placeholder reads directly as a preview state.

**Tradeoffs:**

- Gained: Fast, scalable, skin-tone-neutral, shape-switching is trivial.
- Lost: Lower visual "wow" factor than a photo composite; first impression is flat, not luxurious.

---

## Option B — Photo Composite

**Aesthetic:** A cropped, top-down studio photo of a hand (dorsal view, fingers fanned). The generated design is composited onto each nail as an overlay with blending. The photo provides depth, skin texture, and ambient light — making the final result feel closest to a real nail photo.

**Feeling:** High aspiration — the "before/after" reveal you'd see in a salon app. Feels most like the end result.

**Implementation cost:** High. Requires sourcing a properly licensed hand photo (top-down, multiple nail shapes, correct aspect ratio). Masking onto a real photo is finicky — wrong photo angle = warped nails. Four shape variants may need four different hand photos. Photo must handle the app's surface color well.

**Brand fit:** Poor to Medium. A stock photo hand sits awkwardly against the app's soft-crafted design language. Risk of feeling cheap (structured-outline warns: "may technically render but still feel cheap if the scaling or hand composition looks artificial"). Also forces a specific skin tone — a choice Don hasn't made and that matters for a gift.

**Tradeoffs:**

- Gained: Highest visual realism; most convincing for clients who need to imagine the final look.
- Lost: Skin tone commitment, licensing risk, 9-day deadline pressure, shape-switching complexity, brittle if the source photo doesn't fit.

**Recommendation:** Defer to v2 unless Don explicitly wants this wow factor and is prepared to select/license a hand photo.

---

## Option C — Line-Art / Pencil-Sketch Silhouette

**Aesthetic:** A loose, hand-drawn style outline of a palm and five fingers — think pencil or thin ink strokes with slight irregularity. The nail areas are outlined as shapes; the generated design floods in as a fill behind the stroke. The overall impression is that someone sketched the hand around the nail art.

**Feeling:** Crafted, intimate, gift-like. Evokes an artist's sketchbook or a high-end nail salon's mood board. The slight imperfection reads as warmth, not error. Pairs beautifully with the Fraunces heading font's "bespoke" quality.

**Implementation cost:** Medium. The base hand SVG needs stroke-style paths with variable stroke-width to simulate sketching. Per-shape variants still use `clipPath` for the nail masks. Can be achieved in SVG without external assets. Requires more SVG craft than Option A.

**Brand fit:** Excellent. The brand personality is "crafted, warm, and quietly indulgent — a studio companion that feels like a gift, not a tool." Option C literally looks like a gift. Champagne Gold accent color works beautifully as a thin highlight stroke.

**Tradeoffs:**

- Gained: Strongest alignment with "gift" context and brand personality; memorable visual identity; skin-tone-neutral.
- Lost: More SVG authoring time than Option A; the handcrafted feel may read as "unfinished" to users expecting a polished tool interface.

---

## Designer Recommendation

**Option A is the safe call for the deadline.** It's fast, brand-consistent, shape-switching is trivial, and it keeps the nail art at center stage where it belongs.

**Option C is the romantic call.** If Don wants this to feel like a gift first and a tool second — which the brand personality explicitly says — Option C earns that feeling more authentically. It's achievable in 9 days with careful SVG work. My personal lean is Option C for the visualizer centerpiece, paired with Option A's clean layout structure.

**Option B is a trap.** Do not attempt it in 9 days. Defer to v2.

---

**Preview files:**

- `aesthetic-option-1.html` — Option A: Flat Illustrated Silhouette
- `aesthetic-option-2.html` — Option B: Photo Composite (representative concept only)
- `aesthetic-option-3.html` — Option C: Line-Art Sketch
