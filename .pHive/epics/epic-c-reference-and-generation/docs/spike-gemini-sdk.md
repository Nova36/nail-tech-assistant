# Gemini 2.5 Flash Image — Spike + SDK Decision

## Reference set (5+ types)

| #   | type              | primary ref source                                               | secondary refs | prompt                                       |
| --- | ----------------- | ---------------------------------------------------------------- | -------------- | -------------------------------------------- |
| 1   | minimal-nail-art  | i.pinimg.com/736x/6f/45/b1/6f45b1270e84b9949490b5ba4fd1c259.jpg  | _none_         | "clean, minimalist nail design …"            |
| 2   | complex-patterned | i.pinimg.com/736x/79/98/83/7998833663a5ad5caf41416b425076ab.jpg  | _none_         | "intricate patterned nail design …"          |
| 3   | abstract-palette  | i.pinimg.com/1200x/6f/3c/2a/6f3c2a025fccf6a9a80ac1a0bb873a32.jpg | _none_         | "translates color palette and mood …"        |
| 4   | nature-inspired   | i.pinimg.com/736x/e1/d4/4a/e1d44a73eb2fbc9638c294a1d1753b2a.jpg  | _none_         | "inspired by natural form, texture, color …" |
| 5   | fashion-editorial | i.pinimg.com/736x/57/4a/fb/574afba893c4d961fc06bc8d12f01de2.jpg  | _none_         | "high-fashion editorial nail design …"       |

Source of truth for primary URLs + full prompts: `spike-reference-set.md` (sibling file).

## Latency table

Single-run measurements per type (1 sample each, not 3-run avg). All on Vertex AI `us-central1`. Quality scored against the 1-5 rubric described under "Quality rubric".

| #   | type              | SDK             | latency | output quality (1-5) | notes                                                                                                   |
| --- | ----------------- | --------------- | ------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | minimal-nail-art  | `@google/genai` | 8.83s   | 5                    | clean almond nails, nude french tip, minimalist black dots — faithful to negative-space prompt          |
| 2   | complex-patterned | `@google/genai` | 8.39s   | 4                    | long colorful nails with lattice/mesh motif; vibrant + intricate; slightly over-styled palette          |
| 3   | abstract-palette  | `@google/genai` | 8.83s   | 5                    | short nails with playful rainbow swirls on sheer base — best palette-to-nail translation                |
| 4   | nature-inspired   | `@google/genai` | 8.32s   | 5                    | mushroom + leaves illustration on nude nails; whimsical and on-prompt                                   |
| 5   | fashion-editorial | `@google/genai` | 8.41s   | 2                    | generated a jewelry-laden hand editorial — nail surface itself was not the focal design; weakest output |

**Aggregate:** P50 8.41s · P95 8.83s · 5/5 successful generations.

**Quality summary:** 4/5 outputs scored ≥ 4 (unambiguous nail design); 1/5 borderline (fashion-editorial drifted to "hand with jewelry" rather than nail-focused). Well above the 3/5 GO threshold.

## Sample request payload

```js
// scripts/spike/gemini-spike.mjs — Vertex AI mode via @google/genai
const ai = new GoogleGenAI({
  vertexai: true,
  project: 'nail-tech-assistant',
  location: 'us-central1',
  googleAuthOptions: { credentials: <parsed FIREBASE_SERVICE_ACCOUNT_JSON> },
});

await ai.models.generateContent({
  model: 'gemini-2.5-flash-image',
  contents: [{
    role: 'user',
    parts: [
      { inlineData: { data: '<base64-jpeg>', mimeType: 'image/jpeg' } },
      { text: '<prompt — see spike-reference-set.md>' },
    ],
  }],
  config: {
    responseModalities: ['IMAGE', 'TEXT'],
  },
});
```

## Sample response payload

```js
// shape returned from ai.models.generateContent — first candidate, parts[]
response.candidates[0].content.parts = [
  // optional preamble text (sometimes present, sometimes empty)
  { text: "Here's a nail design that captures the vibrant color palette …" },
  // image (the artifact)
  { inlineData: { mimeType: 'image/png', data: '<base64-png>' } },
];
// Full PNG outputs saved to .pHive/epics/epic-c-reference-and-generation/spike-outputs/
// Average size ~1.1 MB per generation; 1024x1024-class output.
```

## SDK comparison

| criterion                | @google/generative-ai (legacy) / @google/genai (current)                                                                                             | firebase/ai                                                                                                                                                                                                                      | Vertex AI                                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| server-runtime support   | ✅ Node-canonical, no browser globals                                                                                                                | ❌ Not supported server-side — App Check enforces client attestation at proxy layer; `FileReader` browser global in samples; server bypass requires Admin SDK workaround and is getting harder (single-use tokens from May 2026) | ✅ Server-side first                                                                                                                                    |
| auth model               | API key (`GEMINI_API_KEY`) — AI Studio key                                                                                                           | App Check + client-scoped (Firebase AI Logic proxy enforces App Check before Gemini backend)                                                                                                                                     | ADC / service account (`GOOGLE_APPLICATION_CREDENTIALS` JSON or Workload Identity)                                                                      |
| billing model            | Pay-as-you-go on AI Studio (free tier excludes image-gen models — `limit: 0` confirmed in spike attempt #1 against `gemini-2.5-flash-preview-image`) | Bundled with Firebase                                                                                                                                                                                                            | GCP project billing (per-token + image-gen pricing) — confirmed working on `nail-tech-assistant` after enabling Vertex AI API + `roles/aiplatform.user` |
| streaming support        | ✅ `generateContentStream`                                                                                                                           | ✅                                                                                                                                                                                                                               | ✅                                                                                                                                                      |
| published Node samples   | ✅ Many                                                                                                                                              | ❌ Browser-only samples (FileReader path); no confirmed server-action samples                                                                                                                                                    | ✅ Many                                                                                                                                                 |
| bundle weight            | ~80 KB SDK only                                                                                                                                      | firebase@^12.12.0 already installed; `firebase/ai` submodule available — bundle cost already sunk                                                                                                                                | ~120 KB (`@google-cloud/vertexai`)                                                                                                                      |
| EOL / maintenance status | `@google/generative-ai` legacy (EOL 2025-08-31) — superseded by `@google/genai` v1.50.1+ (April 2026)                                                | Actively maintained; client-scoped by design                                                                                                                                                                                     | Actively maintained; GCP-infra-dependent                                                                                                                |

> **SDK note from spike attempt:** initial harness used `@google/generative-ai` (legacy, EOL 2025-08-31). Migrated to `@google/genai` (unified, current) for the Vertex run. Same SDK can target either AI Studio (API key) or Vertex (ADC/service-account) via the `vertexai: true` constructor flag — meaning c13 can swap backends without rewriting the call site.

## sync-vs-route recommendation

**Recommendation: sync server action for c14.**

Measured P95 = 8.83s, well under the 30s threshold for sync-eligible generation. No route-handler-with-streaming required for the v1 generate flow. Researcher's conservative prior (15-25s P95 community estimates) was wrong on the high side for our payload shape (1 input image + short text prompt); actual latency landed at ~8s with low spread.

c14 scope unchanged: sync server action calling `lib/ai/generate.ts`. Streaming can be added later as an enhancement if user feedback wants progress UI, but the network round-trip + ~8s wait is short enough that a non-streaming spinner is acceptable for v1.

## GO / NO-GO

**Verdict: GO.**

Rationale:

- **Quality:** 4/5 reference types produced unambiguously stylized-but-recognizable nail designs (rubric requires 3/5). Minimal, complex-patterned, abstract-palette, and nature-inspired all scored ≥ 4. Fashion-editorial drifted to "hand with jewelry" rather than a nail-focused composition (scored 2) — likely a prompt-engineering issue rather than a model capability gap; can be addressed with reference-aware prompt scaffolding in c14 (e.g., "the reference is for styling/palette mood; output must be a close-up of nail surfaces") rather than swapping providers.
- **Latency:** 5/5 calls succeeded within 8.32-8.83s. P95 under 30s threshold by a comfortable margin.
- **Auth:** Vertex AI via existing Firebase service account works end-to-end; no new credential surface needed.

## SDK lock

**Locked: `@google/genai` v1.x (Vertex AI mode), location `us-central1`, model `gemini-2.5-flash-image`.**

Rationale:

- `@google/generative-ai` (legacy) is EOL — non-starter.
- `firebase/ai` is browser-scoped — server-runtime work would fight App Check at the proxy.
- `@google/genai` unifies AI Studio + Vertex behind one SDK: c13's provider boundary becomes a constructor-flag swap if billing/auth models change, not a library swap.

Reuse the existing `FIREBASE_SERVICE_ACCOUNT_JSON` env var for auth — single credential serves Firebase Admin + Vertex AI. Service account already has `roles/aiplatform.user` granted on `nail-tech-assistant`.

## Quality rubric

3-of-5 reference types must produce stylized-but-recognizable output to count as GO. <3 = NO-GO.

## Latency rubric

P95 < 30s = sync-eligible (server action). P95 ≥ 30s = route + stream (forces c14 scope expansion).

## Spike run results

_Run timestamp: 2026-04-30T03:16:00.997Z_
_Backend: Vertex AI | Project: `nail-tech-assistant` | Location: `us-central1` | Model: `gemini-2.5-flash-image`_
_SDK: `@google/genai` (unified, current) | Auth: service-account JSON via `FIREBASE_SERVICE_ACCOUNT_JSON`_

| #   | Type              | Latency | OK? | Output                                                                             | Notes                                                                                                                   |
| --- | ----------------- | ------- | --- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | minimal-nail-art  | 8.83s   | ✅  | .pHive/epics/epic-c-reference-and-generation/spike-outputs/1-minimal-nail-art.png  |                                                                                                                         |
| 2   | complex-patterned | 8.39s   | ✅  | .pHive/epics/epic-c-reference-and-generation/spike-outputs/2-complex-patterned.png |                                                                                                                         |
| 3   | abstract-palette  | 8.83s   | ✅  | .pHive/epics/epic-c-reference-and-generation/spike-outputs/3-abstract-palette.png  | Here's a nail design that captures the vibrant color palette and abstract, playful mood of your reference image!        |
| 4   | nature-inspired   | 8.32s   | ✅  | .pHive/epics/epic-c-reference-and-generation/spike-outputs/4-nature-inspired.png   |                                                                                                                         |
| 5   | fashion-editorial | 8.41s   | ✅  | .pHive/epics/epic-c-reference-and-generation/spike-outputs/5-fashion-editorial.png | Here's a high-fashion editorial nail design inspired by the reference image, focusing on runway-ready styling, texture, |

**Aggregate latency:** P50 8.41s · P95 8.83s
**Success rate:** 5/5
