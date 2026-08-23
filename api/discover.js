export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { place: destination, theme = "Auto Discover", action = "SCOUT" } = req.body || {};

    if (!destination || !destination.trim()) {
      return res.status(400).json({
        error: "Please enter a destination."
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY is not configured."
      });
    }

    const prompt = `
You are Travel Story Engine v1.0.

Destination: ${destination.trim()}
Theme: ${theme}

Your job is to discover compelling stories behind this place,
not simply list tourist attractions.

Research and create a Travel Story Scout in Thai.

Look for:

1. สิ่งที่คนเห็น แต่ไม่รู้ที่มา
Find an object, sign, building, ritual, tradition or detail
that opens the door to hidden history.

2. Tourist story vs Local story
Explain how the tourist image differs from the everyday
experience, memory or perspective of local people.

3. กฎหมายที่สร้างวัฒนธรรม
Find a law, decree, privilege, regulation or historical rule
that left a visible cultural legacy.

4. กินหรือดื่มประวัติศาสตร์
Find food or drink connected to real people, historical events,
trade, politics, geography or local identity.

5. อดีตที่ยังถ่ายรูปได้วันนี้
Find physical evidence of the past that a traveller can still
visit, see and photograph today.

For every story:
- give a strong story hook
- explain the historical background
- explain why it matters
- identify what can still be seen today
- distinguish established fact from legend when necessary
- avoid inventing facts
- suggest what the traveller should photograph

End with:
TOP STORY — select the single strongest story for travel content.

Write clearly in Thai.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI request failed."
      });
    }

    const text =
      data.output
        ?.flatMap(item => item.content || [])
        ?.filter(item => item.type === "output_text")
        ?.map(item => item.text)
        ?.join("\n") || "";

    return res.status(200).json({
      destination: destination.trim(),
      theme,
      result: text
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Travel Story Engine failed to generate a story."
    });
  }
}
