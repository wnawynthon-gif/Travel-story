export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { place: destination, theme = "Auto Discover", action = "SCOUT", selectedStory = null } = req.body || {};
    if (!destination || !destination.trim()) return res.status(400).json({ error: "Please enter a destination." });
    if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });

    const actionGuide = {
      SCOUT: "Discover 5 distinct hidden travel stories. Prioritise surprising, visitable stories.",
      DEEP: "Research 5 deeper historical/cultural angles and add useful context for a traveller.",
      VERIFY: "Return 5 claims worth using, clearly marking confidence and what should be independently verified.",
      WRITE: "Create 5 strong story angles suitable for turning into polished travel content.",
      VISUAL: "Create 5 visual/photo story opportunities with what to look for and photograph on location.",
      ILLUST: "Create 5 illustration concepts grounded in the destination's real history and visual identity.",
      MAP: "Create 5 story stops that can become a walking/driving map, naming the real-world place to visit.",
      PACK: "Create a compact 5-item content pack: story angle, hook, why it matters, visitable evidence and photo idea."
    };

    const prompt = `You are Travel Story Engine v1.2.\nDestination: ${destination.trim()}\nTheme: ${theme || "Auto Discover"}\nWorkflow action: ${action}\nTask: ${actionGuide[action] || actionGuide.SCOUT}\n${selectedStory ? `Selected story to develop: ${JSON.stringify(selectedStory)}\nIMPORTANT: Work specifically from this selected story. Produce 5 useful sub-angles/outputs that advance this same story; do not restart with unrelated destination ideas.` : ""}\n\nWrite in Thai. Do not merely list famous attractions. Prefer stories behind visible details, local memory, laws/traditions, food/drink history, and physical evidence that can still be visited. Do not invent facts; distinguish legend from established fact.\n\nReturn ONLY valid JSON (no markdown fences) in exactly this shape:\n{\n  "title": "short destination title",\n  "summary": "2-3 sentence Thai overview",\n  "stories": [\n    {\n      "title": "short story title",\n      "hook": "one compelling sentence",\n      "background": "2-4 concise Thai sentences",\n      "see_today": "specific thing/place the traveller can see today",\n      "photo": "what to photograph",\n      "fact_status": "FACT, MIXED, or LEGEND",\n      "location": "specific place name if known, otherwise empty string"\n    }\n  ],\n  "top_story": 1\n}\nReturn exactly 5 stories. top_story is the 1-based index of the strongest story.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: "gpt-5.6-luna", input: prompt })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI error:", data);
      return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });
    }

    const raw = data.output?.flatMap(item => item.content || [])
      ?.filter(item => item.type === "output_text")
      ?.map(item => item.text)?.join("\n")?.trim() || "";

    let parsed = null;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("JSON parse fallback:", e);
    }

    if (parsed && Array.isArray(parsed.stories)) {
      return res.status(200).json({
        destination: destination.trim(), theme, action,
        title: parsed.title || destination.trim(),
        summary: parsed.summary || "",
        stories: parsed.stories.slice(0, 5),
        top_story: Number(parsed.top_story) || 1
      });
    }

    // Safe fallback: never leave the UI stuck if the model returns plain text.
    return res.status(200).json({ destination: destination.trim(), theme, action, result: raw });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Travel Story Engine failed to generate a story." });
  }
}
