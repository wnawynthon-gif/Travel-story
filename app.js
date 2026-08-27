"use strict";
const $=s=>document.querySelector(s);
const place=$("#place"),theme=$("#theme"),cards=$("#cards"),title=$("#resultTitle"),intro=$("#intro"),status=$("#status");
const workspace=$("#workspace"),workStage=$("#workStage"),workTitle=$("#workTitle"),workContent=$("#workContent");
const selectedLabel=$("#selectedLabel"),finalPack=$("#finalPack"),packContent=$("#packContent");
let storySet=[], selected=null, context={};

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeUrl=u=>{try{const x=new URL(u);return ["http:","https:"].includes(x.protocol)?x.href:"#"}catch{return"#"}};
const busy=(label)=>{status.textContent=label;document.body.classList.add("busy")};
const done=()=>document.body.classList.remove("busy");

function renderStories(d){
  storySet=d.stories||[]; selected=null; context={}; workspace.hidden=true; finalPack.hidden=true;
  title.textContent=d.destination||place.value.trim(); intro.textContent=d.intro||"";
  selectedLabel.textContent="ยังไม่ได้เลือกเรื่อง";
  cards.innerHTML=storySet.map((s,i)=>`<article class="story-card" data-i="${i}" tabindex="0">
    <div class="story-top"><span class="num">${String(i+1).padStart(2,"0")}</span>
      <div><span class="badge ${esc((s.type||"FACT").toLowerCase())}">${esc(s.type)}</span></div>
    </div>
    <h2>${esc(s.title)}</h2><p class="hook">${esc(s.hook)}</p>
    <div class="detail"><b>📍 Location</b><span>${esc(s.location)}</span></div>
    <p class="hint">เลือกเรื่องนี้แล้ว Research จะค้นรายละเอียด ตรวจสอบข้อเท็จจริง และ Sources เฉพาะเรื่องที่เลือก</p>
    <button class="select-story" type="button">Select this story</button>
  </article>`).join("");
  document.querySelectorAll(".story-card").forEach(el=>{
    const choose=()=>selectStory(Number(el.dataset.i));
    el.querySelector(".select-story").onclick=e=>{e.stopPropagation();choose()};
    el.ondblclick=choose;
  });
  status.textContent="READY · 5 STORIES";
}

function selectStory(i){
  selected=storySet[i]; context={};
  document.querySelectorAll(".story-card").forEach((x,n)=>x.classList.toggle("selected",n===i));
  selectedLabel.textContent=`SELECTED · ${selected.title}`;
  workspace.hidden=false; workStage.textContent="SELECTED STORY"; workTitle.textContent=selected.title;
  workContent.innerHTML=`<p class="lead">${esc(selected.hook)}</p>
  <p><b>📍 ${esc(selected.location)}</b></p><p class="hint">ต่อด้วย Research → Verify → Write หรือเลือกขั้นอื่นได้</p>`;
  workspace.scrollIntoView({behavior:"smooth",block:"start"});
}

async function api(action, body, retry=true){
  const endpoint=action==="ILLUSTRATE"?"/api/illustrate":"/api/discover";
  const policy={
    SCOUT:{timeout:35000,retry:true,label:"การค้นหาเรื่องราวใช้เวลานานเกินไป ระบบลองแบบ Lightweight แล้ว กรุณาลองอีกครั้ง"},
    RESEARCH:{timeout:55000,retry:false,label:"การ Research ใช้เวลานานเกินไป กรุณาลอง Research อีกครั้ง"},
    VERIFY:{timeout:55000,retry:false,label:"การ Verify ใช้เวลานานเกินไป กรุณาลอง Verify อีกครั้ง"},
    WRITE:{timeout:55000,retry:false,label:"การเขียนเรื่องใช้เวลานานเกินไป กรุณาลอง Write อีกครั้ง"},
    VISUAL:{timeout:55000,retry:false,label:"การวางภาพใช้เวลานานเกินไป กรุณาลอง Visual อีกครั้ง"},
    MAP:{timeout:55000,retry:false,label:"การสร้าง Map ใช้เวลานานเกินไป กรุณาลอง Map อีกครั้ง"},
    ILLUSTRATE:{timeout:90000,retry:true,label:"การสร้าง Illustration ใช้เวลานานเกินไป กรุณาลอง Illustration อีกครั้ง"},
    CONTENT_SOCIAL:{timeout:65000,retry:true,label:"การสร้าง Social Content ใช้เวลานานเกินไป กรุณากด Content Pack อีกครั้ง"},
    CONTENT_REEL:{timeout:65000,retry:true,label:"การสร้าง Reel Script ใช้เวลานานเกินไป กรุณากด Content Pack อีกครั้ง"}
  }[action]||{timeout:55000,retry:false,label:"AI ใช้เวลานานเกินไป กรุณาลองขั้นตอนนี้อีกครั้ง"};
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),policy.timeout);
  try{
    const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...body}),signal:controller.signal});
    const text=await r.text();
    let d={}; try{d=text?JSON.parse(text):{}}catch{throw new Error(`Server returned invalid response (${r.status})`)}
    if(!r.ok)throw new Error(d.error||`API request failed (${r.status})`);
    return d;
  }catch(e){
    if(retry && policy.retry){
      await new Promise(resolve=>setTimeout(resolve,900));
      return api(action,body,false);
    }
    if(e.name==="AbortError")throw new Error(policy.label);
    throw e;
  }finally{clearTimeout(timer)}
}

async function discover(){
  const p=place.value.trim(); if(!p){place.focus();return}
  busy("AI · DISCOVERING…"); cards.innerHTML=""; intro.textContent="กำลังค้นหา 5 เรื่องที่มีมุมเล่าได้จริง…";
  try{
    const d=await api("SCOUT",{place:p,theme:theme.value==="Auto Discover"?"":theme.value});
    renderStories(d); localStorage.setItem("tse-last-place",p);
  }catch(e){status.textContent="ERROR";intro.textContent="เชื่อมต่อ AI ไม่สำเร็จ: "+e.message}finally{done()}
}

function renderStage(action,d){
  workspace.hidden=false; workStage.textContent=action; workTitle.textContent=selected.title;
  if(action==="RESEARCH") workContent.innerHTML=`<p class="lead">${esc(d.summary)}</p><h3>Key findings</h3><ul>${(d.findings||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h3>Questions to verify</h3><ul>${(d.questions||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  if(action==="VERIFY") workContent.innerHTML=`<div class="verdict">${esc(d.verdict)} · ${esc(d.confidence)}%</div><p class="lead">${esc(d.summary)}</p><h3>Verified</h3><ul>${(d.verified||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul><h3>Cautions</h3><ul>${(d.cautions||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  if(action==="WRITE") workContent.innerHTML=`<h3>${esc(d.headline)}</h3><p class="lead">${esc(d.opening)}</p>${(d.paragraphs||[]).map(x=>`<p>${esc(x)}</p>`).join("")}<p><b>Closing:</b> ${esc(d.closing)}</p>`;
  if(action==="VISUAL") workContent.innerHTML=`<p class="lead">${esc(d.visual_direction)}</p><h3>Shot list</h3><ul>${(d.shots||[]).map(x=>`<li><b>${esc(x.shot)}</b> — ${esc(x.direction)}</li>`).join("")}</ul><h3>Caption ideas</h3><ul>${(d.captions||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;
  if(action==="ILLUSTRATE") workContent.innerHTML=`<div class="generated-art"><img src="${d.image}" alt="AI illustration for ${esc(selected.title)}"></div><p class="lead">AI-generated editorial illustration for <b>${esc(selected.title)}</b></p><details><summary>Image prompt</summary><div class="promptbox">${esc(d.prompt||"")}</div></details>`;
  if(action==="MAP"){
    const stops=(d.stops||[]).slice(0,4);
    const q=x=>encodeURIComponent(x.location||x.name||"");
    const route=stops.length===4?`https://www.google.com/maps/dir/?api=1&origin=${q(stops[0])}&destination=${q(stops[3])}&waypoints=${q(stops[1])}%7C${q(stops[2])}&travelmode=walking`:"#";
    workContent.innerHTML=`<p class="lead">${esc(d.map_summary)}</p><ol class="map-stops">${stops.map((x,i)=>`<li><span class="stop-number">${i+1}</span><div><b>${esc(x.name)}</b> — ${esc(x.reason)}<br><small>${esc(x.location)}</small><br><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${q(x)}">Open point ${i+1} in Google Maps ↗</a></div></li>`).join("")}</ol><p><b>Route:</b> ${esc(d.route_note)}</p><a class="maplink route-link" target="_blank" rel="noopener" href="${route}">Open route 1 → 2 → 3 → 4 in Google Maps ↗</a>`;
  }
  if(action==="CONTENT"){
    workContent.innerHTML=`<h3>${esc(d.title)}</h3><p class="lead">${esc(d.short_caption)}</p><h3>Long caption</h3><p>${esc(d.long_caption)}</p><h3>Hashtags</h3><p>${(d.hashtags||[]).map(esc).join(" ")}</p><h3>Reel / Short-video script</h3><ol>${(d.reel_script||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`;
    renderFinalPack(d);
  }
}

async function runStage(action){
  if(!selected){selectedLabel.textContent="เลือก Story Card ก่อน";selectedLabel.classList.add("warn");setTimeout(()=>selectedLabel.classList.remove("warn"),1500);return}
  busy(`AI · ${action}…`); workspace.hidden=false; workStage.textContent=action; workContent.innerHTML="<p>กำลังทำงานกับ Story Card ที่เลือก…</p>";
  try{
    let d;
    if(action==="CONTENT"){
      workContent.innerHTML="<p>กำลังสร้าง Content Pack… <b>Social + Reel</b> ทำพร้อมกันเพื่อลดเวลารอ</p>";
      const payload={place:place.value.trim(),theme:theme.value,story:selected,context};
      const [social,reel]=await Promise.all([api("CONTENT_SOCIAL",payload),api("CONTENT_REEL",payload)]);
      d={...social,...reel};
    }else{
      d=await api(action,{place:place.value.trim(),theme:theme.value,story:selected,context});
    }
    context[action.toLowerCase()]=d; renderStage(action,d); status.textContent=`DONE · ${action}`;
  }catch(e){workContent.innerHTML=`<p class="error">ไม่สำเร็จ: ${esc(e.message)}</p><p class="hint">ข้อมูลขั้นก่อนหน้ายังอยู่ ไม่ต้องเริ่ม Discover ใหม่</p>`;status.textContent="ERROR"}finally{done()}
}

function renderFinalPack(content){
  finalPack.hidden=false;

  const titleText = content.title || selected?.title || "";
  const storyText = selected?.story || "";
  const verificationText = context.verify?.summary || "";
  const articleOpening = context.write?.opening || "";
  const articleParagraphs = context.write?.paragraphs || [];
  const socialCaption = content.long_caption || "";
  const hashtags = content.hashtags || [];

  packContent.innerHTML = `<div class="pack">
    <h3>${esc(titleText)}</h3>

    <h4>Story</h4>
    <p>${esc(storyText)}</p>

    ${verificationText ? `
      <h4>Verification</h4>
      <p>${esc(verificationText)}</p>
    ` : ""}

    ${articleOpening || articleParagraphs.length ? `
      <h4>Article</h4>
      ${articleOpening ? `<p>${esc(articleOpening)}</p>` : ""}
      ${articleParagraphs.map(p=>`<p>${esc(p)}</p>`).join("")}
    ` : ""}

    <h4>Social caption</h4>
    <p>${esc(socialCaption)}</p>

    ${hashtags.length ? `
      <h4>Hashtags</h4>
      <p>${hashtags.map(esc).join(" ")}</p>
    ` : ""}
  </div>`;

  finalPack.scrollIntoView({
    behavior:"smooth",
    block:"start"
  });
}

function plainText(el){return el.innerText||""}
$("#discover").onclick=discover;
document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>runStage(b.dataset.action));
$("#copyWork").onclick=async()=>{await navigator.clipboard.writeText(plainText(workContent));$("#copyWork").textContent="Copied ✓";setTimeout(()=>$("#copyWork").textContent="Copy result",1200)};
$("#copyAll").onclick=async()=>navigator.clipboard.writeText(plainText(packContent));
$("#downloadTxt").onclick=()=>{const blob=new Blob([plainText(packContent)],{type:"text/plain;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${(place.value||"travel-story").replace(/\s+/g,"-")}-content-pack.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("#downloadPdf").onclick = () => {
  const content = document.querySelector("#finalPack");

  if (!content) {
    alert("No content available");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    alert("Please allow pop-ups to create PDF");
    return;
  }

  printWindow.document.open();

  printWindow.document.write(`
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${selected?.title || "Travel Story Content Pack"}</title>

<style>
@page {
  size: A4 portrait;
  margin: 12mm;
}

* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #fff;
  color: #111;
}

body {
  font-family: -apple-system, BlinkMacSystemFont,
    "Noto Sans Thai", "Thonburi", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.55;
}

#finalPack {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  box-shadow: none !important;
  background: #fff !important;
}

#finalPack[hidden] {
  display: block !important;
}

.actions {
  display: none !important;
}

h1, h2, h3, h4 {
  break-after: avoid;
  page-break-after: avoid;
}

p {
  orphans: 3;
  widows: 3;
}
</style>
</head>

<body>
${content.outerHTML}

<script>
window.onload = function () {
  setTimeout(function () {
    window.print();
  }, 500);
};
<\/script>

</body>
</html>
  `);

  printWindow.document.close();
};


place.value="";
