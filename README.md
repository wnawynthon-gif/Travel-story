# Travel Guide Engine v2.1

Unified Travel Story Engine + Travel Area Guide.

## v2.1 Auto Discover upgrade

Typing only a destination such as `Seoul` now instructs the AI to proactively discover:

- Must-see places and hidden gems
- Seasonal spots and foliage/bloom locations
- Romantic / atmospheric places
- Photo and check-in spots
- Famous streets and neighbourhoods
- University / campus spots
- Local stories and legends
- Food, cafes, shopping and markets
- Nearby places that combine into sensible walking routes

Seasonal entries now carry structured context for season/window, historical reference, station/access, etiquette and nearby pairings. Historical peak dates must not be presented as guaranteed dates for future years.

Included: Stories, history, legends/true stories, attractions, seasonal discoveries, food, cafes, shopping, streets/areas, photo spots, route, Google Maps search, Facebook/Instagram captions.

Removed completely: Visual workflow, illustration/image generation, visual prompts, Content Pack.

Deploy to Vercel and set `OPENAI_API_KEY`. Optional `OPENAI_MODEL` defaults to `gpt-5.6`.


## Vercel deployment note (v2.1 fixed)
Vercel should auto-detect `api/guide.js` as a Serverless Function. The `vercel.json` file is intentionally minimal (`{}`). When uploading to GitHub, make sure the `api` folder itself is uploaded and contains `guide.js`; uploading only the top-level files will make `/api/guide` unavailable.
