"use strict";
const $ = s => document.querySelector(s);
const place = $("#place"), theme = $("#theme"), cards = $("#cards"), title = $("#resultTitle"),
      intro = $("#intro"), status = $("#status"), copyBtn = $("#copyBtn");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));

function render(data) {
  title.textContent = data.destination || place.value.trim();
  intro.textContent = data.intro || "";
  cards.innerHTML = (data.stories || []).map((s,i) => `
    <article class="story-card">
      <div class="story-top">
        <span class="num">${String(i+1).padStart(2,"0")}</span>
        <span class="badge ${esc((s.type||"FACT").toLowerCase())}">${esc(s.type)}</span>
      </div>
      <h2>${esc(s.title)}</h2>
      <p class="hook">${esc(s.hook)}</p>
      <p>${esc(s.story)}</p>
      <div class="detail"><b>Why it matters</b><span>${esc(s.why_it_matters)}</span></div>
      <div class="detail"><b>📍 Location</b><span>${esc(s.location)}</span></div>
      <div class="detail"><b>📷 Photo idea</b><span>${esc(s.photo_idea)}</span></div>
    </article>`).join("");
  copyBtn.hidden = false;
  status.textContent = "READY · 5 STORIES";
}

async function run(action="SCOUT") {
  const p = place.value.trim();
  if (!p) { place.focus(); return; }
  status.textContent = "AI · DISCOVERING…";
  title.textContent = p; intro.textContent = ""; cards.innerHTML = "";
  copyBtn.hidden = true;
  try {
    const r = await fetch("/api/discover", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({place:p, theme:theme.value === "Auto Discover" ? "" : theme.value, action})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "API request failed");
    render(data);
    localStorage.setItem("tse-last-place", p);
  } catch(e) {
    status.textContent = "ERROR";
    intro.textContent = "เชื่อมต่อ AI ไม่สำเร็จ: " + e.message;
  }
}
$("#discover").onclick = () => run("SCOUT");
document.querySelectorAll("[data-action]").forEach(b => b.onclick = () => run(b.dataset.action));
copyBtn.onclick = async () => {
  const text = [...document.querySelectorAll(".story-card")].map(x => x.innerText).join("\n\n");
  await navigator.clipboard.writeText(text);
  copyBtn.textContent="Copied ✓"; setTimeout(()=>copyBtn.textContent="Copy stories",1200);
};
place.value = localStorage.getItem("tse-last-place") || "Vienna";
