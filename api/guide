// Travel Guide Engine v2.2 — api/guide.js
// Key fixes vs v2.1:
//  - GET /api/guide  => health check (proves the function is deployed + key is set)
//  - internal AbortController so we ALWAYS return JSON instead of Vercel's HTML 504 page
//  - API key .trim() (pasted keys in Vercel often carry a trailing newline)
//  - faster default model + low reasoning effort + max_output_tokens (latency was the real killer)
//  - never JSON.parse('') ; handles incomplete / refusal responses with a readable message

const MODEL = (process.env.OPENAI_MODEL || 'gpt-5.6-terra').trim();
const MAX_SECONDS = Number(process.env.MAX_SECONDS || 55); // must stay under vercel maxDuration

const SYSTEM = `You are Travel Guide Engine. Combine travel story research with practical area/street travel guidance. Use real destinations, neighbourhoods, streets, markets, university campuses and landmarks. Never invent exact addresses. Clearly distinguish documented history/true stories from legends or folklore. Do not claim live opening hours, current prices or availability.

When Interest is Auto Discover, actively search across these discovery lenses even when the user provides only a city name: must-see places, hidden gems, seasonal spots, autumn/spring foliage, romantic or atmospheric places, photo/check-in spots, famous streets, university/campus spots, local stories and legends, food, cafes, shopping, markets, and nearby places that combine into a sensible walking route. Do not limit discovery to the most famous tourist attractions.

For seasonal recommendations, separate general seasonal guidance from historical observations. Never imply that a specific historical peak date repeats every year. If mentioning a dated observation from a past year, label it as a historical reference and recommend checking that year's conditions before travel. Prefer a season/window such as late October to mid-November rather than a guaranteed exact date.

For each notable seasonal/photo/campus spot, include the most useful practical context available without inventing details: area/street, why it is special, usual season/window, nearest useful station or access point, etiquette/caution where relevant, and a nearby place that can be paired on foot. Keep routes geographically sensible.

Include attractions, seasonal spots, food, cafes, shopping, photo spots, stories, route and social captions. Never output visual prompts, illustration prompts, image instructions or content packs.

LENGTH BUDGET (important — the response must be produced quickly):
- discoveries: 6 entries, stories: 3, attractions: 5, food: 5, cafes: 3, shopping: 4, what_to_buy: 4, photo_spots: 4, areas: 4, route: 5, tips: 5.
- Every description: 1-2 sentences. Every story: 3-5 sentences. No preamble, no filler.
Return JSON only.`;

const item = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, street: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'street', 'description'] };
const discovery = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, area: { type: 'string' }, street: { type: 'string' }, category: { type: 'string', enum: ['Seasonal', 'Photo / Check-in', 'University / Campus', 'Famous Street', 'Hidden Gem', 'Atmospheric Place'] }, description: { type: 'string' }, season: { type: 'string' }, historical_reference: { type: 'string' }, nearest_station: { type: 'string' }, etiquette: { type: 'string' }, pair_with: { type: 'string' } }, required: ['name', 'area', 'street', 'category', 'description', 'season', 'historical_reference', 'nearest_station', 'etiquette', 'pair_with'] };
const story = { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, type: { type: 'string' }, area: { type: 'string' }, story: { type: 'string' }, verification: { type: 'string', enum: ['Well documented', 'Widely reported', 'Local legend / folklore', 'Needs local verification'] }, why_it_matters: { type: 'string' } }, required: ['title', 'type', 'area', 'story', 'verification', 'why_it_matters'] };
const routeItem = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, area: { type: 'string' }, note: { type: 'string' }, time: { type: 'string' } }, required: ['name', 'area', 'note', 'time'] };
const schema = { type: 'object', additionalProperties: false, properties: { city: { type: 'string' }, area: { type: 'string' }, summary: { type: 'string' }, best_time: { type: 'string' }, duration: { type: 'string' }, budget: { type: 'string' }, nearest_station: { type: 'string' }, areas: { type: 'array', items: item }, discoveries: { type: 'array', items: discovery }, stories: { type: 'array', items: story }, attractions: { type: 'array', items: item }, food: { type: 'array', items: item }, cafes: { type: 'array', items: item }, shopping: { type: 'array', items: item }, what_to_buy: { type: 'array', items: item }, photo_spots: { type: 'array', items: item }, route: { type: 'array', items: routeItem }, tips: { type: 'array', items: { type: 'string' } }, social_caption: { type: 'string' }, short_caption: { type: 'string' } }, required: ['city', 'area', 'summary', 'best_time', 'duration', 'budget', 'nearest_station', 'areas', 'discoveries', 'stories', 'attractions', 'food', 'cafes', 'shopping', 'what_to_buy', 'photo_spots', 'route', 'tips', 'social_caption', 'short_caption'] };

// Pull the model's text out of a Responses API payload, and surface refusals.
function extractText(j) {
  if (typeof j.output_text === 'string' && j.output_text.trim()) return j.output_text;
  let refusal = '';
  for (const o of j.output || []) {
    if (o.type !== 'message') continue;
    for (const c of o.content || []) {
      if (c.type === 'output_text' && c.text) return c.text;
      if (c.type === 'refusal' && c.refusal) refusal = c.refusal;
    }
  }
  if (refusal) throw new Error('Model refused the request: ' + refusal);
  return '';
}

function fail(res, status, message, hint) {
  return res.status(status).json({ error: message, hint: hint || null, model: MODEL });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  // Health check: open https://your-app.vercel.app/api/guide in a browser.
  // If you get JSON here, the function is deployed. If you get HTML, it is not.
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'travel-guide-engine',
      version: '2.2',
      model: MODEL,
      hasKey: Boolean((process.env.OPENAI_API_KEY || '').trim()),
      node: process.version
    });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return fail(res, 500, 'OPENAI_API_KEY is not configured', 'Vercel → Settings → Environment Variables → add OPENAI_API_KEY, then Redeploy.');
  if (!/^[\x20-\x7E]+$/.test(key)) return fail(res, 500, 'OPENAI_API_KEY contains invalid characters', 'Re-paste the key without line breaks or spaces.');

  // req.body is auto-parsed on Vercel, but fall back to manual parsing just in case.
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { city = '', area = '', interest = 'auto', mode = 'all' } = body || {};
  if (!String(city).trim()) return fail(res, 400, 'Destination is required');

  const focus = mode === 'story'
    ? 'Prioritize 5 strong stories; keep practical guide concise, but still return useful discovery spots.'
    : mode === 'area'
      ? 'Prioritize streets, attractions, seasonal/photo/campus discoveries, food, shopping and a walkable route; include only 2 concise stories.'
      : 'Create a balanced complete guide.';

  const auto = interest === 'auto'
    ? `AUTO DISCOVER REQUIREMENTS:
- Do not wait for extra keywords from the user.
- Proactively identify a diverse set of discoveries: seasonal foliage or blooms, romantic/atmospheric places, photo/check-in spots, university campuses, famous streets, hidden gems, food streets, shopping/markets, and nearby walkable combinations.
- Include less-obvious places when genuinely notable.
- For a city such as Seoul, a campus avenue known for seasonal foliage is exactly the kind of place Auto Discover should surface when relevant.
- Aim for 6 useful entries in discoveries, with variety rather than duplicates.`
    : `Interest focus: ${interest}. Still include at least a few complementary discoveries.`;

  const prompt = `Destination: ${city}\nArea/street: ${area || 'Discover best areas'}\nInterest: ${interest}\n${focus}\n${auto}`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), MAX_SECONDS * 1000);

  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        reasoning: { effort: process.env.OPENAI_EFFORT || 'low' },
        max_output_tokens: Number(process.env.OPENAI_MAX_TOKENS || 8000),
        input: [
          { role: 'system', content: [{ type: 'input_text', text: SYSTEM }] },
          { role: 'user', content: [{ type: 'input_text', text: prompt }] }
        ],
        text: { format: { type: 'json_schema', name: 'travel_guide_engine', strict: true, schema } }
      })
    });

    const raw = await r.text();
    let j;
    try { j = JSON.parse(raw); }
    catch { return fail(res, 502, `OpenAI returned non-JSON (HTTP ${r.status})`, raw.slice(0, 300)); }

    if (!r.ok) {
      return fail(res, r.status === 401 ? 401 : 502,
        j?.error?.message || `OpenAI request failed (HTTP ${r.status})`,
        r.status === 401 ? 'The API key is invalid or revoked.'
          : r.status === 404 ? `Model "${MODEL}" not available on this account. Set OPENAI_MODEL to one you have access to.`
            : r.status === 429 ? 'Rate limit or insufficient quota on the OpenAI account.' : null);
    }

    if (j.status === 'incomplete') {
      return fail(res, 502, 'The model ran out of output budget before finishing the JSON',
        `incomplete: ${j?.incomplete_details?.reason || 'unknown'} — raise OPENAI_MAX_TOKENS or use a smaller guide.`);
    }

    const out = extractText(j);
    if (!out.trim()) return fail(res, 502, 'OpenAI returned an empty response');

    let parsed;
    try { parsed = JSON.parse(out); }
    catch { return fail(res, 502, 'Model output was not valid JSON', out.slice(0, 300)); }

    return res.status(200).json(parsed);
  } catch (e) {
    if (e.name === 'AbortError') {
      return fail(res, 504, `Generation took longer than ${MAX_SECONDS}s`,
        'Use a faster model (OPENAI_MODEL=gpt-5.6-luna), or raise maxDuration in vercel.json after enabling Fluid compute.');
    }
    return fail(res, 500, e.message || 'Unexpected server error');
  } finally {
    clearTimeout(timer);
  }
};
