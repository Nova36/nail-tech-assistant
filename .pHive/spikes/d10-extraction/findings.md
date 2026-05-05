# d10 Spike — Nail-Polish Swatch Extraction

**Status:** plan only, no Vertex calls executed.
**Date:** 2026-05-02.
**Goal:** decide how to derive a polish-only PNG from the existing full-hand
generation written by `lib/designs/lifecycle.ts:300-316` (success path of
`persistGenerationResult`), persist at `designs/{designId}/swatch.png`, and
expose to `components/NailVisualizer/NailVisualizer.tsx:79`.

## Recommendation up front

**Primary: Approach A — Regenerate-as-swatch (image-output).** Send the
generated hand photo back to `gemini-2.5-flash-image` (same model already wired
at `lib/ai/provider.ts:32`) with a prompt that asks for a clean polish-only
swatch matching the source's color/pattern. Output is a synthesized PNG, not
literal pixels — see Open Question #1 — but produces a clean, full-frame
swatch with no skin/background, which is exactly what the visualizer's clipPath
needs to read as "painted nail."

**Fallback: Approach B — Detect bbox + sharp crop (text-output).** Use
`gemini-2.5-flash` (text-only) to return JSON `{x,y,w,h}` for the index-finger
nail; crop with `sharp`. Produces literal source pixels but the rectangle still
contains skin around the nail edge — would need a second alpha-mask pass to
truly be polish-only. Cheaper and deterministic-shaped, but worse visual.

---

## 1. Candidate approaches

### Approach A — Regenerate-as-swatch (RECOMMENDED)

**Honest framing:** `gemini-2.5-flash-image` is an image-output model. It will
**synthesize** a new PNG interpreting the source, not extract source pixels.
Color/pattern fidelity to the source is a likeness, not a copy. For a v1
visualizer that just needs to read as "painted nail," likeness is enough.

**Prompt to test (copy-pasteable, sent with the source PNG inlineData):**

```
You are producing a single nail-polish swatch image for a fashion design tool.

Reference image: a photograph of a hand with painted nails.

Task: Render a clean, isolated nail-polish swatch that matches the polish on
the reference's index fingernail — same color, same finish (matte/glossy/
shimmer), same pattern or artwork if any. Output a 512x512 PNG that fills the
entire frame with ONLY the polish surface as if painted on a flat oval card.
No skin, no fingertip, no nail-bed pink edge, no background, no shadow, no
hand. The polish surface should fill 100% of the frame edge to edge.
```

- **Expected response format:** `inlineData` PNG bytes, identical wire shape to
  `lib/ai/provider.ts:119-140` — reuse the existing parts-walker.
- **Pros:** clean output, fills the frame (no letterbox), no second masking
  pass, same auth + same SDK + same model already in use.
- **Cons:** synthesized != extracted (Open Q #1); model may drift from source
  color under tricky lighting; image-output token cost is the highest line item
  on the price sheet.
- **Failure modes:** model returns text instead of image (treat as `ok:false`,
  fall back to imageUrl); refusal (`SAFETY` block — already handled at
  `lib/ai/provider.ts:107-117`); color drift on metallic/holo polishes.

### Approach B — Detect bbox + sharp crop (FALLBACK)

**Honest framing:** A bbox crops a rectangle of the source. The rectangle
**will contain skin around the nail** — bbox is not segmentation. To be truly
polish-only you need either (i) a polygon mask the model returns, or (ii) a
follow-up alpha step (e.g. chroma key on skin-tone pixels — fragile across skin
tones). v1 of B = bbox + sharp crop, accepting visible skin border.

**Prompt to test (gemini-2.5-flash text-only, source PNG as inlineData):**

```
You are an image-region detector. The user image is a photograph of a hand
with painted nails. Locate the painted nail surface on the index finger only.

Return ONLY a JSON object with this exact shape, no prose, no code fences:

{"x": <int>, "y": <int>, "w": <int>, "h": <int>}

Coordinates are in pixels of the input image, origin top-left. The rectangle
must be the tightest bounding box around the visible polish surface of the
index fingernail. If no painted nail is visible on the index finger, return
{"x":0,"y":0,"w":0,"h":0}.
```

- **Expected response:** JSON text in candidate parts. Validate with a
  three-line schema check; on parse fail return `null`. Crop with `sharp` (new
  dep) and write PNG to storage.
- **Pros:** literal source pixels (true color), cheap (text out only), no
  synthesis drift.
- **Cons:** rectangle includes skin/cuticle pixels — visible skin border in
  visualizer; adds a runtime dep (`sharp`) and its native binaries to the
  Vercel bundle; index-finger only (other nails out of frame for narrow
  crops); zero-rect sentinel needs a code path.
- **Failure modes:** model returns prose instead of JSON; coordinates outside
  image bounds; zero-area rectangle; `sharp` install fails on Vercel runtime.

---

## 2. Sample image plan

**Schema check:** `lib/firestore/converters/generations.ts:50-99` stores
`{designId, userId, requestJson, resultStoragePath, status, createdAt, ...}`.
There is **no skin tone, polish color, or lighting metadata** on the doc —
"varied across skin tone" cannot be filtered by query. Plan is query-then-
human-pick.

1. Query: `generations` where `status == 'success'` order by `createdAt desc`
   limit 20, scoped to Don's userId (or all in dev).
2. For each, resolve `resultStoragePath` via the same path used in
   `lib/designs/imageUrl.ts:12-34` (signed URL or emulator URL) and download
   the PNGs to `.pHive/spikes/d10-extraction/samples/`.
3. Human-pick 5 covering: light vs dark skin (≥1 each), solid vs patterned
   polish (≥1 each), bright vs dim lighting (≥1 each), and one "hard case"
   (sheer/holo/chrome polish). Record picks in
   `.pHive/spikes/d10-extraction/samples/manifest.json` with `{generationId,
storagePath, why}`.
4. Re-run the same 5 across both prompt variants. No metadata is lied about.

If fewer than 20 success rows exist (early dev), use what is there and note
the coverage gap as a spike caveat.

---

## 3. Test rubric (eyeball, 5 acceptance criteria)

For each (sample × approach) PNG output, a human reviewer marks pass/fail on:

1. **No fingertip skin visible.** Zero skin-tone pixels detectable by eye in
   the body of the swatch.
2. **No nail-bed pink edge.** No lighter-pink half-moon at any edge of the
   swatch. (Approach B will likely fail this without a mask pass.)
3. **Fills the frame.** No letterbox, no transparent corners, no background
   color showing. Background pixel ratio < 5% (eyeball — no automated check
   in v1 spike).
4. **Color likeness to source.** Swatch reads as the same polish as the
   source's index nail to a non-expert observer at thumb size. Approach B is
   exact-color by definition; Approach A is a likeness call.
5. **Reads as "painted nail" inside the visualizer's clipPath.** Drop the PNG
   into `.pHive/wireframes/NailVisualizer/preview.html` (or a copy) as the
   `<image href>` in `components/NailVisualizer/NailVisualizer.tsx:126` and
   confirm the rendered nail looks like polish, not a tiny photo window.

**Pass threshold:** 4/5 samples pass all 5 criteria → approach is viable.
3/5 → marginal, document and decide with Don. ≤2/5 → fail, escalate to pivot
ladder.

---

## 4. Cost estimate

Source: https://cloud.google.com/vertex-ai/generative-ai/pricing (fetched
2026-05-02). Standard tier, us-central1.

- **gemini-2.5-flash-image (Approach A):**
  - Input (image+text): $0.30 / 1M tokens. One ~1024px source PNG ≈ 258
    tokens (Vertex docs), prompt text ≈ 100 tokens → ~360 input tokens →
    ~$0.000108.
  - Image output: $30 / 1M tokens. One generated image ≈ 1,290 tokens
    (Vertex's documented per-image token count for the Flash Image family).
    → **~$0.0387 per output image.**
  - Per-call total: **~$0.039**.
- **gemini-2.5-flash (Approach B):**
  - Input: $0.30 / 1M tokens, ~360 tokens → ~$0.000108.
  - Text output: $2.50 / 1M tokens, ≤50 tokens for the JSON → ~$0.000125.
  - Per-call total: **~$0.0002** (negligible).
- **`sharp` crop:** local CPU, $0.

**Spike total (5 samples × 2 approaches):**

- A: 5 × $0.039 = **$0.195**
- B: 5 × $0.0002 = **$0.001**
- **Total spike spend ≈ $0.20.** Negligible — even a 10× retry budget is < $2.

**Per-design production cost if Approach A ships:** adds ~$0.039 per
successful generation on top of the existing c-pipeline call. Roughly doubles
AI cost per design (current generation also uses the image-output model, same
~$0.04/image). Document for Don; cheap enough for the Mother's Day target.

---

## 5. Pivot ladder

If both A and B fail the rubric on ≥3/5 samples:

1. **Bbox + alpha-mask pass.** Take Approach B's crop, then run a second
   `gemini-2.5-flash-image` call with prompt "remove all non-polish pixels,
   transparent background." Combines literal pixels with synthesis cleanup.
   Cost ≈ $0.04, two-call latency.
2. **Regenerate-at-source (move to c-pipeline).** Modify the c-pipeline prompt
   so the original generation outputs a polish-only swatch alongside (or
   instead of) the hand photo. Eliminates the post step and its failure mode
   but requires re-spec'ing c-pipeline ACs and rebaselining all snapshots.
3. **Defer entire feature; ship d4 as-is.** Visualizer keeps the photo-window
   v1; document gap for post-Mother's-Day. Don decides whether the cheap
   visual is acceptable for the gift target.

---

## 6. Open questions for Don

1. **Synthesized vs literal pixels.** Approach A regenerates a swatch that
   _looks like_ the source's polish; it is not the same pixels. Acceptable
   for v1, or do we need literal-pixel fidelity (forces Approach B + mask
   pass)? Gates which approach we run.
2. **Index-finger only or per-nail pick?** Both prompts target the index
   finger. v1 uses one swatch across all 5 anchors per the story spec, so
   index is fine, but if the index nail in any sample is the worst-quality
   one we should consider "best-visible nail" instead.
3. **Pass threshold.** Is 4/5 samples passing the rubric the bar to ship, or
   do you want 5/5? 4/5 ships faster; 5/5 may force the pivot ladder for
   edge cases.
