'use strict';
/* TaskRing — to-do list, calendar and alarms. All data stays in localStorage. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const startOfDay = d => { const x = new Date(d); x.setHours(0,0,0,0); return x; };

const store = {
  load(k, fb){ try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch { return fb; } },
  save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

let tasks = store.load('tr.tasks', []);
let alarms = store.load('tr.alarms', []);
let taskFilter = 'all';
let editingId = null;
let calDate = startOfDay(new Date());

/* ---------- shared UI helpers ---------- */
function toast(msg){
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2200);
}
function fmtWhen(iso){
  const d = new Date(iso); const now = new Date();
  const time = d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
  if (d.toDateString() === now.toDateString()) return 'Today ' + time;
  const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
  if (d.toDateString() === tmr.toDateString()) return 'Tomorrow ' + time;
  return d.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + time;
}
function speak(text){
  if (!('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1; speechSynthesis.speak(u); } catch {}
}

/* ---------- tasks ---------- */
function saveTasks(){ store.save('tr.tasks', tasks); }
function addTask(text, priority, due, speakFlag){
  tasks.unshift({ id: uid(), text, priority: priority || 'med', due: due || null, speak: speakFlag !== false, done: false, spoken: false, createdAt: Date.now() });
  saveTasks(); renderTasks(); renderCalendar();
}
function toggleTask(id){ const t = tasks.find(t => t.id === id); if (t){ t.done = !t.done; saveTasks(); renderTasks(); renderAgenda(); } }
function deleteTask(id){ tasks = tasks.filter(t => t.id !== id); if (editingId === id) editingId = null; saveTasks(); renderTasks(); renderAgenda(); }
function startEdit(id){ editingId = id; renderTasks(); const inp = $('#edit-' + id); if (inp){ inp.focus(); inp.select(); } }
function commitEdit(id){
  const inp = $('#edit-' + id); if (!inp) return;
  const t = tasks.find(t => t.id === id);
  if (t && inp.value.trim()) t.text = inp.value.trim();
  editingId = null; saveTasks(); renderTasks(); renderAgenda();
}
function renderTasks(){
  const list = $('#taskList');
  const visible = tasks.filter(t => taskFilter === 'all' || (taskFilter === 'active' ? !t.done : t.done));
  $('#taskEmpty').hidden = visible.length > 0;
  const done = tasks.filter(t => t.done).length;
  const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $('#taskProgress').style.width = pct + '%';
  $('#taskSummary').textContent = tasks.length ? `${done} of ${tasks.length} done · ${tasks.length - done} remaining` : 'Nothing here yet';

  list.innerHTML = visible.map(t => {
    const overdue = t.due && !t.done && new Date(t.due) < new Date();
    const dueHtml = t.due ? `<span class="due ${overdue ? 'overdue' : ''}">${overdue ? 'Overdue · ' : ''}${fmtWhen(t.due)}</span>` : '';
    const voice = t.speak === false ? '' : '<span title="Voice reminder 5 min before">🔊</span>';
    const prio = `<span class="prio p-${t.priority}">${t.priority}</span>`;
    const body = editingId === t.id
      ? `<input id="edit-${t.id}" class="edit-input" value="${esc(t.text)}">`
      : `<span class="task-text ${t.done ? 'done' : ''}">${esc(t.text)}</span>`;
    return `<li class="task ${t.done ? 'is-done' : ''}" data-id="${t.id}">
      <input type="checkbox" class="check" data-act="toggle" ${t.done ? 'checked' : ''} aria-label="Mark done">
      <div class="task-main">${body}<div class="meta">${prio}${dueHtml}${voice}</div></div>
      <div class="row-actions">
        ${editingId === t.id
          ? '<button class="icon-btn" data-act="save" aria-label="Save">✓</button>'
          : '<button class="icon-btn" data-act="edit" aria-label="Edit">✎</button>'}
        <button class="icon-btn danger" data-act="del" aria-label="Delete">✕</button>
      </div>
    </li>`;
  }).join('');
}

$('#taskList').addEventListener('click', e => {
  const li = e.target.closest('li.task'); if (!li) return;
  const id = li.dataset.id;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'toggle') toggleTask(id);
  else if (act === 'del') deleteTask(id);
  else if (act === 'edit') startEdit(id);
  else if (act === 'save') commitEdit(id);
});
$('#taskList').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('.edit-input')){ e.preventDefault(); commitEdit(e.target.id.slice(5)); }
  if (e.key === 'Escape'){ editingId = null; renderTasks(); }
});
$('#taskList').addEventListener('focusout', e => { if (e.target.matches('.edit-input')) commitEdit(e.target.id.slice(5)); });

$('#taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = $('#taskText').value.trim(); if (!text) return;
  const dueVal = $('#taskDue').value;
  addTask(text, $('#taskPriority').value, dueVal ? new Date(dueVal).toISOString() : null, $('#taskSpeak').checked);
  $('#taskText').value = ''; $('#taskDue').value = ''; $('#taskText').focus();
  toast('Task added');
});

$('#taskFilters').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.id === 'clearDone'){ tasks = tasks.filter(t => !t.done); saveTasks(); renderTasks(); renderAgenda(); return; }
  taskFilter = b.dataset.filter;
  $$('#taskFilters .chip').forEach(c => c.classList.toggle('active', c === b));
  renderTasks();
});

/* ---------- alarms ---------- */
let audioCtx = null, alarmOsc = null, alarmGain = null, alarmTimer = null, flashTimer = null, currentAlarm = null;

function ensureAudio(){
  if (!audioCtx){ try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
document.addEventListener('pointerdown', ensureAudio);

function nextOccurrence(iso){ const t = new Date(iso); const now = new Date(); while (t <= now) t.setDate(t.getDate() + 1); return t; }
function saveAlarms(){ store.save('tr.alarms', alarms); }

function addAlarm(label, timeISO, repeat, type){
  const t = new Date(timeISO);
  if (isNaN(t)) return toast('Pick a valid time');
  if (t <= new Date()) return toast('Pick a future time');
  alarms.push({ id: uid(), label: label || 'Alarm', time: t.toISOString(), repeat: !!repeat, type: type || 'general', enabled: true, fired: false, createdAt: Date.now() });
  saveAlarms(); renderAlarms(); renderCalendar();
  toast(`${type === 'meeting' ? 'Meeting' : 'Alarm'} set for ${fmtWhen(t.toISOString())}`);
}

function fireAlarm(a){
  a.fired = true;
  if (a.repeat){ a.time = nextOccurrence(a.time).toISOString(); a.fired = false; }
  else { a.enabled = false; }
  saveAlarms(); renderAlarms(); renderCalendar();
  currentAlarm = a;
  $('#bannerLabel').textContent = a.label;
  $('#alarmBanner').hidden = false;
  startSound(); startFlash();
  speak(a.type === 'meeting' ? `Meeting: ${a.label}` : `Alarm: ${a.label}`);
  if (navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
  if ('Notification' in window && Notification.permission === 'granted'){
    try { new Notification('TaskRing ' + (a.type === 'meeting' ? 'meeting' : 'alarm'), { body: a.label }); } catch {}
  }
}
function stopAlarmUI(){ $('#alarmBanner').hidden = true; stopSound(); stopFlash(); currentAlarm = null; }

let alarmBus = null, noiseBuf = null;
function getNoise(){
  if (!noiseBuf){ const len = audioCtx.sampleRate; noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random()*2-1; }
  return noiseBuf;
}
function kick(t){ const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type='sine'; o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(45, t+0.12); g.gain.setValueAtTime(0.9,t); g.gain.exponentialRampToValueAtTime(0.001, t+0.18); o.connect(g); g.connect(alarmBus); o.start(t); o.stop(t+0.2); }
function snare(t){ const s = audioCtx.createBufferSource(); s.buffer = getNoise(); const f = audioCtx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=1800; f.Q.value=0.8; const g = audioCtx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001, t+0.14); s.connect(f); f.connect(g); g.connect(alarmBus); s.start(t); s.stop(t+0.15); }
function hat(t, open, vol){ const s = audioCtx.createBufferSource(); s.buffer = getNoise(); const f = audioCtx.createBiquadFilter(); f.type='highpass'; f.frequency.value=7000; const g = audioCtx.createGain(); const dur = open ? 0.18 : 0.045; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001, t+dur); s.connect(f); f.connect(g); g.connect(alarmBus); s.start(t); s.stop(t+dur+0.02); }
function startSound(){
  ensureAudio(); if (!audioCtx) return;
  stopSound();
  alarmBus = audioCtx.createGain(); alarmBus.gain.value = 0.9; alarmBus.connect(audioCtx.destination);
  const stepDur = 60/140/4; let step = 0;
  const scheduleStep = () => {
    const t = audioCtx.currentTime + 0.06; const i = step % 16;
    if (i % 4 === 0) kick(t);
    if (i === 4 || i === 12) snare(t);
    if (i % 2 === 0) hat(t, i === 14, i % 4 === 0 ? 0.16 : 0.09);
    step++;
  };
  scheduleStep();
  alarmTimer = setInterval(scheduleStep, stepDur * 1000);
}
function stopSound(){
  if (alarmTimer){ clearInterval(alarmTimer); alarmTimer = null; }
  if (alarmOsc){ try { alarmOsc.stop(); } catch {} alarmOsc = null; }
  if (alarmGain){ try { alarmGain.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.05); } catch {} alarmGain = null; }
  if (alarmBus){ const b = alarmBus; try { b.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.03); setTimeout(() => { try { b.disconnect(); } catch {} }, 400); } catch {} alarmBus = null; }
}
function startFlash(){
  const orig = document.title; let on = true;
  flashTimer = setInterval(() => { document.title = on ? '⏰ Alarm!' : orig; on = !on; }, 700);
}
function stopFlash(){ if (flashTimer){ clearInterval(flashTimer); flashTimer = null; document.title = 'TaskRing — To-do, Calendar & Alarms'; } }

$('#dismissBtn').addEventListener('click', stopAlarmUI);
$('#snoozeBtn').addEventListener('click', () => {
  if (currentAlarm){
    currentAlarm.time = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    currentAlarm.fired = false; currentAlarm.enabled = true;
    saveAlarms(); renderAlarms(); renderCalendar();
  }
  stopAlarmUI(); toast('Snoozed 5 minutes');
});

function tick(){
  const now = new Date();
  alarms.forEach(a => { if (a.enabled && !a.fired && new Date(a.time) <= now) fireAlarm(a); });
  tasks.forEach(t => {
    if (t.speak === false || !t.due || t.done || t.spoken) return;
    const diff = new Date(t.due) - now;
    if (diff <= 5 * 60 * 1000 && diff > 0){
      t.spoken = true; saveTasks();
      speak(`Reminder: in five minutes, ${t.text}`);
      renderTasks();
    }
  });
}
setInterval(tick, 1000);

$('#alarmForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#alarmTime').value; if (!v) return;
  addAlarm($('#alarmLabel').value.trim(), new Date(v).toISOString(), $('#alarmRepeat').checked, $('#alarmType').value);
  $('#alarmLabel').value = ''; $('#alarmRepeat').checked = false;
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
});

$('#alarmList').addEventListener('click', e => {
  const li = e.target.closest('li.alarm'); if (!li) return;
  const id = li.dataset.id;
  const a = alarms.find(x => x.id === id); if (!a) return;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'toggle'){ a.enabled = !a.enabled; a.fired = false; saveAlarms(); renderAlarms(); renderCalendar(); }
  else if (act === 'del'){ alarms = alarms.filter(x => x.id !== id); saveAlarms(); renderAlarms(); renderCalendar(); }
  else if (act === 'test'){ toast('Test alarm in 5 seconds…'); setTimeout(() => fireAlarm({ ...a, id: 'demo', repeat: false, enabled: false }), 5000); }
});

function renderAlarms(){
  const list = $('#alarmList');
  const sorted = [...alarms].sort((x, y) => new Date(x.time) - new Date(y.time));
  $('#alarmEmpty').hidden = sorted.length > 0;
  list.innerHTML = sorted.map(a => {
    const d = new Date(a.time);
    const timeStr = d.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'});
    const dateStr = d.toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'});
    const state = !a.enabled ? 'off' : (a.fired ? 'fired' : 'set');
    const badge = a.type === 'meeting' ? '<span class="badge meeting">Meeting</span>' : '<span class="badge">Alarm</span>';
    return `<li class="alarm ${state}" data-id="${a.id}">
      <div class="alarm-time">${timeStr}<span class="alarm-date">${dateStr}</span></div>
      <div class="alarm-main"><span class="alarm-label">${esc(a.label)}</span>
        <span class="meta">${badge}${a.repeat ? ' · Daily' : ''}${state === 'off' ? ' · off' : ''}${state === 'fired' ? ' · fired' : ''}</span></div>
      <div class="row-actions">
        <button class="icon-btn" data-act="test" title="Test in 5s" aria-label="Test alarm">♪</button>
        <label class="switch"><input type="checkbox" data-act="toggle" ${a.enabled ? 'checked' : ''} aria-label="Enable alarm"><span></span></label>
        <button class="icon-btn danger" data-act="del" aria-label="Delete">✕</button>
      </div>
    </li>`;
  }).join('');
}

/* ---------- calendar ---------- */
function renderMonth(){
  const y = calDate.getFullYear(), m = calDate.getMonth();
  const startDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = startOfDay(new Date());
  let cells = ['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => `<span class="dow">${d}</span>`).join('');
  for (let i = 0; i < startDow; i++) cells += '<span class="day dim blank"></span>';
  for (let d = 1; d <= daysInMonth; d++){
    const date = new Date(y, m, d);
    const key = date.toDateString();
    const hasTask = tasks.some(t => t.due && startOfDay(t.due).toDateString() === key);
    const hasAlarm = alarms.some(a => startOfDay(a.time).toDateString() === key);
    const hasMeeting = alarms.some(a => a.type === 'meeting' && startOfDay(a.time).toDateString() === key);
    const sel = key === calDate.toDateString() ? ' sel' : '';
    const dim = date < today ? ' dim' : '';
    cells += `<button class="day${sel}${dim}" data-day="${d}">${d}<span class="dots">${hasTask ? '<i class="dot t"></i>' : ''}${hasMeeting ? '<i class="dot m"></i>' : ''}${hasAlarm ? '<i class="dot a"></i>' : ''}</span></button>`;
  }
  $('#monthGrid').innerHTML = cells;
  $('#calTitle').textContent = calDate.toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'});
}

function renderAgenda(){
  const key = calDate.toDateString();
  const rows = [];
  tasks.filter(t => t.due && startOfDay(t.due).toDateString() === key)
       .sort((a, b) => new Date(a.due) - new Date(b.due))
       .forEach(t => rows.push({ t: new Date(t.due), html: `<span class="badge">Task</span><span class="cal-text ${t.done ? 'done' : ''}">${esc(t.text)}</span>`, taskId: t.id, done: t.done }));
  alarms.filter(a => startOfDay(a.time).toDateString() === key)
        .sort((a, b) => new Date(a.time) - new Date(b.time))
        .forEach(a => rows.push({ t: new Date(a.time), html: `<span class="badge ${a.type === 'meeting' ? 'meeting' : 'alarm'}">${a.type === 'meeting' ? 'Meeting' : 'Alarm'}</span><span class="cal-text">${esc(a.label)}</span>` }));
  rows.sort((x, y) => x.t - y.t);
  $('#calEmpty').hidden = rows.length > 0;
  $('#calList').innerHTML = rows.map(r => `<li class="cal-item">
      <div class="cal-time">${r.t.toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}</div>
      <div class="cal-main">${r.html}</div>
      ${r.taskId ? `<button class="icon-btn" data-cal-toggle="${r.taskId}" aria-label="Toggle done">${r.done ? '✓' : '○'}</button>` : ''}
    </li>`).join('');
}

function renderCalendar(){ renderMonth(); renderAgenda(); }

$('#calPrev').addEventListener('click', () => { calDate.setDate(calDate.getDate() - 1); renderCalendar(); });
$('#calNext').addEventListener('click', () => { calDate.setDate(calDate.getDate() + 1); renderCalendar(); });
$('#calToday').addEventListener('click', () => { calDate = startOfDay(new Date()); renderCalendar(); });
$('#calPrevMonth').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() - 1); renderCalendar(); });
$('#calNextMonth').addEventListener('click', () => { calDate.setMonth(calDate.getMonth() + 1); renderCalendar(); });
$('#monthGrid').addEventListener('click', e => {
  const b = e.target.closest('button.day'); if (!b || !b.dataset.day) return;
  calDate.setDate(+b.dataset.day); renderCalendar();
});
$('#calList').addEventListener('click', e => {
  const b = e.target.closest('[data-cal-toggle]'); if (!b) return;
  toggleTask(b.dataset.calToggle);
});

/* ---------- nav ---------- */
$$('.tab').forEach(btn => btn.addEventListener('click', () => {
  $$('.tab').forEach(b => { b.classList.toggle('active', b === btn); b.removeAttribute('aria-current'); });
  btn.setAttribute('aria-current', 'page');
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-' + btn.dataset.view).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));

/* ---------- init ---------- */
$('#todayLabel').textContent = new Date().toLocaleDateString([], {weekday:'long', month:'long', day:'numeric'});
(function(){
  const d = new Date(Date.now() + 60 * 1000); d.setSeconds(0, 0);
  const p = n => String(n).padStart(2, '0');
  $('#alarmTime').value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
})();
renderTasks(); renderAlarms(); renderCalendar(); tick();
