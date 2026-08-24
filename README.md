# Travel Story Engine — v1.5

Stable final package built from the working v1.3.x architecture.

## Workflow
Discover 5 Stories → Select one Story Card → Research → Verify → Write → Visual → Illustrate → Map → Content Pack

## Final features
- Exactly 5 structured Story Cards
- FACT / MIXED / LEGEND + confidence
- Public source links
- Selected-card workflow with persistent context in the current session
- Research and verification stages
- Long-form Thai travel-story writing
- Photography/video shot planning
- Illustration art direction + image-generation prompt
- Map/story-route plan + Google Maps handoff
- Social Content Pack + reel script
- Copy result / Copy all / Save final pack as .txt
- Responsive iPad/mobile UI
- API key stays server-side in Vercel

## Deploy from iPad
Replace these root files in GitHub:
- index.html
- app.js
- style.css
- README.md

For the API:
- Open the existing `api/discover.js`
- Edit → Select All → replace with the FINAL `api/discover.js`
- Do not create a second `discover.js` at repository root.

Commit to `main`, wait for Vercel to show Ready, then test from the `.vercel.app` production URL.

Required Vercel environment variable:
`OPENAI_API_KEY`

Optional:
`OPENAI_MODEL`


## v1.5 changes

- New default Signature Illustration Style: watercolor + coloured-pencil travel journal on warm cream paper.
- Illustration prompts now explicitly avoid photorealistic/cinematic output and preserve location/cultural accuracy.

## v1.4 FINAL changes
- Illustrate now generates and displays a real AI image via `/api/illustrate`.
- Map always returns exactly 4 stops.
- Each stop has its own Google Maps link.
- Route button opens Google Maps Directions with points 1 → 2 → 3 → 4.
- Uses `OPENAI_IMAGE_MODEL` if set, otherwise `gpt-image-2`.
