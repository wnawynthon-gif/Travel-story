// Travel Guide Engine v2.4 — app.js
// Adds a per-card "สร้างภาพ" button. Each card illustrates only itself, so the
// guide still loads fast and image generation is opt-in, one place at a time.
const $=s=>document.querySelector(s);let mode='all',data=null,tab='overview';const city=$('#city'),area=$('#area'),interest=$('#interest'),lang=$('#lang'),content=$('#content');const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));const arr=v=>Array.isArray(v)?v:[];

// --- illustration registry -------------------------------------------------
// ILL holds the subject for each button in the current render; IMG caches
// finished images by place name so switching tabs never regenerates one.
let ILL=[];const IMG={};
const ikey=n=>`${(data&&data.city)||city.value}|${n}`;
function illBtn(subject){
  if(!subject||!subject.name)return'';
  const i=ILL.push(subject)-1;const cached=IMG[ikey(subject.name)];
  return `<div class="ill" data-slot="${i}">${cached
    ? `<img src="${cached}" alt="${esc(subject.name)}"><a class="ill-dl" href="${cached}" download="${esc(subject.name)}.webp">ดาวน์โหลดภาพ</a>`
    : `<button class="ill-btn" data-ill="${i}">🎨 สร้างภาพ</button>`}</div>`;
}

function list(title,icon,items,withIll){return `<div class="card"><h3>${icon} ${title}</h3><ul>${arr(items).map(x=>`<li><b>${esc(x.name||x.title||x)}</b>${x.street?` — ${esc(x.street)}`:''}${x.description?`<br>${esc(x.description)}`:''}${withIll&&x.name?illBtn({name:x.name,description:x.description,street:x.street,category:title}):''}</li>`).join('')}</ul></div>`}
function discoveries(items){return arr(items).map(d=>`<div class="card"><small>${esc(d.category)}</small><h3>${esc(d.name)}</h3><p>${esc(d.description)}</p>${d.area?`<span class="tag">📍 ${esc(d.area)}</span>`:''}${d.street?`<span class="tag">🛣 ${esc(d.street)}</span>`:''}${d.season?`<span class="tag">🍁 ${esc(d.season)}</span>`:''}${d.nearest_station?`<span class="tag">🚇 ${esc(d.nearest_station)}</span>`:''}${d.historical_reference?`<p><b>Historical reference:</b> ${esc(d.historical_reference)}</p>`:''}${d.etiquette?`<p><b>Tip / etiquette:</b> ${esc(d.etiquette)}</p>`:''}${d.pair_with?`<p><b>Pair with:</b> ${esc(d.pair_with)}</p>`:''}${illBtn(d)}</div>`).join('')}

document.querySelectorAll('.mode').forEach(b=>b.onclick=()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode=b.dataset.mode});
document.querySelectorAll('#tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');tab=b.dataset.tab;if(data)render()});

function render(){if(!data)return;ILL=[];let g=data,html='';
if(tab==='overview')html=`<div class="grid"><div class="card wide"><h3>🧭 Overview</h3><p>${esc(g.summary)}</p><span class="tag">🕐 ${esc(g.best_time)}</span><span class="tag">⏱ ${esc(g.duration)}</span><span class="tag">💰 ${esc(g.budget)}</span><span class="tag">🚇 ${esc(g.nearest_station)}</span></div>${list('Best Areas / Streets','📍',g.areas,true)}<div class="card wide"><h3>✨ Auto Discover</h3><div class="grid">${discoveries(g.discoveries)}</div></div>${list('Local Tips','💡',arr(g.tips).map(x=>({name:x})))}</div>`;
if(tab==='stories')html=`<div class="grid">${arr(g.stories).map(s=>`<div class="card story"><small>${esc(s.type)}</small><h3>${esc(s.title)}</h3><p>${esc(s.story)}</p><span class="tag">📍 ${esc(s.area)}</span><span class="tag">✓ ${esc(s.verification)}</span><p><b>Why it matters:</b> ${esc(s.why_it_matters)}</p>${illBtn({name:s.title,story:s.story,type:s.type,area:s.area,verification:s.verification})}</div>`).join('')}</div>`;
if(tab==='attractions')html=`<div class="grid">${list('Attractions','🏛️',g.attractions,true)}${list('Photo / Check-in','📸',g.photo_spots,true)}<div class="card wide"><h3>🍁 Seasonal / Photo / Campus Discoveries</h3><div class="grid">${discoveries(g.discoveries)}</div></div></div>`;
if(tab==='food')html=`<div class="grid">${list('Food & Drink','🍜',g.food,true)}${list('Cafés / Specialties','☕',g.cafes,true)}</div>`;
if(tab==='shopping')html=`<div class="grid">${list('Shopping','🛍️',g.shopping,true)}${list('What to Buy','🎁',g.what_to_buy,true)}</div>`;
if(tab==='route')html=`<div class="card"><h3>🚶 Suggested Route</h3>${arr(g.route).map((r,i)=>`<div class="route"><div class="num">${i+1}</div><div><b>${esc(r.name)}</b> — ${esc(r.area)}<br>${esc(r.note)} <span class="tag">${esc(r.time)}</span></div></div>`).join('')}</div>`;
if(tab==='social')html=`<div class="grid"><div class="card wide"><h3>📱 Facebook / Instagram</h3><pre>${esc(g.social_caption)}</pre></div><div class="card wide"><h3>✂️ Short Caption</h3><pre>${esc(g.short_caption)}</pre></div></div>`;
content.innerHTML=html}

// Read the body as text first, then parse — a non-JSON body (Vercel HTML error
// page) would otherwise surface as Safari's opaque "string did not match" error.
async function callApi(path,payload,timeoutMs=150000){
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeoutMs);
  let r,raw;
  try{
    r=await fetch(path,{method:'POST',signal:ac.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    raw=await r.text();
  }catch(e){
    if(e.name==='AbortError')throw Error(`หมดเวลารอ ${Math.round(timeoutMs/1000)} วินาที`);
    throw Error(`เชื่อมต่อ ${path} ไม่ได้: ${e.message}`);
  }finally{clearTimeout(timer)}
  let j=null;try{j=JSON.parse(raw)}catch{}
  if(j===null){
    if(r.status===404)throw Error(`404 — ไม่พบ ${path} บน Vercel ตรวจว่าไฟล์อยู่ในโฟลเดอร์ api/ และลงท้าย .js`);
    if(r.status===504||r.status===408)throw Error('504 — ทำงานนานเกิน maxDuration ของ Vercel');
    throw Error(`เซิร์ฟเวอร์ตอบกลับไม่ใช่ JSON — HTTP ${r.status}. ${raw.replace(/<[^>]*>/g,' ').trim().slice(0,160)}`);
  }
  if(!r.ok)throw Error((j.error||`HTTP ${r.status}`)+(j.hint?` — ${j.hint}`:''));
  return j;
}

// One delegated handler for every illustrate button in the result panel.
content.addEventListener('click',async e=>{
  const btn=e.target.closest('.ill-btn');if(!btn)return;
  const subject=ILL[Number(btn.dataset.ill)];if(!subject)return;
  const slot=btn.closest('.ill');
  btn.disabled=true;btn.textContent='กำลังวาด… (30–60 วิ)';
  try{
    const j=await callApi('/api/illustrate',{city:(data&&data.city)||city.value.trim(),place:(data&&data.area)||area.value.trim(),subject});
    IMG[ikey(subject.name)]=j.image;
    slot.innerHTML=`<img src="${j.image}" alt="${esc(subject.name)}"><a class="ill-dl" href="${j.image}" download="${esc(subject.name)}.webp">ดาวน์โหลดภาพ</a>`;
  }catch(err){
    slot.innerHTML=`<div class="ill-err">${esc(err.message)}</div><button class="ill-btn" data-ill="${btn.dataset.ill}">ลองใหม่</button>`;
  }
});

$('#go').onclick=async()=>{
  if(!city.value.trim()){
    content.className='';
    content.innerHTML='<div class="card">กรุณาใส่ชื่อเมืองในช่อง <b>Destination</b> ก่อน เช่น Bangkok, Seoul, London</div>';
    city.focus();return;
  }
  $('#go').disabled=true;$('#status').textContent='GENERATING…';content.className='empty';content.textContent='Creating guide… (20–60s)';
  try{
    const j=await callApi('/api/guide',{city:city.value.trim(),area:area.value.trim(),interest:interest.value,mode,lang:lang?lang.value:'th'});
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
