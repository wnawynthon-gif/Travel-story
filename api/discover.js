const STORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    destination: { type: "string" },
    theme: { type: "string" },
    intro: { type: "string" },
    stories: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          type: { type: "string", enum: ["FACT", "MIXED", "LEGEND"] },
          hook: { type: "string" },
          story: { type: "string" },
          why_it_matters: { type: "string" },
          location: { type: "string" },
          photo_idea: { type: "string" }
        },
        required: ["title","type","hook","story","why_it_matters","location","photo_idea"]
      }
    }
  },
  required: ["destination","theme","intro","stories"]
};

function outputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const out of data?.output || []) {
    for (const c of out?.content || []) {
      if (c?.type === "output_text" && typeof c.text === "string") return c.text;
    }
  }
  return "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { place, theme = "", action = "SCOUT" } = req.body || {};
    if (!place?.trim()) return res.status(400).json({ error: "Destination is required" });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });

    const prompt = `Create exactly 5 distinct travel story cards for ${place.trim()}.
Action: ${action}. Theme: ${theme || "Auto Discover"}.
Write in Thai, while keeping proper place names in their commonly used local/English spelling.
Prioritize interesting, useful, historically grounded stories a traveller can actually experience.
FACT = well-established fact. LEGEND = folklore/legend. MIXED = fact with disputed/legendary elements.
Never present legend as fact. No markdown headings, no markdown bullets, no # characters.
Each card must have a concise hook, story, why_it_matters, specific location, and practical photo_idea.`;

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        text: {
          format: {
            type: "json_schema",
            name: "travel_story_cards",
            strict: true,
            schema: STORY_SCHEMA
          }
        }
      })
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "OpenAI request failed" });

    const raw = outputText(data);
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { return res.status(502).json({ error: "AI returned invalid structured data" }); }

    if (!Array.isArray(parsed.stories) || parsed.stories.length !== 5) {
      return res.status(502).json({ error: "AI did not return exactly 5 stories" });
    }
    return res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Travel Story Engine failed" });
  }
}
