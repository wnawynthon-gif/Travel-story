// Travel Guide Engine v2.8 — api/guide.js
// v2.2 worked but exceeded the 55s budget: one request had to write the entire
// schema in a single pass. v2.3 split it into two smaller requests (guide +
// discover) fired in parallel, so wall-clock time is the slower one, not the
// sum. v2.8 splits the "discover" half again — discoveries and stories are
// now two separate calls, because together (6 discoveries with 9 fields each
// + up to 4 feature-length stories with 11 fields each, in Thai, which runs
// heavier per character than English) they could exceed a single call's
// token budget and come back "incomplete". Three calls now run in parallel
// instead of two.
//
// Env (all optional except the key):
//   OPENAI_API_KEY         required
//   OPENAI_MODEL           default gpt-5.6-luna   (luna = fastest, terra = balanced, sol = flagship)
//   OPENAI_EFFORT          default low            (none | low | medium | high)
//   OPENAI_SERVICE_TIER    e.g. fast              (only sent when set)
//   OPENAI_MAX_TOKENS      default 7000 per call  (guide + discoveries)
//   OPENAI_STORIES_TOKENS  default 9000 per call  (stories run longest, get more headroom)
//   MAX_SECONDS            default 55             (must stay under vercel maxDuration)

const MODEL = (process.env.OPENAI_MODEL || 'gpt-5.6-luna').trim();
const EFFORT = (process.env.OPENAI_EFFORT || 'low').trim();
const SERVICE_TIER = (process.env.OPENAI_SERVICE_TIER || '').trim();
const MAX_TOKENS = Number(process.env.OPENAI_MAX_TOKENS || 7000);
const STORIES_MAX_TOKENS = Number(process.env.OPENAI_STORIES_TOKENS || 9000);
const MAX_SECONDS = Number(process.env.MAX_SECONDS || 55);

const BASE = `You are Travel Guide Engine. Use real destinations, neighbourhoods, streets, markets, university campuses and landmarks. Never invent exact addresses. Clearly distinguish documented history from legends or folklore. Do not claim live opening hours, current prices or availability.

For anything seasonal, separate general guidance from historical observations. Never imply a specific historical peak date repeats every year. Prefer a window such as late October to mid-November over a guaranteed date.

Never output visual prompts, illustration prompts, image instructions or content packs. Write tightly: no preamble, no filler, no repetition. Return JSON only.

INPUT: the destination or area may be written in Thai, English or the local script. Interpret it correctly before answering — for example โซล is Seoul, เยาวราช is Yaowarat in Bangkok, ฮงแด is Hongdae, โอซาก้า is Osaka. Never treat a Thai spelling as an unknown place.`;

// Enum values (category, verification) are part of the schema contract and must
// stay in English regardless of the output language.
function langRule(lang) {
  if (lang === 'en') return 'OUTPUT LANGUAGE: write every text field in English.';
  if (lang === 'auto') return 'OUTPUT LANGUAGE: write every text field in the same language the user used for the destination and area.';
  return `OUTPUT LANGUAGE: write every text field in natural Thai (ภาษาไทย) — summary, descriptions, stories, tips, route notes and captions. Use the Thai name a Thai traveller would recognise, and add the local or English name in brackets on first mention where it helps, e.g. พระราชวังเคียงบกกุง (Gyeongbokgung). Do not translate the "category" and "verification" values: those two fields must stay exactly in English as the schema specifies.`;
}

const GUIDE_SYS = `${BASE}

You produce the PRACTICAL half of a travel guide: overview, areas/streets, attractions, photo spots, food, cafes, shopping, what to buy, a walkable route, tips and social captions.

Counts — areas 4, attractions 5, photo_spots 4, food 5, cafes 3, shopping 4, what_to_buy 4, route 5, tips 5.
Each description: one sentence. Keep the route geographically sensible.`;

const DISCOVERIES_SYS = `${BASE}

You produce the DISCOVERIES half of a travel guide: notable places worth seeking out beyond the obvious.

Discoveries — exactly 6, with variety across the categories rather than duplicates: seasonal foliage or blooms, romantic/atmospheric places, photo/check-in spots, university campuses, famous streets, hidden gems. Include less-obvious places when genuinely notable; do not limit yourself to the most famous tourist attractions. For a city such as Seoul, a campus avenue known for seasonal foliage is exactly the kind of place to surface.
For each: area, street, why it is special (one sentence), usual season/window, nearest useful station, etiquette/caution where relevant, and a nearby place that pairs on foot.`;

const storiesSys = (count) => `${BASE}

You produce DEEP PLACE STORIES for a travel guide — magazine-quality narratives, not generic history blurbs.

Exactly ${count}. Build each story around a strong narrative connection to a real place, object or person. Aim for the richness of a feature story: a surprising hook, the backstory, a human turn, why the physical place matters, and a memorable present-day ending.

Actively look for these story shapes when genuinely documented:
- a recent or famous incident tied to the place (theft, disappearance, discovery, scandal, disaster, rescue, protest, unusual event);
- a famous object/artwork/building and the people who owned, made, lost, recovered or transformed it;
- royalty, artists, writers, designers, scientists, criminals or ordinary people whose lives intersected there;
- rise-and-fall, lost-and-found, before-and-after, hidden origin, wartime survival, architectural controversy, local legend with a documented core;
- an unexpected connection between the place's founding idea and something that happened there later.

Do not force crime or tragedy into every destination. Prefer the strongest true narrative available. If a current/recent event cannot be confidently established, use a well-documented historical story instead. Never invent a breaking-news event, quote, exact price, exact date, casualty count or ownership chain. Clearly label uncertainty.

Each story must include: a short headline, story type, area, hook (1-2 sentences), narrative (5-8 concise sentences), a 3-6 point timeline, key people/objects, the connection to the place, verification level, a verification note explaining what is solid vs uncertain, why it matters to a traveller, and 3-5 search terms a human editor can use to fact-check or expand the story. Write for an intelligent traveller, not as an encyclopedia entry.`;

const item = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, street: { type: 'string' }, description: { type: 'string' } }, required: ['name', 'street', 'description'] };
const routeItem = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, area: { type: 'string' }, note: { type: 'string' }, time: { type: 'string' } }, required: ['name', 'area', 'note', 'time'] };
const discovery = { type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, area: { type: 'string' }, street: { type: 'string' }, category: { type: 'string', enum: ['Seasonal', 'Photo / Check-in', 'University / Campus', 'Famous Street', 'Hidden Gem', 'Atmospheric Place'] }, description: { type: 'string' }, season: { type: 'string' }, historical_reference: { type: 'string' }, nearest_station: { type: 'string' }, etiquette: { type: 'string' }, pair_with: { type: 'string' } }, required: ['name', 'area', 'street', 'category', 'description', 'season', 'historical_reference', 'nearest_station', 'etiquette', 'pair_with'] };
const story = { type: 'object', additionalProperties: false, properties: { title: { type: 'string' }, type: { type: 'string' }, area: { type: 'string' }, hook: { type: 'string' }, story: { type: 'string' }, timeline: { type: 'array', items: { type: 'string' } }, key_people_objects: { type: 'array', items: { type: 'string' } }, place_connection: { type: 'string' }, verification: { type: 'string', enum: ['Well documented', 'Widely reported', 'Local legend / folklore', 'Needs local verification'] }, verification_note: { type: 'string' }, why_it_matters: { type: 'string' }, fact_check_search_terms: { type: 'array', items: { type: 'string' } } }, required: ['title', 'type', 'area', 'hook', 'story', 'timeline', 'key_people_objects', 'place_connection', 'verification', 'verification_note', 'why_it_matters', 'fact_check_search_terms'] };

const guideSchema = { type: 'object', additionalProperties: false, properties: { city: { type: 'string' }, area: { type: 'string' }, summary: { type: 'string' }, best_time: { type: 'string' }, duration: { type: 'string' }, budget: { type: 'string' }, nearest_station: { type: 'string' }, areas: { type: 'array', items: item }, attractions: { type: 'array', items: item }, photo_spots: { type: 'array', items: item }, food: { type: 'array', items: item }, cafes: { type: 'array', items: item }, shopping: { type: 'array', items: item }, what_to_buy: { type: 'array', items: item }, route: { type: 'array', items: routeItem }, tips: { type: 'array', items: { type: 'string' } }, social_caption: { type: 'string' }, short_caption: { type: 'string' } }, required: ['city', 'area', 'summary', 'best_time', 'duration', 'budget', 'nearest_station', 'areas', 'attractions', 'photo_spots', 'food', 'cafes', 'shopping', 'what_to_buy', 'route', 'tips', 'social_caption', 'short_caption'] };
const discoveriesSchema = { type: 'object', additionalProperties: false, properties: { discoveries: { type: 'array', items: discovery } }, required: ['discoveries'] };
const storiesSchema = { type: 'object', additionalProperties: false, properties: { stories: { type: 'array', items: story } }, required: ['stories'] };

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

// One Responses API call. Throws Error with a readable message on any failure.
async function ask({ key, system, user, schema, name, signal, maxTokens }) {
  const payload = {
    model: MODEL,
    reasoning: { effort: EFFORT },
    max_output_tokens: maxTokens || MAX_TOKENS,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: system }] },
      { role: 'user', content: [{ type: 'input_text', text: user }] }
    ],
    text: { format: { type: 'json_schema', name, strict: true, schema } }
  };
  if (SERVICE_TIER) payload.service_tier = SERVICE_TIER;

  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const raw = await r.text();
  let j;
  try { j = JSON.parse(raw); }
  catch { throw new Error(`[${name}] OpenAI returned non-JSON (HTTP ${r.status}): ${raw.slice(0, 200)}`); }

  if (!r.ok) {
    const msg = j?.error?.message || `HTTP ${r.status}`;
    if (r.status === 401) throw new Error(`[${name}] ${msg} — the API key is invalid or revoked.`);
    if (r.status === 404) throw new Error(`[${name}] ${msg} — model "${MODEL}" is not available on this account.`);
    if (r.status === 429) throw new Error(`[${name}] ${msg} — rate limit or insufficient quota.`);
    if (r.status === 400 && SERVICE_TIER) throw new Error(`[${name}] ${msg} — try removing OPENAI_SERVICE_TIER.`);
    throw new Error(`[${name}] ${msg}`);
  }
  if (j.status === 'incomplete') throw new Error(`[${name}] ran out of output budget (${j?.incomplete_details?.reason || 'unknown'}) — raise OPENAI_MAX_TOKENS.`);

  const out = extractText(j);
  if (!out.trim()) throw new Error(`[${name}] OpenAI returned an empty response.`);
  try { return JSON.parse(out); }
  catch { throw new Error(`[${name}] model output was not valid JSON: ${out.slice(0, 200)}`); }
}

function fail(res, status, message, hint) {
  return res.status(status).json({ error: message, hint: hint || null, model: MODEL, effort: EFFORT });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true, service: 'travel-guide-engine', version: '2.8',
      model: MODEL, effort: EFFORT, serviceTier: SERVICE_TIER || null,
      maxSeconds: MAX_SECONDS,
      hasKey: Boolean((process.env.OPENAI_API_KEY || '').trim()),
      node: process.version
    });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return fail(res, 500, 'OPENAI_API_KEY is not configured', 'Vercel → Settings → Environment Variables, then Redeploy.');
  if (!/^[\x20-\x7E]+$/.test(key)) return fail(res, 500, 'OPENAI_API_KEY contains invalid characters', 'Re-paste the key without line breaks or spaces.');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { city = '', area = '', interest = 'auto', mode = 'all', lang = 'th' } = body || {};
  if (!String(city).trim()) return fail(res, 400, 'Destination is required');

  const context = `Destination: ${city}\nArea/street: ${area || 'Discover the best areas'}\nInterest: ${interest === 'auto' ? 'Auto Discover — choose the most rewarding mix yourself, do not wait for extra keywords' : interest}`;
  const guideUser = context + (mode === 'story' ? '\nMode: stories are the focus elsewhere — keep this practical half concise.' : '');
  const discoveriesUser = context;
  const storyCount = mode === 'area' ? 2 : 4;
  const storiesUser = context;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), MAX_SECONDS * 1000);
  const started = Date.now();

  try {
    // All three in flight at once: total time is the slowest one, not the sum.
    // Stories used to share a call (and a token budget) with discoveries; split
    // apart, each piece needs far less headroom to finish without truncating.
    const [guide, discoveries, stories] = await Promise.all([
      ask({ key, system: `${GUIDE_SYS}\n\n${langRule(lang)}`, user: guideUser, schema: guideSchema, name: 'guide', signal: ac.signal }),
      ask({ key, system: `${DISCOVERIES_SYS}\n\n${langRule(lang)}`, user: discoveriesUser, schema: discoveriesSchema, name: 'discoveries', signal: ac.signal }),
      ask({ key, system: `${storiesSys(storyCount)}\n\n${langRule(lang)}`, user: storiesUser, schema: storiesSchema, name: 'stories', signal: ac.signal, maxTokens: STORIES_MAX_TOKENS })
    ]);

    return res.status(200).json({
      ...guide,
      discoveries: discoveries.discoveries || [],
      stories: stories.stories || [],
      _meta: { model: MODEL, effort: EFFORT, lang, ms: Date.now() - started }
    });
  } catch (e) {
    if (e.name === 'AbortError' || /aborted/i.test(e.message || '')) {
      return fail(res, 504, `Generation took longer than ${MAX_SECONDS}s`,
        `Currently model=${MODEL}, effort=${EFFORT}. Try OPENAI_MODEL=gpt-5.6-luna and OPENAI_EFFORT=none, or enable Fluid compute and raise maxDuration to 300 with MAX_SECONDS=290.`);
    }
    return fail(res, 502, e.message || 'Unexpected server error');
  } finally {
    clearTimeout(timer);
  }
};
