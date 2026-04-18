# Anthropic Design Source References

This directory holds design HTML files produced via Anthropic's design tool and supplied as reference implementations for Epic A's UI stories.

## Sources

| Target Story                  | Intended Output  | Source URL                                                                            | Local File                 |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| a3-auth-allowlist-login       | `Login.html`     | https://api.anthropic.com/v1/design/h/Om611AAl_RAVq8ihg9ZfxA?open_file=Login.html     | `Login.html` (pending)     |
| a4-middleware-protected-shell | `Dashboard.html` | https://api.anthropic.com/v1/design/h/pGFCBONf3VFKjgTza3W26g?open_file=Dashboard.html | `Dashboard.html` (pending) |

## Status

**2026-04-18** — Source URLs are inaccessible to direct curl/fetch (HTTP 404 from outside an authenticated Claude surface). Local HTML files need to be supplied via:

1. Browser save-as from inside Claude.ai or similar authenticated context, OR
2. Raw HTML paste-through from the project owner, OR
3. Regeneration of longer-TTL / externally-fetchable links.

## Usage

When the ui-design step runs for a3 or a4, the ui-designer agent consults the local HTML at the path above (if present). Those HTML files represent the **intended visual target** — not loose inspiration. The agent should:

1. Read the target HTML (`Login.html` for a3, `Dashboard.html` for a4)
2. Extract the structure, typography usage, color usage, spacing pattern, and layout intent
3. Reconcile any drift from the brand system (`state/brand/brand-system.yaml`) and design tokens (`state/brand/tokens.json`) — brand tokens win if there's a conflict; the Anthropic source is a layout reference, not a brand override
4. Produce the per-story wireframe brief + PNG wireframe that implements the Anthropic design using our tokens

## Conflict precedence (if Anthropic source contradicts our brand)

| Dimension                                  | Winner                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Colors (hex values)                        | `state/brand/brand-system.yaml` (our brand)                                                |
| Typography (font family)                   | Our brand (Fraunces / Inter) — Anthropic source is reference for weight/size relationships |
| Spacing scale                              | Our brand tokens (`spacing.*`) — translate Anthropic pixel values into token references    |
| Radius                                     | Our brand tokens (`radius.*`)                                                              |
| Layout / structure / component composition | Anthropic source (this is its value-add)                                                   |
| Touch-target sizing                        | Our brand (min 44px) — enforce if Anthropic source uses smaller                            |

If the Anthropic source uses layout/structure we prefer over our earlier brand-guide mockups, prefer the Anthropic source but re-skin with our tokens.
