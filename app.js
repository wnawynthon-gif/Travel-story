// Travel Guide Engine v2.2 — app.js
// Main fix: never call response.json() blindly. Safari reports non-JSON bodies as
// "The string did not match the expected pattern.", which hid the real server error.
const $=s=>document.querySelector(s);let mode='all',data=null,tab='overview';const city=$('#city'),area=$('#area'),interest=$('#interest'),content=$('#content');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const arr=v=>Array.isArray(v)?v:[];
document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode=b.dataset.mode});
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab=b.dataset.tab;if(data)render()});
function list(title,icon,items){return `<div class="card"><h3>${icon} ${title}</h3><ul>${arr(items).map(x=>`<li><b>${esc(x.name||x.title||x)}</b>${x.street?` — ${esc(x.street)}`:''}${x.description?`<br>${esc(x.description)}`:''}</li>`).join('')}</ul></div>`}
function discoveries(items){return arr(items).map(d=>`<div class="card"><small>${esc(d.category)}</small><h3>${esc(d.name)}</h3><p>${esc(d.description)}</p>${d.area?`<span class="tag">📍 ${esc(d.area)}</span>`:''}${d.street?`<span class="tag">🛣 ${esc(d.street)}</span>`:''}${d.season?`<span class="tag">🍁 ${esc(d.season)}</span>`:''}${d.nearest_station?`<span class="tag">🚇 ${esc(d.nearest_station)}</span>`:''}${d.historical_reference?`<p><b>Historical reference:</b> ${esc(d.historical_reference)}</p>`:''}${d.etiquette?`<p><b>Tip / etiquette:</b> ${esc(d.etiquette)}</p>`:''}${d.pair_with?`<p><b>Pair with:</b> ${esc(d.pair_with)}</p>`:''}</div>`).join('')}
function render(){if(!data)return;let g=data,html='';if(tab==='overview')html=`<div class="grid"><div class="card wide"><h3>🧭 Overview</h3><p>${esc(g.summary)}</p><span class="tag">🕐 ${esc(g.best_time)}</span><span class="tag">⏱ ${esc(g.duration)}</span><span class="tag">💰 ${esc(g.budget)}</span><span class="tag">🚇 ${esc(g.nearest_station)}</span></div>${list('Best Areas / Streets','📍',g.areas)}<div class="card wide"><h3>✨ Auto Discover</h3><div class="grid">${discoveries(g.discoveries)}</div></div>${list('Local Tips','💡',arr(g.tips).map(x=>({name:x})))}</div>`;
if(tab==='stories')html=`<div class="grid">${arr(g.stories).map(s=>`<div class="card story"><small>${esc(s.type)}</small><h3>${esc(s.title)}</h3><p>${esc(s.story)}</p><span class="tag">📍 ${esc(s.area)}</span><span class="tag">✓ ${esc(s.verification)}</span><p><b>Why it matters:</b> ${esc(s.why_it_matters)}</p></div>`).join('')}</div>`;
if(tab==='attractions')html=`<div class="grid">${list('Attractions','🏛️',g.attractions)}${list('Photo / Check-in','📸',g.photo_spots)}<div class="card wide"><h3>🍁 Seasonal / Photo / Campus Discoveries</h3><div class="grid">${discoveries(g.discoveries)}</div></div></div>`;
if(tab==='food')html=`<div class="grid">${list('Food & Drink','🍜',g.food)}${list('Cafés / Specialties','☕',g.cafes)}</div>`;
if(tab==='shopping')html=`<div class="grid">${list('Shopping','🛍️',g.shopping)}${list('What to Buy','🎁',g.what_to_buy)}</div>`;
if(tab==='route')html=`<div class="card"><h3>🚶 Suggested Route</h3>${arr(g.route).map((r,i)=>`<div class="route"><div class="num">${i+1}</div><div><b>${esc(r.name)}</b> — ${esc(r.area)}<br>${esc(r.note)} <span class="tag">${esc(r.time)}</span></div></div>`).join('')}</div>`;
if(tab==='social')html=`<div class="grid"><div class="card wide"><h3>📱 Facebook / Instagram</h3><pre>${esc(g.social_caption)}</pre></div><div class="card wide"><h3>✂️ Short Caption</h3><pre>${esc(g.short_caption)}</pre></div></div>`;content.innerHTML=html}

// Read the body as text first, then try to parse. This turns an opaque browser
// error into an actual diagnosis (404 = function not deployed, 504 = timeout, ...).
async function callApi(payload,timeoutMs=120000){
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeoutMs);
  let r,raw;
  try{
    r=await fetch('/api/guide',{method:'POST',signal:ac.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    raw=await r.text();
  }catch(e){
    if(e.name==='AbortError')throw Error(`หมดเวลารอ ${Math.round(timeoutMs/1000)} วินาที — ลองใช้โมเดลที่เร็วขึ้น (OPENAI_MODEL=gpt-5.6-luna)`);
    throw Error('เชื่อมต่อ /api/guide ไม่ได้: '+e.message);
  }finally{clearTimeout(timer)}

  let j=null;
  try{j=JSON.parse(raw)}catch{}

  if(j===null){
    const looksHtml=/^\s*</.test(raw);
    if(r.status===404)throw Error('404 — ไม่พบ /api/guide บน Vercel. ตรวจว่าโฟลเดอร์ api/ ถูก push ขึ้น GitHub จริง');
    if(r.status===504||r.status===408)throw Error('504 — ฟังก์ชันทำงานนานเกิน maxDuration ของ Vercel');
    throw Error(`เซิร์ฟเวอร์ตอบกลับเป็น${looksHtml?' HTML (หน้า error ของ Vercel)':'ข้อมูลที่ไม่ใช่ JSON'} — HTTP ${r.status}. ${raw.replace(/<[^>]*>/g,' ').trim().slice(0,160)}`);
  }
  if(!r.ok)throw Error((j.error||`HTTP ${r.status}`)+(j.hint?` — ${j.hint}`:''));
  return j;
}

$('#go').onclick=async()=>{
  if(!city.value.trim())return;
  $('#go').disabled=true;$('#status').textContent='GENERATING…';content.className='empty';content.textContent='Creating guide… (30–60s)';
  try{
    const j=await callApi({city:city.value.trim(),area:area.value.trim(),interest:interest.value,mode});
    data=j;
    $('#title').textContent=[j.area||area.value,j.city].filter(Boolean).join(' — ');
    $('#intro').textContent=j.summary;
    $('#copy').hidden=false;$('#maps').hidden=false;
    $('#chips').innerHTML=arr(j.areas).map(a=>`<button class="chip">${esc(a.name)}</button>`).join('');
    document.querySelectorAll('.chip').forEach((b,i)=>b.onclick=()=>{area.value=j.areas[i].name;mode='area'});
    content.className='';tab='overview';
    document.querySelectorAll('#tabs button').forEach(x=>x.classList.toggle('active',x.dataset.tab==='overview'));
    render();$('#status').textContent='READY';
  }catch(e){
    content.className='';
    content.innerHTML=`<div class="card"><b>เกิดข้อผิดพลาด</b><br>${esc(e.message)}<br><br><small>ตรวจสอบเบื้องต้น: เปิด <a href="/api/guide" target="_blank">/api/guide</a> ในแท็บใหม่ — ถ้าได้ JSON แปลว่าฟังก์ชัน deploy แล้ว และดูค่า hasKey ว่าเป็น true หรือไม่</small></div>`;
    $('#status').textContent='ERROR';
  }finally{$('#go').disabled=false}
};
$('#copy').onclick=()=>navigator.clipboard.writeText(JSON.stringify(data,null,2));
$('#maps').onclick=()=>window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([area.value,city.value].filter(Boolean).join(' ')),'_blank');
