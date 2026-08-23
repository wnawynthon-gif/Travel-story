const $ = (s) => document.querySelector(s);

const place = $("#place");
const theme = $("#theme");
const title = $("#resultTitle");
const text = $("#resultText");
const cards = $("#storyCards");
const copyBtn = $("#copyBtn");
const score = $("#score");

let command = "";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function run(action = "SCOUT") {
  const p = place?.value?.trim();

  if (!p) {
    place?.focus();
    return;
  }

  const selectedTheme =
    theme?.value && theme.value !== "Auto Discover"
      ? theme.value
      : "";

  command = `${action}: ${p}${selectedTheme ? " / " + selectedTheme : ""}`;

  localStorage.setItem("tse-last-place", p);

  title.textContent = p;
  score.textContent = "AI";
  text.textContent = "กำลังค้นหาเรื่องราว...";
  cards.innerHTML = "";
  copyBtn.hidden = true;

  try {
    const response = await fetch("/api/discover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        place: p,
        theme: selectedTheme,
        action
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    const stories = Array.isArray(data.stories)
      ? data.stories
      : Array.isArray(data.results)
      ? data.results
      : [];

    title.textContent = data.title || p;
    text.textContent =
      data.summary ||
      data.intro ||
      `พบเรื่องราวสำหรับ ${p}`;

    if (stories.length) {
      cards.innerHTML = stories
        .map((story, index) => {
          const storyTitle =
            typeof story === "string"
              ? `เรื่องที่ ${index + 1}`
              : story.title || `เรื่องที่ ${index + 1}`;

          const storyText =
            typeof story === "string"
              ? story
              : story.description ||
                story.story ||
                story.text ||
                "";

          return `
            <div class="card">
              <strong>
                ${String(index + 1).padStart(2, "0")} ·
                ${escapeHtml(storyTitle)}
              </strong>
              <div>${escapeHtml(storyText)}</div>
            </div>
          `;
        })
        .join("");
    } else {
      cards.innerHTML = `
        <div class="card">
          <strong>AI Result</strong>
          <div>${escapeHtml(
            data.text ||
            data.content ||
            data.answer ||
            "ได้รับคำตอบจาก AI แล้ว"
          )}</div>
        </div>
      `;
    }

    copyBtn.hidden = false;
  } catch (error) {
    console.error(error);

    score.textContent = "ERROR";
    text.textContent =
      "เชื่อมต่อ AI ไม่สำเร็จ: " +
      (error?.message || "Unknown error");

    cards.innerHTML = "";
    copyBtn.hidden = true;
  }
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    run(button.dataset.action);
  });
});

copyBtn?.addEventListener("click", async () => {
  const result = [
    command,
    title?.textContent || "",
    text?.textContent || "",
    cards?.innerText || ""
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    await navigator.clipboard.writeText(result);
    copyBtn.textContent = "Copied ✓";

    setTimeout(() => {
      copyBtn.textContent = "Copy TSE Command";
    }, 1500);
  } catch {
    alert("ไม่สามารถ Copy ได้");
  }
});

const lastPlace = localStorage.getItem("tse-last-place");

if (lastPlace && place) {
  place.value = lastPlace;
}
