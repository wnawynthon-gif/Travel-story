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

    const story = data.result;

if (!story) {
  throw new Error(data.error || "AI returned no story");
}

title.textContent = data.destination || p;
score.textContent = "AI";
text.textContent = story;

cards.innerHTML = `
  <div class="card">
    <strong>${escapeHtml(data.destination || p)}</strong>
    <div>${escapeHtml(story)}</div>
  </div>
`;

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
const discoverBtn = document.querySelector("#discover");

discoverBtn?.addEventListener("click", () => {
  run("SCOUT");
});

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
