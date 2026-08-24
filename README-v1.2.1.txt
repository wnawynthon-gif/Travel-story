Travel Story Engine v1.2.1 — iPad upload

WHAT CHANGED
- Discover now uses OpenAI Structured Outputs (JSON Schema).
- The API must return exactly 5 story objects; markdown/plain-text fallback was removed.
- Frontend therefore renders 5 Story Cards instead of one long markdown block.
- Cache version bumped to v1.2.1 so old app.js/style.css are less likely to remain on iPad/PWA.

IPAD / GITHUB
1. Upload/replace app.js, index.html, style.css, sw.js and other top-level files as needed.
2. GitHub cannot conveniently upload the api folder on iPad: open existing api/discover.js in GitHub, Edit, Select All, paste the contents of this package's discover.js, Commit.
3. Wait for Vercel deployment Ready.
4. Open the Vercel .vercel.app URL (not GitHub Pages).
5. Test Vienna > Discover Stories. Expected: exactly 5 separate cards.

Do not change or expose OPENAI_API_KEY.
