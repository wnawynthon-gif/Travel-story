"use strict";
const $=s=>document.querySelector(s),place=$("#place"),theme=$("#theme"),cards=$("#cards"),title=$("#resultTitle"),intro=$("#intro"),status=$("#status"),copyBtn=$("#copyBtn");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeUrl=u=>{try{const x=new URL(u);return ["http:","https:"].includes(x.protocol)?x.href:"#"}catch{return"#"}};
function render(d){
 title.textContent=d.destination||place.value.trim();intro.textContent=d.intro||"";
 cards.innerHTML=(d.stories||[]).map((s,i)=>`<article class="story-card">
 <div class="story-top"><span class="num">${String(i+1).padStart(2,"0")}</span><div><span class="badge ${esc((s.type||"FACT").toLowerCase())}">${esc(s.type)}</span><span class="confidence">${esc(s.confidence)}%</span></div></div>
 <h2>${esc(s.title)}</h2><p class="hook">${esc(s.hook)}</p><p>${esc(s.story)}</p>
 <div class="detail"><b>Why it matters</b><span>${esc(s.why_it_matters)}</span></div>
 <div class="detail"><b>📍 Location</b><span>${esc(s.location)}</span></div>
 <div class="detail"><b>📷 Photo idea</b><span>${esc(s.photo_idea)}</span></div>
 <details><summary>📚 Research</summary><p>${esc(s.research_note)}</p></details>
 <details><summary>✓ Verify</summary><p>${esc(s.verification)}</p></details>
 <div class="sources"><b>Sources</b>${(s.sources||[]).map(a=>`<a href="${safeUrl(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)} ↗</a>`).join("")}</div>
 </article>`).join("");
 copyBtn.hidden=false;status.textContent="VERIFIED STORY SET · 5";
}
async function run(action="SCOUT"){const p=place.value.trim();if(!p){place.focus();return}status.textContent=`AI · ${action}…`;title.textContent=p;intro.textContent="";cards.innerHTML="";copyBtn.hidden=true;
 try{const r=await fetch("/api/discover",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({place:p,theme:theme.value==="Auto Discover"?"":theme.value,action})});
 const d=await r.json();if(!r.ok)throw new Error(d.error||"API request failed");render(d);localStorage.setItem("tse-last-place",p)}
 catch(e){status.textContent="ERROR";intro.textContent="เชื่อมต่อ AI ไม่สำเร็จ: "+e.message}}
$("#discover").onclick=()=>run("SCOUT");document.querySelectorAll("[data-action]").forEach(b=>b.onclick=()=>run(b.dataset.action));
copyBtn.onclick=async()=>{await navigator.clipboard.writeText([...document.querySelectorAll(".story-card")].map(x=>x.innerText).join("\n\n"));copyBtn.textContent="Copied ✓";setTimeout(()=>copyBtn.textContent="Copy stories",1200)};
place.value=localStorage.getItem("tse-last-place")||"Vienna";