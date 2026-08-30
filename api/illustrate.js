// Travel Guide Engine v2.4 — api/illustrate.js
// Generates one illustration for a single card the user picked.
// v1.9.7 only accepted a `story`; this accepts any card subject (discovery,
// attraction, photo spot, area, food, shop) and keeps the same signature style.
//
// POST body:
//   { city, place, subject: { name, description, area, street, category, type, verification, season }, context }
//   (legacy { story: {...} } is still accepted)
//
// Env: OPENAI_API_KEY (required), OPENAI_IMAGE_MODEL (default gpt-image-2),
//      IMAGE_SIZE (default 1536x1024), IMAGE_QUALITY (default medium),
//      MAX_SECONDS (default 55)

const IMAGE_MODEL = (process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2').trim();
const IMAGE_SIZE = (process.env.IMAGE_SIZE || '1536x1024').trim();
const IMAGE_QUALITY = (process.env.IMAGE_QUALITY || 'medium').trim();
const MAX_SECONDS = Number(process.env.MAX_SECONDS || 55);

const STYLE = `TRAVEL STORY SIGNATURE STYLE (mandatory): hand-painted watercolor + coloured-pencil travel scrapbook / illustrated city-guide on warm ivory paper. Keep the same charming handcrafted visual identity, simplified friendly shapes, loose pencil outlines and soft watercolor blooms. ADAPTIVE MOOD: infer mood from the subject's category, title and writing. FOOD/CULTURE/LOCAL LIFE = warm, lively, fresh. HISTORY = reflective, textured, gently muted. LEGEND/FOLKLORE/MYSTERY/DISPUTED = atmospheric blue-hour or overcast palette, cooler sage/blue/grey/lavender, subtle mist, long soft shadows, symbolic silhouettes and more negative space; mysterious but elegant, never gore or horror-poster imagery. TRAGEDY = restrained, respectful and subdued. NATURE/ROMANCE/SEASONAL = soft luminous warmth with the foliage or blooms of the stated season. Never use cheerful tourist-family or tea-party motifs when they conflict with a dark or mysterious subject. Never depict supernatural claims as documentary fact. Avoid photorealism, glossy 3D, anime and corporate vector art. Use simplified friendly shapes, loose pencil outlines, soft watercolor blooms, small doodles and handcrafted imperfections. Palette: fresh sky blue, coral, peach, butter yellow, sage/mint green, lavender and warm terracotta with plenty of clean cream negative space. People are cute editorial travel characters with warm expressions and slightly simplified proportions, not realistic portraits. Architecture and landmarks remain recognizable and geographically accurate, but render them lightly and delightfully rather than with heavy historical realism. Avoid sepia, muddy brown dominance, military/documentary mood, dramatic shadows, hyper-detailed realism, glossy 3D, anime, corporate vector art and photo-collage aesthetics.`;

const COMPOSITION = `COMPOSITION RULES (mandatory): Make it feel like a premium illustrated travel diary whose emotional tone follows ADAPTIVE MOOD, not a historical reconstruction. ONE IMAGE = ONE FRIENDLY PRIMARY SCENE. Use one welcoming hero scene as the main visual (about 65%). If useful, add only 2-3 SMALL floating scrapbook vignettes (together no more than 25%) for craft, food, history or local details. Vignettes should have soft watercolor edges or playful sketch bubbles, never hard cinematic montage seams. Keep strong breathing room and an easy visual flow. Show everyday travel life: strolling visitors, cafes, flowers, market details, small objects and cheerful human moments when relevant. Historical elements must be small, charming supporting memories rather than dominant portraits. Never make weapons, military vehicles, rulers, factories, monuments or machinery visually dominant unless the subject is specifically about them; if such an object is necessary, soften and reduce it to a small supporting vignette.

REFERENCE FEEL: premium illustrated travel guide / cute editorial travel journal / watercolor city diary — lively like a hand-drawn holiday notebook.

LAYOUT: image only. Do not generate headings, captions, labels, logos, UI, watermarks, borders, itinerary cards or readable text inside the image.`;

function buildPrompt({ city, place, subject, context }) {
  const lines = [
    subject.name && `Subject: ${subject.name}`,
    subject.category && `Category: ${subject.category}`,
    subject.type && `Type: ${subject.type}`,
    subject.description && `Description: ${subject.description}`,
    subject.story && `Story: ${subject.story}`,
    subject.season && `Season / window: ${subject.season}`,
    (subject.area || place) && `Area: ${subject.area || place}`,
    subject.street && `Street: ${subject.street}`,
    city && `City: ${city}`,
    subject.verification && `Verification level: ${subject.verification}`
  ].filter(Boolean).join('\n');

  const extra = context && Object.keys(context).length ? `\nAdditional context: ${JSON.stringify(context).slice(0, 800)}` : '';

  return `Create a landscape travel-journal illustration (3:2) for the subject below. The emotional mood must match the subject.

${STYLE}

${lines}${extra}

CONTENT ACCURACY: Keep the key landmark, architecture, local craft/food and cultural context recognizable and accurate for this specific place. Do not depict uncertain legends as fact — if the verification level indicates legend or folklore, render it as an atmospheric suggestion rather than a documentary scene.

${COMPOSITION}`;
}

function fail(res, status, message, hint) {
  return res.status(status).json({ error: message, hint: hint || null, imageModel: IMAGE_MODEL });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true, service: 'travel-guide-illustrate', version: '2.4',
      imageModel: IMAGE_MODEL, size: IMAGE_SIZE, quality: IMAGE_QUALITY,
      hasKey: Boolean((process.env.OPENAI_API_KEY || '').trim()), node: process.version
    });
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'Method not allowed');

  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return fail(res, 500, 'OPENAI_API_KEY is not configured', 'Vercel → Settings → Environment Variables, then Redeploy.');

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const { city = '', place = '', context = {}, subject, story } = body || {};

  // Legacy shape: { story: { title, story, location } }
  const subj = subject || (story ? {
    name: story.title, story: story.story, type: story.type,
    area: story.location || story.area, verification: story.verification
  } : null);

  if (!subj || !subj.name) return fail(res, 400, 'Pick a place or story to illustrate first');

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), MAX_SECONDS * 1000);
  const started = Date.now();

  try {
    const prompt = buildPrompt({ city, place, subject: subj, context });
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      signal: ac.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: IMAGE_MODEL, prompt, size: IMAGE_SIZE, quality: IMAGE_QUALITY, output_format: 'webp' })
    });

    const raw = await r.text();
    let d;
    try { d = JSON.parse(raw); }
    catch { return fail(res, 502, `Image API returned non-JSON (HTTP ${r.status})`, raw.slice(0, 200)); }

    if (!r.ok) {
      const msg = d?.error?.message || `HTTP ${r.status}`;
      if (r.status === 401) return fail(res, 401, msg, 'The API key is invalid or revoked.');
      if (r.status === 403) return fail(res, 403, msg, 'This account may need identity verification before it can use image models.');
      if (r.status === 404) return fail(res, 502, msg, `Image model "${IMAGE_MODEL}" is not available on this account. Set OPENAI_IMAGE_MODEL.`);
      if (r.status === 429) return fail(res, 502, msg, 'Rate limit or insufficient quota.');
      return fail(res, 502, msg);
    }

    const item = d?.data?.[0] || {};
    const image = item.b64_json ? `data:image/webp;base64,${item.b64_json}` : item.url;
    if (!image) return fail(res, 502, 'Image generation returned no image');

    return res.status(200).json({ image, subject: subj.name, ms: Date.now() - started });
  } catch (e) {
    if (e.name === 'AbortError') {
      return fail(res, 504, `Illustration took longer than ${MAX_SECONDS}s`,
        'Try IMAGE_QUALITY=low, or enable Fluid compute and raise maxDuration.');
    }
    return fail(res, 500, e.message || 'Illustration failed');
  } finally {
    clearTimeout(timer);
  }
};
