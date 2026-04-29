# Kickoff Decisions — Locked Answers

**Date:** 2026-04-17
**Source:** Design discussion open-question resolution with user

These decisions are **locked** — all downstream planning (H/V, structured outline, PRD, stories) treats them as constraints, not open items.

## Resolved from Design Discussion

| #   | Question                                        | Resolution                                                                                                                                                  |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pinterest dev app registration                  | **Not yet registered — user will register today.** Action-required prerequisite before Pinterest epic can start.                                            |
| 2   | Local dev callback strategy                     | **ngrok (or equivalent tunnel)** for local dev. Vercel preview for production callback.                                                                     |
| 3   | Gemini quality for reference-guided nail design | **Unvalidated — requires 1-day spike BEFORE committing to AI-generation epic.** If spike fails, pivot to fallback provider (FLUX.1-kontext or gpt-image-1). |
| 4   | Multi-reference handling                        | **(b) One primary reference, others as loose style cues.** UI must visually distinguish primary vs secondary.                                               |
| 5   | Text prompt vs reference priority               | **(b) Text can override visual cues.** Reference is a starting point; text is a constraint that wins conflicts.                                             |
| 6   | Exact data model for saved design               | Deferred to structured outline.                                                                                                                             |
| 7   | "Regenerate from saved design" in v1?           | **Yes, v1 feature.** Every saved design remembers its inputs and can re-fire Gemini.                                                                        |
| 8   | Gemini failure behavior                         | **(c) 1 silent auto-retry, then surface error with "adjust inputs" CTA.**                                                                                   |
| 9   | Tablet orientation                              | **Landscape-first.** Hand layout is wider than tall.                                                                                                        |
| 10  | Explicit client-presentation mode               | **Not in v1.** Main UI is good enough for client-facing use.                                                                                                |
| 11  | Image retention policy                          | **Indefinite retention in v1.** No pruning, no quota.                                                                                                       |
| 12  | 2D visual fidelity bar                          | **Stylized-but-recognizable.** Not photorealistic. Target: clean enough that a nail tech can extrapolate the final look.                                    |

## User-Action Prerequisites (parallel to development)

1. **Pinterest developer app registration** — today. User owns.
2. **Gemini API key provisioning** via Google AI Studio. User owns.
3. **Supabase project creation.** User owns.
4. **Vercel account + GitHub repo connection.** User owns.

These do NOT block kickoff planning, but they DO block first implementation PR.

## Derived Sequencing Implications

- **Gemini spike (Slice 0.5)** must complete before AI-generation epic is committed.
- **Pinterest OAuth Slice** cannot start until user completes dev-app registration (same day — low risk).
- **"Regenerate from saved design"** being in v1 means the design data model (Q6) must preserve reference set + prompt + generation metadata as a first-class record.
