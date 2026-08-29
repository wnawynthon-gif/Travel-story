# Travel Guide Engine v2.2

Unified Travel Story Engine + Travel Area Guide.
Static frontend + one Vercel serverless function calling the OpenAI Responses API.

## What v2.2 fixes

The v2.1 build failed with `The string did not match the expected pattern.`

That message is Safari's generic error. The frontend called `response.json()` on a
body that was not JSON — the Vercel HTML error page (504 timeout or 404 missing
function) — and Safari surfaced its own cryptic wording instead of the real cause.

Changes:

1. **Frontend reads the body as text first**, then parses. HTTP status and the
   actual server message are now shown, so the real failure is visible.
2. **`GET /api/guide` health check** — returns `{ ok, model, hasKey, node }`.
   Instant answer to "is the function deployed and is the key set?"
3. **Server-side abort at `MAX_SECONDS` (55s)** so the function returns a JSON 504
   before Vercel's own timeout replaces it with an HTML page.
4. **`maxDuration: 60` in vercel.json** plus `package.json` pinning Node 22.
5. **Faster default model** — `gpt-5.6-terra` with `reasoning.effort: low` and
   `max_output_tokens`. v2.1 used the `gpt-5.6` alias, which routes to the flagship
   `gpt-5.6-sol`; generating this whole schema with it regularly exceeded 60s.
6. **Explicit length budget in the system prompt** — fixed item counts and 1–2
   sentence descriptions, so the response finishes inside the time budget.
7. **API key is trimmed and validated** — a pasted trailing newline no longer
   produces an invalid Authorization header.
8. **No more `JSON.parse('')`** — empty output, refusals, and `status: "incomplete"`
   each return their own readable error.
9. Duplicate submissions blocked while a request is in flight.

## Auto Discover

Typing only a destination such as `Seoul` instructs the model to proactively
discover must-see places, hidden gems, seasonal foliage spots, romantic and
atmospheric places, photo/check-in spots, famous streets, university campuses,
local stories and legends, food, cafes, shopping and markets, plus nearby places
that combine into a sensible walking route.

Seasonal entries carry structured context for season/window, historical reference,
station/access, etiquette and nearby pairings. Historical peak dates are never
presented as guaranteed dates for future years.

## Deploy

Push to GitHub, import into Vercel, set `OPENAI_API_KEY`, deploy.
See `DEPLOY_CHECK.txt` for the full troubleshooting order.
