const storySchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "stories", "top_story"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    stories: {
      type: "array", minItems: 5, maxItems: 5,
      items: {
        type: "object", additionalProperties: false,
        required: ["title", "hook", "background", "see_today", "photo", "fact_status", "location"],
        properties: {
          title: { type: "string" }, hook: { type: "string" }, background: { type: "string" },
          see_today: { type: "string" }, photo: { type: "string" },
          fact_status: { type: "string", enum: ["FACT", "MIXED", "LEGEND"] },
          location: { type: "string" }
        }
      }
    },
    top_story: { type: "integer", minimum: 1, maximum: 5 }
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { place: destination, theme = "Auto Discover", action = "SCOUT", selectedStory = null } = req.body || {};
    if (!destination?.trim()) return res.status(400).json({ error: "Please enter a destination." });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });

    const guides = {
      SCOUT: "Discover five distinct hidden, surprising and visitable travel stories.",
      DEEP: "Research five deeper sub-angles of the selected story with traveller-useful context.",
      VERIFY: "Produce five verification angles/claims for the selected story; be conservative about certainty.",
      WRITE: "Develop five polished narrative angles from the selected story.",
      VISUAL: "Develop five real-world visual/photo opportunities connected to the selected story.",
      ILLUST: "Develop five illustration concepts grounded in the selected story and destination.",
      MAP: "Develop five real-world stops connected to the selected story, with usable place names.",
      PACK: "Develop five content-pack components from the selected story."
    };

    const prompt = `Travel Story Engine v1.2.1\nDestination: ${destination.trim()}\nTheme: ${theme || "Auto Discover"}\nAction: ${action}\nTask: ${guides[action] || guides.SCOUT}\n${selectedStory ? `Selected story: ${JSON.stringify(selectedStory)}\nStay on this story; do not restart with unrelated ideas.` : ""}\n\nWrite all user-facing text in Thai. Prefer stories behind visible details, local memory, history, traditions, food/drink and physical evidence that can still be visited. Do not invent facts. Clearly distinguish established fact, mixed/uncertain material and legend. Keep each card concise and useful on a phone. Return five distinct cards.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: prompt,
        text: { format: { type: "json_schema", name: "travel_story_cards", strict: true, schema: storySchema } }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error:", JSON.stringify(data));
      return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });
    }

    const raw = data.output_text || data.output?.flatMap(x => x.content || []).filter(x => x.type === "output_text").map(x => x.text).join("") || "";
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { console.error("Structured output parse error", e, raw.slice(0,500)); return res.status(502).json({ error: "AI returned an invalid structured response. Please try again." }); }

    if (!Array.isArray(parsed.stories) || parsed.stories.length !== 5) return res.status(502).json({ error: "AI did not return five story cards. Please try again." });
    return res.status(200).json({ destination: destination.trim(), theme, action, ...parsed });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Travel Story Engine failed." });
  }
}
