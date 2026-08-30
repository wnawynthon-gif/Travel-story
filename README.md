# Travel Guide Engine v2.4

Static frontend + two Vercel serverless functions on the OpenAI API.

## v2.4 — per-card illustrations

Every place card now carries its own "🎨 สร้างภาพ" button. Nothing is generated
until you press one, so the guide still returns in 20-60s and you only pay for
the images you actually want.

- `api/illustrate.js` accepts any card subject — discovery, attraction, photo
  spot, area, food, cafe, shop or story — not just a story as in v1.9.7. The
  old `{ story: {...} }` body shape is still accepted.
- The v1.9.6 watercolor scrapbook style and composition rules are carried over
  verbatim, including adaptive mood (legend/folklore renders cool and
  atmospheric, food renders warm and lively, seasonal follows the stated
  season).
- Finished images are cached in memory by place name, so switching tabs or
  revisiting a card never regenerates or re-bills.
- Each image gets a download link.
- Illustration failures render inside the card with a retry button; they never
  break the guide.

Buttons appear on: Best Areas, Auto Discover, Attractions, Photo/Check-in,
Food, Cafés, Shopping, What to Buy, and Stories. Not on Local Tips or Route.

## v2.3 — speed

The full schema in one request kept exceeding the function time limit. v2.3
splits it into two requests fired in parallel — practical guide, and
discoveries plus stories — so wall-clock time is the slower of the two rather
than the sum. Default model is `gpt-5.6-luna` at `low` reasoning effort.

## v2.2 — error visibility

`The string did not match the expected pattern.` was Safari's generic error for
calling `response.json()` on a non-JSON body: the app was receiving Vercel's
HTML 404 page because `api/guide.js` had been committed without its `.js`
extension. The frontend now reads the body as text first and reports the real
HTTP status, and both functions answer with JSON on every path, including a
`GET` health check.

## Environment variables

| Key | Default | Notes |
|---|---|---|
| `OPENAI_API_KEY` | — | required |
| `OPENAI_MODEL` | `gpt-5.6-luna` | text; `terra` balanced, `sol` flagship but slow |
| `OPENAI_EFFORT` | `low` | `none` is fastest |
| `OPENAI_MAX_TOKENS` | `5000` | per text call |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` | |
| `IMAGE_SIZE` | `1536x1024` | 3:2 landscape |
| `IMAGE_QUALITY` | `medium` | `low` is faster and cheaper |
| `MAX_SECONDS` | `55` | must stay under `maxDuration` |

## Health checks

- `/api/guide` — GET returns model, effort and `hasKey`
- `/api/illustrate` — GET returns image model, size, quality and `hasKey`

## Deploy notes

`vercel.json` declares both functions with `maxDuration: 60`, the Hobby ceiling
without Fluid compute. If a build fails with a `maxDuration` complaint, lower
the number or replace the file with `{}`. Enabling Fluid compute raises the
ceiling to 300; then set `MAX_SECONDS` to 290.

Files must sit at the repository root with `api/guide.js` and
`api/illustrate.js` inside the `api` folder, extensions included.
