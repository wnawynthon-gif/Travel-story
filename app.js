
const $ = s => document.querySelector(s);
const place = $('#place'), theme = $('#theme'), title = $('#resultTitle'), text = $('#resultText'),
cards = $('#storyCards'), copyBtn = $('#copyBtn'), score = $('#score');
let command = '';

const sampleAngles = [
  ['สิ่งที่คนเห็น แต่ไม่รู้ที่มา','หา object / sign / ritual ที่พาเข้าสู่ hidden history'],
  ['Tourist story vs local story','ตรวจว่าภาพจำของนักท่องเที่ยวต่างจากชีวิตคนท้องถิ่นอย่างไร'],
  ['กฎหมายที่สร้างวัฒนธรรม','ค้น law / decree / privilege ที่ยังทิ้งร่องรอยถึงปัจจุบัน'],
  ['กินหรือดื่มประวัติศาสตร์','หา food & drink ที่เชื่อมกับคน เหตุการณ์ และพื้นที่จริง'],
  ['อดีตที่ยังถ่ายรูปได้วันนี้','เลือกเรื่องที่มี physical evidence ให้ตามรอยและถ่ายภาพ']
];

function run(action='SCOUT'){
  const p = place.value.trim();
  if(!p){ place.focus(); return; }
  command = `${action}: ${p}${theme.value !== 'Auto Discover' ? ' / '+theme.value : ''}`;
  localStorage.setItem('tse-last-place', p);
  title.textContent = p;
  score.textContent = action;
  text.textContent = `คำสั่งพร้อมใช้: ${command}`;
  cards.innerHTML = sampleAngles.map((x,i)=>`<div class="card"><strong>${String(i+1).padStart(2,'0')} · ${x[0]}</strong><small>${x[1]}</small></div>`).join('');
  copyBtn.hidden = false;
}
$('#discover').onclick=()=>run('SCOUT');
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>run(b.dataset.action));
copyBtn.onclick=async()=>{ await navigator.clipboard.writeText(command); copyBtn.textContent='Copied ✓'; setTimeout(()=>copyBtn.textContent='Copy TSE Command',1200); };
place.value = localStorage.getItem('tse-last-place') || '';
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
