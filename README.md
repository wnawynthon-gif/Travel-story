# Travel Story Engine v1.2.2
Fix: OpenAI structured JSON -> exactly 5 Story Cards. No legacy Markdown parsing.

Deploy to Vercel:
1. Replace repository root files with this package.
2. Keep `api/discover.js` inside the `api` folder.
3. Vercel Environment Variables: `OPENAI_API_KEY`; optional `OPENAI_MODEL`.
4. Redeploy. Test Vienna -> Discover Stories.
