# Nail Tech Assistant

A single-user web app built as a personal gift. Bridges Pinterest inspiration to AI-generated nail-design previews on a five-nail hand visualizer.

**Not distributed. Not commercial. Not accepting sign-ups.** One user only.

## What it does

- Single-user email-allowlisted login
- Connects to the user's own Pinterest account to browse her boards and pins
- Accepts uploaded reference photos alongside Pinterest pins
- Generates a nail-design preview image from the chosen reference(s) and optional text prompt
- Renders the design on a 2D five-nail hand preview with shape selection (almond, coffin, square, stiletto)
- Saves designs to a personal library for later viewing and regeneration

## Tech

Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Firebase (Firestore + Auth + Cloud Storage + AI Logic), Vercel, Pinterest API v5, Gemini 2.5 Flash Image (via Firebase AI Logic).

## Privacy

See [PRIVACY.md](./PRIVACY.md).
