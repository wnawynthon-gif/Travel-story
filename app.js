const $ = (s) => document.querySelector(s);
const place = $("#place"), theme = $("#theme"), title = $("#resultTitle"), text = $("#resultText");
const cards = $("#storyCards"), copyBtn = $("#copyBtn"), score = $("#score"), workflowNote = $("#workflowNote");
let command = "", currentStories = [], selectedStoryIndex = -1;

function escapeHtml(value = "") { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function statusLabel(v){ v=String(v||"FACT").toUpperCase(); return v==="LEGEND"?"ตำนาน":v==="MIXED"?"ข้อเท็จจริง + เรื่องเล่า":"ข้อเท็จจริง"; }
function selectedStory(){ return selectedStoryIndex >= 0 ? currentStories[selectedStoryIndex] : null; }

function renderStories(stories, topStory=1){
  currentStories = stories;
  if(selectedStoryIndex >= stories.length) selectedStoryIndex = -1;
  cards.innerHTML = stories.map((story,index)=>{
    const top=index+1===Number(topStory), selected=index===selectedStoryIndex;
    const mapQuery=encodeURIComponent([story.location, place?.value].filter(Boolean).join(", "));
    return `<article class="story-card ${top?"top-story":""} ${selected?"selected":""}" data-story-index="${index}">
      <div class="story-meta"><span>${String(index+1).padStart(2,"0")}</span>${top?'<span class="top-badge">TOP STORY</span>':""}<span class="fact-badge">${escapeHtml(statusLabel(story.fact_status))}</span></div>
      <h3>${escapeHtml(story.title||`เรื่องที่ ${index+1}`)}</h3>
      <p class="story-hook">${escapeHtml(story.hook||"")}</p>
      <p>${escapeHtml(story.background||"")}</p>
      ${story.see_today?`<div class="story-detail"><b>📍 ไปดูอะไรได้วันนี้</b><span>${escapeHtml(story.see_today)}</span></div>`:""}
      ${story.location?`<div class="story-detail"><b>สถานที่</b><span>${escapeHtml(story.location)}</span><a class="map-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mapQuery}">เปิดใน Google Maps ↗</a></div>`:""}
      ${story.photo?`<div class="story-detail"><b>📷 Shot</b><span>${escapeHtml(story.photo)}</span></div>`:""}
      <div class="select-hint">${selected?"✓ เรื่องนี้ถูกเลือก — ใช้ Workflow ด้านบนต่อได้":"แตะเพื่อเลือกเรื่องนี้"}</div>
    </article>`;
  }).join("");
  cards.querySelectorAll("[data-story-index]").forEach(card=>card.addEventListener("click",e=>{
    if(e.target.closest("a")) return;
    selectedStoryIndex=Number(card.dataset.storyIndex); renderStories(currentStories, topStory);
    const s=selectedStory(); workflowNote.textContent=`เลือก: ${s?.title||"Story"} — กด Research, Verify, Write, Visual, Illustrate, Map หรือ Content Pack เพื่อพัฒนาเรื่องนี้ต่อ`;
  }));
}

async function run(action="SCOUT"){
  const p=place?.value?.trim(); if(!p){place?.focus();return;}
  const selectedTheme=theme?.value&&theme.value!=="Auto Discover"?theme.value:"";
  const focus = action!=="SCOUT" ? selectedStory() : null;
  if(action!=="SCOUT" && !focus){
    workflowNote.textContent="กรุณาแตะเลือก Story Card ก่อน แล้วจึงกด Workflow ที่ต้องการ";
    cards.scrollIntoView({behavior:"smooth",block:"center"}); return;
  }
  command=`${action}: ${p}${selectedTheme?" / "+selectedTheme:""}${focus?" / "+focus.title:""}`;
  localStorage.setItem("tse-last-place",p); title.textContent=focus?.title||p; score.textContent=action==="SCOUT"?"AI":action;
  text.textContent=action==="SCOUT"?"กำลังค้นหาเรื่องราว... อาจใช้เวลาประมาณ 1 นาที":`กำลังทำ ${action} สำหรับ “${focus.title}”...`;
  cards.innerHTML='<div class="loading-card"><span class="spinner"></span><span>Travel Story Engine กำลังค้นหาและเรียบเรียงเรื่อง...</span></div>'; copyBtn.hidden=true;
  try{
    const response=await fetch("/api/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({place:p,theme:selectedTheme,action,selectedStory:focus})});
    const data=await response.json(); if(!response.ok) throw new Error(data.error||"API request failed");
    title.textContent=data.title||data.destination||p; score.textContent=action==="SCOUT"?"AI":action;
    selectedStoryIndex=-1;
    if(Array.isArray(data.stories)&&data.stories.length){ text.textContent=data.summary||`พบ ${data.stories.length} เรื่องสำหรับ ${p}`; renderStories(data.stories,data.top_story); }
    else if(data.result){ text.textContent=data.result; cards.innerHTML=""; currentStories=[]; }
    else throw new Error("AI returned no story");
    workflowNote.textContent=action==="SCOUT"?"แตะ Story Card ที่ต้องการ แล้วใช้ Workflow เพื่อพัฒนาเรื่องนั้นต่อ":`${action} เสร็จแล้ว — เลือกผลลัพธ์ที่ต้องการเพื่อทำขั้นต่อไป`;
    copyBtn.hidden=false;
  }catch(error){ console.error(error); score.textContent="ERROR"; text.textContent="เชื่อมต่อ AI ไม่สำเร็จ: "+(error?.message||"Unknown error"); cards.innerHTML=""; copyBtn.hidden=true; }
}

$("#discover")?.addEventListener("click",()=>run("SCOUT"));
document.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>run(button.dataset.action)));
copyBtn?.addEventListener("click",async()=>{ const result=[command,title?.textContent||"",text?.textContent||"",cards?.innerText||""].filter(Boolean).join("\n\n"); try{await navigator.clipboard.writeText(result);copyBtn.textContent="Copied ✓";setTimeout(()=>copyBtn.textContent="Copy Story Pack",1500);}catch{alert("ไม่สามารถ Copy ได้");}});
const lastPlace=localStorage.getItem("tse-last-place"); if(lastPlace&&place) place.value=lastPlace;
