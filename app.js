'use strict';
/* ============ ATIG İşçi & İş Takip ============ */

/* ---------- Depolama ---------- */
const storage = window.api || {
  // Tarayıcıda test için yedek
  load: async () => JSON.parse(localStorage.getItem('atig') || '{"version":1,"workers":[],"jobs":[],"entries":[]}'),
  save: async (d) => { localStorage.setItem('atig', JSON.stringify(d)); return true; },
  exportData: async (d) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)])); a.download = 'ATIG-yedek.json'; a.click(); return 'ATIG-yedek.json'; },
  importData: async () => null,
  openFolder: async () => {},
  openExternal: async (u) => window.open(u),
  pickPhotos: () => new Promise((res) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true;
    i.onchange = async () => res(await readFilesAsData(i.files)); i.click();
  }),
  addPhotoFiles: async (_j, files) => readFilesAsData(files),
  deletePhoto: async () => true,
  deleteJobPhotos: async () => true
};
function readFilesAsData(files) {
  return Promise.all([...files].filter((f) => f.type.startsWith('image/')).map((f) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r({ file: f.name, name: f.name, data: fr.result }); fr.readAsDataURL(f); })));
}

let DB = { version: 1, workers: [], jobs: [], entries: [] };
let saveTimer = null;
function persist() {
  if (window.TOUR_ACTIVE) return; // asistan tanıtımında örnek veriler kaydedilmez
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => storage.save(DB).catch(() => toast('Kaydedilemedi!', true)), 150);
}
const flushSave = () => { if (saveTimer && !window.TOUR_ACTIVE) { clearTimeout(saveTimer); saveTimer = null; storage.save(DB); } };
window.addEventListener('beforeunload', flushSave); window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });

/* ---------- Yardımcılar ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(+n || 0);
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => ymd(new Date());
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const fmtDate = (s, withDay = true) => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}${withDay ? ', ' + DAYS[d.getDay()] : ''}`; };
const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toLocaleUpperCase('tr-TR');
const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return isNaN(x) ? 0 : x; };
const typeLabel = (t) => (t === 'yarim' ? 'Yarım Gün' : 'Tam Gün');
const sortTr = (a, b) => a.localeCompare(b, 'tr');

const worker = (id) => DB.workers.find((w) => w.id === id);
const job = (id) => DB.jobs.find((j) => j.id === id);
const entriesOf = (fn) => DB.entries.filter(fn);
const sum = (arr) => arr.reduce((s, e) => s + (+e.amount || 0), 0);
function monthRange(offset = 0) { const n = new Date(); const a = new Date(n.getFullYear(), n.getMonth() + offset, 1); const b = new Date(n.getFullYear(), n.getMonth() + offset + 1, 0); return [ymd(a), ymd(b)]; }
function weekRange() { const n = new Date(); const dow = (n.getDay() + 6) % 7; const a = new Date(n); a.setDate(n.getDate() - dow); const b = new Date(a); b.setDate(a.getDate() + 6); return [ymd(a), ymd(b)]; }
function lastAmount(workerId, type) {
  const list = DB.entries.filter((e) => e.workerId === workerId && e.type === type).sort((a, b) => (b.date + b.updatedAt).localeCompare(a.date + a.updatedAt));
  return list[0] ? list[0].amount : '';
}

/* ---------- İkonlar ---------- */
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1"/><path d="M16 4.13a4 4 0 0 1 0 7.75M22 21v-1a6 6 0 0 0-4-5.65"/></svg>',
  brief: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>',
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 13h2M2 10h20M6 6V4h12v2"/></svg>',
  calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h4"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
  cash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v.01M18 14.5v.01"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  debt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 14 0v1"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>',
  select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
};

/* ---------- Ses motoru (dosyasız, Web Audio ile üretilir) ---------- */
const Sound = (() => {
  let ctx = null, master = null;
  const on = () => DB.settings?.sound !== false;
  const vol = () => (DB.settings?.volume ?? 0.7);
  function init() {
    if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = vol();
  }
  function tone(f, t, d, { type = 'sine', g = 0.25, f2 = null, a = 0.005 } = {}) {
    const o = ctx.createOscillator(), v = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(v).connect(master); o.start(t); o.stop(t + d + 0.05);
  }
  let nbuf = null;
  function noise(t, d, { g = 0.2, f = 1000, f2 = null, q = 1, type = 'bandpass', a = 0.01 } = {}) {
    if (!nbuf) { nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const ch = nbuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = nbuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    const v = ctx.createGain(); v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(g, t + a); v.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(fl).connect(v).connect(master); s.start(t); s.stop(t + d + 0.05);
  }
  const S = {
    // Açılış: yükselen rüzgar + keskin vuruş
    intro(t) {
      noise(t, 0.95, { g: 0.32, f: 250, f2: 7000, q: 0.8, a: 0.8 });
      const h = t + 0.82;
      tone(150, h, 0.7, { g: 0.9, f2: 38, a: 0.002 });
      noise(h, 0.18, { g: 0.6, f: 3500, type: 'highpass', a: 0.001 });
      tone(2400, h, 0.35, { type: 'triangle', g: 0.07, f2: 2300, a: 0.001 });
      tone(3600, h + 0.01, 0.6, { g: 0.04, a: 0.001 });
      noise(h + 0.05, 1.4, { g: 0.07, f: 1800, f2: 400, q: 0.5, a: 0.02 });
    },
    success(t) { tone(784, t, 0.16, { type: 'triangle', g: 0.22 }); tone(1175, t + 0.09, 0.32, { type: 'triangle', g: 0.2 }); tone(2350, t + 0.09, 0.25, { g: 0.04 }); },
    error(t) { tone(196, t, 0.14, { type: 'square', g: 0.08 }); tone(155, t + 0.13, 0.24, { type: 'square', g: 0.08 }); },
    warn(t) { tone(520, t, 0.18, { type: 'triangle', g: 0.16, f2: 440 }); },
    del(t) { tone(620, t, 0.28, { type: 'triangle', g: 0.18, f2: 180 }); noise(t, 0.2, { g: 0.05, f: 900, f2: 200 }); },
    open(t) { noise(t, 0.22, { g: 0.07, f: 600, f2: 3200, q: 0.7, a: 0.08 }); },
    close(t) { noise(t, 0.18, { g: 0.05, f: 2800, f2: 500, q: 0.7, a: 0.03 }); },
    nav(t) { tone(1320, t, 0.06, { g: 0.07, a: 0.002 }); tone(660, t, 0.08, { type: 'triangle', g: 0.06, a: 0.002 }); },
    tick(t) { tone(1900, t, 0.04, { g: 0.05, a: 0.001 }); },
    select(t) { tone(980, t, 0.07, { type: 'triangle', g: 0.09, f2: 1300 }); },
    photo(t) { noise(t, 0.05, { g: 0.25, f: 4000, type: 'highpass', a: 0.001 }); noise(t + 0.09, 0.08, { g: 0.18, f: 2500, type: 'highpass', a: 0.001 }); tone(1400, t + 0.12, 0.2, { type: 'triangle', g: 0.08 }); }
  };
  return {
    play(name) { if (!on() || !S[name]) return; try { init(); S[name](ctx.currentTime + 0.01); } catch (e) {} },
    setVolume() { if (master) master.gain.value = vol(); },
    unlock() { try { init(); const b = ctx.createBuffer(1, 1, 22050); const src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0); } catch (e) {} },
    running() { return !!ctx && ctx.state === 'running'; }
  };
})();

/* ---------- Görsel efektler ---------- */
function burst(x, y, n = 18) {
  const root = document.createElement('div'); root.className = 'burst'; root.style.left = x + 'px'; root.style.top = y + 'px';
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'); const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4; const dist = 40 + Math.random() * 50;
    p.style.setProperty('--x', Math.cos(ang) * dist + 'px'); p.style.setProperty('--y', Math.sin(ang) * dist + 'px');
    p.style.background = i % 3 === 0 ? '#fff' : 'var(--red)'; p.style.animationDelay = Math.random() * 60 + 'ms';
    root.appendChild(p);
  }
  document.body.appendChild(root); setTimeout(() => root.remove(), 900);
}
function burstAt(el) { if (!el) return; const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.btn,.dock-item,.chip,.seg button,.typeSeg button,.icon-btn'); if (!b) return;
  const r = b.getBoundingClientRect(); const s = document.createElement('span'); s.className = 'ripple';
  const size = Math.max(r.width, r.height) * 2; s.style.width = s.style.height = size + 'px';
  s.style.left = e.clientX - r.left - size / 2 + 'px'; s.style.top = e.clientY - r.top - size / 2 + 'px';
  b.appendChild(s); setTimeout(() => s.remove(), 650);
});
document.addEventListener('pointermove', (e) => {
  const c = e.target.closest('.card'); if (!c) return; const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', e.clientX - r.left + 'px'); c.style.setProperty('--my', e.clientY - r.top + 'px');
});

/* ---------- Toast ---------- */
function toast(msg, err = false, snd) {
  Sound.play(snd || (err ? 'error' : 'success'));
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.innerHTML = (err ? I.alert : I.ok) + `<span>${esc(msg)}</span><b class="tbar"></b>`;
  $('#toastRoot').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 2600);
}

/* ---------- Modal ---------- */
function modal({ title, sub = '', body, foot, wide = false, onMount }) {
  const root = $('#modalRoot');
  const bd = document.createElement('div');
  bd.className = 'backdrop';
  bd.innerHTML = `<div class="modal ${wide ? 'wide' : ''}"><div class="m-head"><div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div><button class="icon-btn" data-x>${I.close}</button></div><div class="m-body">${body}</div>${foot ? `<div class="m-foot">${foot}</div>` : ''}</div>`;
  root.appendChild(bd); Sound.play('open');
  const close = (silent) => { if (silent !== true) Sound.play('close'); bd.classList.add('closing'); setTimeout(() => bd.remove(), 240); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' && root.lastElementChild === bd) close(); };
  document.addEventListener('keydown', onKey);
  bd.addEventListener('mousedown', (e) => { if (e.target === bd) close(); });
  $('[data-x]', bd).onclick = close;
  const m = $('.modal', bd);
  if (onMount) onMount(m, close);
  if (!wide) setTimeout(() => { const f = $('input:not([type=hidden]):not([type=date]),textarea', m); if (f) f.focus(); }, 60);
  return { el: m, close };
}
function confirmBox(title, text, okText = 'Sil') {
  return new Promise((res) => {
    setTimeout(() => Sound.play('warn'), 30);
    modal({
      title, body: `<p style="color:var(--tx2);line-height:1.6">${text}</p>`,
      foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn red" data-ok>${okText}</button>`,
      onMount: (m, close) => { $('[data-c]', m).onclick = () => { close(); res(false); }; $('[data-ok]', m).onclick = () => { close(true); res(true); }; }
    });
  });
}
function shakeErr(el) { el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); el.focus(); Sound.play('error'); }
function req(m, sel) { const el = $(sel, m); if (!el.value.trim()) { Sound.play('error'); el.classList.remove('err'); void el.offsetWidth; el.classList.add('err'); el.focus(); return null; } el.classList.remove('err'); return el.value.trim(); }

/* ---------- Sayı animasyonu ---------- */
function countUp(root = document) {
  $$('[data-count]', root).forEach((el) => {
    const target = +el.dataset.count; const isMoney = el.dataset.money === '1'; const dur = 900; const t0 = performance.now();
    const from = el.dataset.key && ui.prev[el.dataset.key] != null ? ui.prev[el.dataset.key] : 0; if (el.dataset.key) ui.prev[el.dataset.key] = target;
    if (from === target && el.dataset.key && !root.__anim) { el.textContent = isMoney ? money(target) : target.toLocaleString('tr-TR'); return; }
    const step = (t) => { const p = Math.min(1, (t - t0) / dur); const v = from + (target - from) * (1 - Math.pow(1 - p, 3)); const val = p === 1 ? target : Math.round(v); el.textContent = el.dataset.cur ? moneyC(val, el.dataset.cur) : isMoney ? money(val) : val.toLocaleString('tr-TR'); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---------- Router ---------- */
const NAV = [
  { k: 'home', label: 'Ana Sayfa', icon: I.home },
  { k: 'workers', label: 'İşçiler', icon: I.users },
  { k: 'jobs', label: "İş'ler", icon: I.brief },
  { k: 'plus' },
  { k: 'advances', label: 'Avans', icon: I.cash },
  { k: 'debts', label: 'Borçlar', icon: I.debt },
  { k: 'settings', label: 'Ayarlar', icon: I.gear },
  { k: 'assistant', label: 'Asistan', icon: '<div class="orb-mini"><i></i></div>' }
];
let route = { name: 'home', id: null };
const ui = { prev: {}, wSearch: '', jSearch: '', jFilter: 'all', cal: {}, calc: {} };

function buildDock() {
  const d = $('#dock');
  NAV.forEach((n) => {
    if (n.k === 'plus') {
      const b = document.createElement('button');
      b.className = 'dock-item plus'; b.title = 'Yevmiye Gir';
      b.innerHTML = `<div class="pbtn">${I.plus}</div>`;
      b.onclick = () => { burstAt(b); openBulkModal({ jobId: route.name === 'job' ? route.id : null }); };
      d.appendChild(b); return;
    }
    const b = document.createElement('button');
    b.className = 'dock-item'; b.dataset.k = n.k;
    b.innerHTML = `${n.icon}<span>${n.label}</span>`;
    if (n.k === 'assistant') b.classList.add('assist');
    b.onclick = () => { if (n.k === 'assistant') { Assistant.openMenu(); return; } Sound.play('nav'); go(n.k); };
    d.appendChild(b);
  });
}
function moveIndicator() {
  const parent = { worker: 'workers', job: 'jobs', person: 'debts' }[route.name] || route.name;
  $$('.dock-item').forEach((b) => b.classList.toggle('active', b.dataset.k === parent));
  const act = $(`.dock-item[data-k="${parent}"]`);
  const ind = $('#dockIndicator');
  if (act) { ind.style.opacity = 1; ind.style.width = act.offsetWidth + 'px'; ind.style.transform = `translateX(${act.offsetLeft - 8}px)`; }
}
function go(name, id = null) {
  const v = $('#view');
  const same = route.name === name && route.id === id;
  route = { name, id };
  moveIndicator();
  if (same) { render(false); return; }
  v.classList.remove('enter'); v.classList.add('leave');
  setTimeout(() => { v.classList.remove('leave'); render(true); v.scrollTop = 0; }, 170);
}
function render(anim = false) {
  const v = $('#view');
  const fn = { home: renderHome, workers: renderWorkers, worker: renderWorker, jobs: renderJobs, job: renderJob, settings: renderSettings, debts: renderDebts, person: renderPerson, advances: renderAdvances }[route.name];
  if (route.name === 'person' && !person(route.id)) { route = { name: 'debts', id: null }; return render(anim); }
  if (route.name === 'worker' && !worker(route.id)) { route = { name: 'workers', id: null }; return render(anim); }
  if (route.name === 'job' && !job(route.id)) { route = { name: 'jobs', id: null }; return render(anim); }
  v.innerHTML = `<div class="wrap">${fn()}</div>`;
  bindView(v);
  if (anim) { v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); countUp(v); }
  else $$('.stagger', v).forEach((s) => s.classList.remove('stagger'));
  if (!anim) {
    $$('[data-count]:not([data-key])', v).forEach((el) => { el.textContent = el.dataset.cur ? moneyC(el.dataset.count, el.dataset.cur) : el.dataset.money === '1' ? money(el.dataset.count) : (+el.dataset.count).toLocaleString('tr-TR'); });
    countUp({ querySelectorAll: (q) => v.querySelectorAll(q + '[data-key]') });
  }
  moveIndicator();
}
const refresh = () => render(false);

/* ---------- Ana Sayfa ---------- */
function renderHome() {
  const t = today(); const [ms, me] = monthRange(0);
  const monthEntries = entriesOf((e) => e.date >= ms && e.date <= me);
  const todayEntries = entriesOf((e) => e.date === t);
  const activeJobs = DB.jobs.filter((j) => j.status !== 'done');
  const h = new Date().getHours();
  const greet = h < 6 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'İyi günler' : 'İyi akşamlar';
  const recent = [...DB.entries].sort((a, b) => (b.date + (b.updatedAt || '')).localeCompare(a.date + (a.updatedAt || ''))).slice(0, 8);
  const todayWorkers = [...new Set(todayEntries.map(pKey))];
  return `
  <div class="stagger">
    <div class="card hero" style="--i:0"><div><h1>${greet}</h1><p>${fmtDate(t)}</p></div><img src="assets/logo.png" alt="" /><button class="icon-btn m-only hero-gear" data-go="settings" title="Ayarlar">${I.gear}</button></div>
    ${reminderCard()}
    <div class="grid stats">
      <div class="card stat" style="--i:1"><div class="lbl">${I.users} Toplam İşçi</div><div class="val tnum" data-count="${DB.workers.length}">0</div><div class="sub">kayıtlı işçi</div></div>
      <div class="card stat" style="--i:2"><div class="lbl">${I.brief} Devam Eden İş</div><div class="val tnum" data-count="${activeJobs.length}">0</div><div class="sub">toplam ${DB.jobs.length} iş</div></div>
      <div class="card stat" style="--i:3"><div class="lbl">${I.cal} Bugün Çalışan</div><div class="val tnum" data-count="${todayWorkers.length}">0</div><div class="sub">${todayEntries.length} kayıt</div></div>
      <div class="card stat accent" style="--i:4"><div class="lbl">${I.wallet} ${MONTHS[new Date().getMonth()]} Yevmiye Toplamı</div><div class="val tnum" data-count="${sum(monthEntries)}" data-money="1">0</div><div class="sub">${monthEntries.length} çalışma kaydı</div></div>
    </div>
    <div class="home-grid">
      <div class="card" style="--i:5">
        <h2 class="sec">Bugün Çalışanlar <small>${fmtDate(t, false)}</small><span style="margin-left:auto"></span><button class="btn sm primary" data-act="bulk-today">${I.plus} Bugünün Yevmiyesini Gir</button></h2>
        ${todayEntries.length ? `<div class="list scroll">${todayEntries.map((e) => entryRow(e, true)).join('')}</div>` : `<div class="empty" style="padding:40px 10px"><p>Bugün için henüz kayıt girilmedi.</p></div>`}
      </div>
      <div class="card" style="--i:6">
        <h2 class="sec">Son Kayıtlar</h2>
        ${recent.length ? `<div class="list scroll">${recent.map((e) => entryRow(e, true, true)).join('')}</div>` : `<div class="empty" style="padding:40px 10px"><p>Henüz çalışma kaydı yok.</p></div>`}
      </div>
    </div>
  </div>`;
}
function entryRow(e, showWorker = false, showDate = false) {
  const w = worker(e.workerId); const j = job(e.jobId);
  return `<div class="li">
    ${showWorker ? `<div class="avatar" style="width:36px;height:36px;border-radius:11px;font-size:12px">${esc(initials(pName(e)))}</div>` : ''}
    <div class="grow"><div class="t1">${showWorker ? esc(pName(e)) + extTag(e) : esc(placeName(e))}</div>
    <div class="t2">${showWorker ? esc(placeName(e)) : ''}${showDate ? ' · ' + fmtDate(e.date, false) : ''}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
    <span class="pill ${e.type === 'yarim' ? 'half' : 'full'}">${typeLabel(e.type)}</span>
    <div class="amt tnum" style="min-width:90px;text-align:right">${money(e.amount)}</div>
  </div>`;
}

/* ---------- İşçiler ---------- */
function renderWorkers() {
  const q = ui.wSearch.toLocaleLowerCase('tr-TR');
  const list = DB.workers.filter((w) => w.name.toLocaleLowerCase('tr-TR').includes(q)).sort((a, b) => sortTr(a.name, b.name));
  const [ms, me] = monthRange(0);
  const last14 = []; for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); last14.push(ymd(d)); }
  return `
  <div class="page-head"><div><h1>İşçiler</h1><p>${DB.workers.length} kayıtlı işçi · Bir işçiye tıklayınca takvimi açılır</p></div>
  <button class="btn primary" data-act="add-worker">${I.plus} Yeni İşçi</button></div>
  ${DB.workers.length ? `<div class="toolbar"><div class="search">${I.search}<input id="wSearch" placeholder="İşçi ara..." value="${esc(ui.wSearch)}" /></div></div>` : ''}
  ${!DB.workers.length ? emptyState(I.users, 'Henüz işçi eklenmedi', 'İlk işçiyi ekleyerek başlayın.', '<button class="btn primary" data-act="add-worker">' + I.plus + ' İşçi Ekle</button>')
    : !list.length ? `<div class="empty"><p>“${esc(ui.wSearch)}” ile eşleşen işçi yok.</p></div>`
    : `<div class="grid workers-grid stagger">${list.map((w, i) => {
      const me_ = entriesOf((e) => e.workerId === w.id && e.date >= ms && e.date <= me);
      const days = new Set(me_.map((e) => e.date)).size;
      const dots = last14.map((d) => { const es = DB.entries.filter((e) => e.workerId === w.id && e.date === d); return `<i class="${es.some((e) => e.type === 'tam') ? 'f' : es.length ? 'h' : ''}" title="${fmtDate(d, false)}"></i>`; }).join('');
      return `<div class="card wcard" style="--i:${Math.min(i, 14)}" data-worker="${w.id}">
        <div class="wtop"><div class="avatar">${esc(initials(w.name))}</div><div style="min-width:0"><div class="wname">${esc(w.name)}</div><div class="wmeta">${esc(w.phone || 'Telefon yok')}</div></div></div>
        <div><div class="wmeta" style="margin-bottom:7px">Son 14 gün</div><div class="dots">${dots}</div></div>
        <div class="wfoot"><div><span>Bu ay çalıştığı gün</span><b class="tnum">${days} gün</b></div><div style="text-align:right"><span>Bu ay kazanç</span><b class="tnum">${money(sum(me_))}</b></div></div>
      </div>`; }).join('')}</div>`}`;
}
function emptyState(icon, title, text, btn = '') {
  return `<div class="empty"><div class="eicon">${icon}</div><h3>${title}</h3><p>${text}</p>${btn}</div>`;
}
function openWorkerModal(id = null) {
  const w = id ? worker(id) : null;
  modal({
    title: w ? 'İşçiyi Düzenle' : 'Yeni İşçi',
    body: `<div class="field"><label>Ad Soyad <em>*</em></label><input class="inp" id="fName" value="${esc(w?.name || '')}" placeholder="Örn. Ahmet Yılmaz" /></div>
      <div class="field"><label>Telefon</label><input class="inp" id="fPhone" value="${esc(w?.phone || '')}" placeholder="05xx xxx xx xx" /></div>
      <div class="field"><label>Not</label><textarea class="inp" id="fNote" placeholder="Usta, kalfa, IBAN vb.">${esc(w?.note || '')}</textarea></div>`,
    foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn primary" data-ok>${w ? 'Kaydet' : 'İşçiyi Ekle'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      const save = () => {
        const name = req(m, '#fName'); if (!name) return;
        const dup = DB.workers.find((x) => x.id !== id && x.name.toLocaleLowerCase('tr-TR') === name.toLocaleLowerCase('tr-TR'));
        if (dup) { toast('Bu isimde bir işçi zaten var', true); return; }
        const data = { name, phone: $('#fPhone', m).value.trim(), note: $('#fNote', m).value.trim() };
        if (w) Object.assign(w, data); else DB.workers.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
        persist(); close(true); toast(w ? 'İşçi güncellendi' : 'İşçi eklendi'); refresh();
      };
      $('[data-ok]', m).onclick = save;
      $('#fName', m).onkeydown = (e) => { if (e.key === 'Enter') save(); };
    }
  });
}

/* ---------- Takvim ---------- */
function calendarHTML(key, dayFn, selSet = null) {
  const st = ui.cal[key] || (ui.cal[key] = { y: new Date().getFullYear(), m: new Date().getMonth(), dir: '' });
  const first = new Date(st.y, st.m, 1); const startDow = (first.getDay() + 6) % 7; const daysIn = new Date(st.y, st.m + 1, 0).getDate();
  const t = today(); let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="day out"></div>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${st.y}-${pad(st.m + 1)}-${pad(d)}`; const info = dayFn(ds) || {};
    cells += `<button style="--d:${d + startDow}" class="day ${info.cls || ''} ${ds === t ? 'today' : ''} ${selSet && selSet.has(ds) ? 'sel' : ''}" data-day="${ds}" title="${esc(info.title || fmtDate(ds))}">
      <span class="n">${d}</span>${info.tag ? `<span class="t">${info.tag}</span>` : ''}<span class="a tnum">${info.label || ''}</span></button>`;
  }
  const rem = (7 - ((startDow + daysIn) % 7)) % 7; for (let i = 0; i < rem; i++) cells += '<div class="day out"></div>';
  const dir = st.dir; st.dir = '';
  return `<div class="cal-head"><div class="cal-title">${MONTHS[st.m]} ${st.y}</div>
    <div class="cal-nav"><button class="btn sm ghost" data-cal="${key}" data-mv="0">Bugün</button><button class="icon-btn" data-cal="${key}" data-mv="-1">${I.left}</button><button class="icon-btn" data-cal="${key}" data-mv="1">${I.right}</button></div></div>
    <div class="cal-week">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((x) => `<div>${x}</div>`).join('')}</div>
    <div class="cal-grid ${dir}">${cells}</div>`;
}
function shiftCal(key, mv) {
  const st = ui.cal[key];
  if (mv === 0) { const n = new Date(); st.dir = (n.getFullYear() * 12 + n.getMonth()) >= (st.y * 12 + st.m) ? 'slide-l' : 'slide-r'; st.y = n.getFullYear(); st.m = n.getMonth(); }
  else { const d = new Date(st.y, st.m + mv, 1); st.y = d.getFullYear(); st.m = d.getMonth(); st.dir = mv > 0 ? 'slide-l' : 'slide-r'; }
  refresh();
}

/* ---------- İşçi Detayı ---------- */
function calcState(wid) {
  return ui.calc[wid] || (ui.calc[wid] = { mode: 'range', from: monthRange(0)[0], to: monthRange(0)[1], preset: 'thisMonth', sel: new Set() });
}
function renderWorker() {
  const w = worker(route.id); const cs = calcState(w.id);
  const mine = entriesOf((e) => e.workerId === w.id);
  const byDate = {}; mine.forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
  const dayFn = (ds) => {
    const es = byDate[ds]; if (!es) return null;
    const full = es.some((e) => e.type === 'tam');
    return { cls: full ? 'full' : 'half', tag: es.length > 1 ? es.length + ' iş' : (full ? 'TAM' : 'YARIM'), label: money(sum(es)), title: es.map((e) => `${placeName(e)} · ${typeLabel(e.type)} · ${money(e.amount)}`).join('\n') };
  };
  // Hesap
  let picked;
  if (cs.mode === 'range') picked = mine.filter((e) => (!cs.from || e.date >= cs.from) && (!cs.to || e.date <= cs.to));
  else picked = mine.filter((e) => cs.sel.has(e.date));
  picked.sort((a, b) => a.date.localeCompare(b.date));
  const fullN = picked.filter((e) => e.type === 'tam').length; const halfN = picked.filter((e) => e.type === 'yarim').length;
  const presets = [['thisWeek', 'Bu Hafta'], ['thisMonth', 'Bu Ay'], ['lastMonth', 'Geçen Ay'], ['all', 'Tümü']];
  const totalAll = sum(mine);
  return `
  <button class="crumb" data-go="workers">${I.back} İşçiler</button>
  <div class="page-head" style="margin-top:4px">
    <div class="whead"><div class="avatar lg">${esc(initials(w.name))}</div><div><h1>${esc(w.name)}</h1><p>${esc(w.phone || 'Telefon yok')}${w.note ? ' · ' + esc(w.note) : ''}</p></div></div>
    <div class="head-acts"><button class="btn amber" data-act="adv-worker">${I.cash} Avans Ver</button><button class="btn" data-act="edit-worker">${I.edit} Düzenle</button><button class="btn danger" data-act="del-worker">${I.trash} Sil</button></div>
  </div>
  <div class="detail stagger">
    <div class="card ${cs.mode === 'pick' ? 'selecting' : ''}" style="--i:0">
      ${cs.mode === 'pick' ? `<div class="pill full" style="margin-bottom:14px;height:30px;padding:0 12px">${I.select.replace('<svg', '<svg width="14" height="14"')} Gün seçme modu: Hesaba katmak istediğiniz günlere tıklayın</div>` : ''}
      ${calendarHTML('w_' + w.id, dayFn, cs.mode === 'pick' ? cs.sel : null)}
      <div class="cal-legend"><span><i style="background:var(--red)"></i>Tam gün</span><span><i style="background:linear-gradient(135deg,var(--red) 50%,#2a1214 50%)"></i>Yarım gün</span><span><i style="border:1.5px solid #fff"></i>Bugün</span><span class="kbd" style="margin-left:auto">${cs.mode === 'pick' ? 'Tekrar tıklayarak seçimi kaldırabilirsiniz' : 'Kayıt eklemek / düzenlemek için bir güne tıklayın'}</span></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:18px">
      <div class="card calc" style="--i:1">
        <h2 class="sec">${I.calc.replace('<svg', '<svg width="18" height="18"')} Maaş Hesapla <span style="margin-left:auto"></span><div class="seg"><button class="${cs.mode === 'range' ? 'on' : ''}" data-mode="range">Tarih Aralığı</button><button class="${cs.mode === 'pick' ? 'on' : ''}" data-mode="pick">Gün Seç</button></div></h2>
        ${cs.mode === 'range' ? `
          <div class="chips">${presets.map(([k, l]) => `<button class="chip ${cs.preset === k ? 'on' : ''}" data-preset="${k}">${l}</button>`).join('')}</div>
          <div class="row"><div class="field" style="margin:0"><label>Başlangıç</label><input type="date" class="inp" id="cFrom" value="${cs.from}" /></div><div class="field" style="margin:0"><label>Bitiş</label><input type="date" class="inp" id="cTo" value="${cs.to}" /></div></div>`
        : `<div class="chips"><span class="kbd" style="align-self:center">${cs.sel.size} gün seçildi</span><span style="flex:1"></span><button class="chip" data-act="sel-month">Bu ayın çalıştığı günleri seç</button><button class="chip" data-act="sel-clear">Temizle</button></div>`}
        <div class="result">
          <div class="lbl">${cs.mode === 'range' ? (cs.from || cs.to ? `${cs.from ? fmtDate(cs.from, false) : 'Başlangıç'} – ${cs.to ? fmtDate(cs.to, false) : 'Bugün'}` : 'Tüm zamanlar') : 'Seçilen günler'} toplamı</div>
          <div class="big tnum" data-key="calc_${w.id}" data-count="${sum(picked)}" data-money="1">${money(sum(picked))}</div>
          <div class="rs"><div><span>Tam gün</span><b class="tnum">${fullN}</b></div><div><span>Yarım gün</span><b class="tnum">${halfN}</b></div><div><span>Toplam</span><b class="tnum">${(fullN + halfN * 0.5).toLocaleString('tr-TR')} gün</b></div></div>
          ${advCalcBlock(w.id, cs, sum(picked))}
        </div>
      </div>
      <div class="card" style="--i:2">
        <h2 class="sec">Hesaba Giren Günler <small>${picked.length} kayıt</small><span style="margin-left:auto" class="kbd">Genel toplam: ${money(totalAll)}</span></h2>
        ${picked.length ? `<div class="list scroll">${picked.map((e) => `<div class="li"><div class="grow"><div class="t1">${fmtDate(e.date)}</div><div class="t2">${esc(placeName(e))}${e.note ? ' · ' + esc(e.note) : ''}</div></div><span class="pill ${e.type === 'yarim' ? 'half' : 'full'}">${typeLabel(e.type)}</span><div class="amt tnum" style="min-width:86px;text-align:right">${money(e.amount)}</div></div>`).join('')}</div>` : '<p class="kbd" style="padding:10px 0">Bu seçimde çalışma kaydı yok.</p>'}
      </div>
      ${workerAdvCard(w.id)}
    </div>
  </div>`;
}
function applyPreset(cs, k) {
  cs.preset = k;
  if (k === 'thisWeek') [cs.from, cs.to] = weekRange();
  else if (k === 'thisMonth') [cs.from, cs.to] = monthRange(0);
  else if (k === 'lastMonth') [cs.from, cs.to] = monthRange(-1);
  else { cs.from = ''; cs.to = ''; }
}

/* ---------- Çalışılan yer (iş) yardımcıları ---------- */
const norm = (x) => String(x || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
const pKey = (e) => e.workerId || 'x:' + norm(e.extName);
const pName = (e) => (e.workerId ? worker(e.workerId)?.name || 'Silinmiş işçi' : e.extName || 'İsimsiz');
const extTag = (e) => (e.workerId ? '' : '<span class="xtag">Dışarıdan</span>');
const placeName = (e) => job(e.jobId)?.title || (e.jobId ? 'Silinmiş iş' : 'Yer belirtilmedi');
const findJobByName = (name) => DB.jobs.find((j) => norm(j.title) === norm(name));
function placeDatalist() {
  return `<datalist id="placeList">${[...DB.jobs].sort((a, b) => (a.status === 'done') - (b.status === 'done') || sortTr(a.title, b.title)).map((j) => `<option value="${esc(j.title)}">${j.status === 'done' ? 'Tamamlandı' : esc(j.location || '')}</option>`).join('')}</datalist>`;
}
// Yazılan yer İş'ler'de yoksa otomatik oluşturur
function resolveJob(name) {
  const t = String(name || '').trim().replace(/\s+/g, ' ');
  if (!t) return { id: null, created: false };
  const ex = findJobByName(t); if (ex) return { id: ex.id, created: false };
  const j = { id: uid(), createdAt: new Date().toISOString(), title: t, location: t, client: '', materialCost: 0, laborCost: 0, startDate: today(), status: 'on', note: '', photos: [], autoCreated: true };
  DB.jobs.push(j); return { id: j.id, created: true, title: t };
}
function lastPlace(workerId) {
  const l = DB.entries.filter((e) => e.workerId === workerId && e.jobId && job(e.jobId)).sort((a, b) => (b.date + (b.updatedAt || '')).localeCompare(a.date + (a.updatedAt || '')))[0];
  return l ? job(l.jobId).title : '';
}
function placeField(id, value) {
  return `<div class="field"><label>Çalıştığı yer</label><div class="place-inp">${I.pin}<input class="inp" id="${id}" list="placeList" autocomplete="off" value="${esc(value)}" placeholder="Örn. Kadıköy Bina Dış Cephe" /></div>${placeDatalist()}<p class="hint place-hint" id="${id}Hint" style="margin:6px 0 0"></p></div>`;
}
function bindPlaceHint(m, id) {
  const inp = $('#' + id, m), h = $('#' + id + 'Hint', m);
  const upd = () => {
    const v = inp.value.trim();
    if (!v) { h.innerHTML = 'Boş bırakabilirsiniz.'; h.className = 'hint place-hint'; return; }
    if (findJobByName(v)) { h.innerHTML = `${I.ok.replace('<svg', '<svg width="13" height="13"')} İş'ler'de kayıtlı`; h.className = 'hint place-hint ok'; }
    else { h.innerHTML = `${I.plus.replace('<svg', '<svg width="13" height="13"')} Yeni yer: kaydedince İş'ler'e otomatik eklenecek`; h.className = 'hint place-hint new'; }
  };
  inp.addEventListener('input', upd); upd();
}

/* ---------- Gün kaydı modalı (tek işçi) ---------- */
function openDayModal(workerId, date, editId = null) {
  const w = worker(workerId);
  const dayEntries = () => DB.entries.filter((e) => e.workerId === workerId && e.date === date);
  let editing = editId ? DB.entries.find((e) => e.id === editId) : null;
  let type = editing?.type || 'tam';
  const listHTML = () => {
    const es = dayEntries(); if (!es.length) return '';
    return `<div class="day-entries"><div class="field" style="margin-bottom:8px"><label>Bu günün kayıtları</label></div>${es.map((e) => `<div class="day-entry"><div class="grow"><div style="font-weight:500">${esc(placeName(e))}</div><div class="kbd">${typeLabel(e.type)}${e.note ? ' · ' + esc(e.note) : ''}</div></div><b class="tnum">${money(e.amount)}</b><button class="icon-btn" data-ed="${e.id}" title="Düzenle">${I.edit}</button><button class="icon-btn danger" data-del="${e.id}" title="Sil">${I.trash}</button></div>`).join('')}</div><div class="divider"></div>`;
  };
  const hasDay = dayEntries().length > 0;
  const defPlace = editing ? (job(editing.jobId)?.title || '') : (hasDay ? '' : lastPlace(workerId));
  modal({
    title: esc(w.name), sub: fmtDate(date),
    body: `<div id="dList">${listHTML()}</div>
      <div class="field"><label id="fTitle" style="color:#fff;font-size:13.5px">${editing ? 'Kaydı düzenle' : hasDay ? 'Aynı güne başka bir yer ekle' : 'Çalışma kaydı'}</label></div>
      <div class="field"><label>Ne kadar çalıştı?</label><div class="typeSeg"><button data-t="tam" class="${type === 'tam' ? 'on' : ''}"><i></i>Tam Gün</button><button data-t="yarim" class="h ${type === 'yarim' ? 'on' : ''}"><i></i>Yarım Gün</button></div></div>
      <div class="field"><label>O günkü ücreti <em>*</em></label><div class="money-inp"><input class="inp tnum" id="fAmt" type="number" min="0" step="any" placeholder="0" value="${editing ? editing.amount : lastAmount(workerId, type)}" /><span>₺</span></div></div>
      ${placeField('fPlace', defPlace)}
      <div class="field"><label>Not</label><input class="inp" id="fNote" value="${esc(editing?.note || '')}" placeholder="İsteğe bağlı" /></div>`,
    foot: `<button class="btn ghost" data-c>Kapat</button><button class="btn red" data-ok>${editing ? 'Güncelle' : 'Kaydet'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      bindPlaceHint(m, 'fPlace');
      let amtTouched = !!editing;
      $('#fAmt', m).oninput = () => (amtTouched = true);
      $$('.typeSeg button', m).forEach((b) => (b.onclick = () => { Sound.play('select'); type = b.dataset.t; $$('.typeSeg button', m).forEach((x) => x.classList.toggle('on', x === b)); if (!amtTouched) $('#fAmt', m).value = lastAmount(workerId, type); }));
      const resetForm = () => { editing = null; amtTouched = false; $('#fTitle', m).textContent = 'Çalışma kaydı'; $('[data-ok]', m).textContent = 'Kaydet'; $('#fNote', m).value = ''; $('#fAmt', m).value = lastAmount(workerId, type); };
      const bindList = () => {
        $$('[data-del]', m).forEach((b) => (b.onclick = () => { const row = b.closest('.day-entry'); row.classList.add('removing'); setTimeout(() => { DB.entries = DB.entries.filter((e) => e.id !== b.dataset.del); if (editing?.id === b.dataset.del) resetForm(); persist(); $('#dList', m).innerHTML = listHTML(); bindList(); refresh(); toast('Kayıt silindi', false, 'del'); }, 260); }));
        $$('[data-ed]', m).forEach((b) => (b.onclick = () => { Sound.play('tick'); editing = DB.entries.find((e) => e.id === b.dataset.ed); type = editing.type; $('#fPlace', m).value = job(editing.jobId)?.title || ''; $('#fPlace', m).dispatchEvent(new Event('input')); $('#fAmt', m).value = editing.amount; $('#fNote', m).value = editing.note || ''; amtTouched = true; $$('.typeSeg button', m).forEach((x) => x.classList.toggle('on', x.dataset.t === type)); $('#fTitle', m).textContent = 'Kaydı düzenle'; $('[data-ok]', m).textContent = 'Güncelle'; }));
      };
      bindList();
      const save = () => {
        const amtEl = $('#fAmt', m); if (amtEl.value === '' || num(amtEl.value) < 0) { shakeErr(amtEl); return; }
        const r = resolveJob($('#fPlace', m).value); const jobId = r.id;
        const amount = num(amtEl.value); const note = $('#fNote', m).value.trim(); const now = new Date().toISOString();
        const clash = DB.entries.find((e) => e.workerId === workerId && e.date === date && (e.jobId || null) === jobId && e.id !== editing?.id);
        const was = !!(editing || clash);
        if (clash) { Object.assign(clash, { type, amount, note, updatedAt: now }); if (editing) DB.entries = DB.entries.filter((e) => e.id !== editing.id); }
        else if (editing) Object.assign(editing, { jobId, type, amount, note, updatedAt: now });
        else DB.entries.push({ id: uid(), workerId, jobId, date, type, amount, note, createdAt: now, updatedAt: now });
        persist(); close(true); refresh();
        toast(was ? 'Kayıt güncellendi' : 'Çalışma günü kaydedildi');
        if (r.created) setTimeout(() => toast(`“${r.title}” İş'ler'e eklendi`, false, 'tick'), 450);
        const cell = $(`.day[data-day="${date}"]`); if (cell) { cell.classList.add('pop'); burstAt(cell); }
      };
      $('[data-ok]', m).onclick = save;
      $('#fAmt', m).onkeydown = (e) => { if (e.key === 'Enter') save(); };
    }
  });
}

/* ---------- Toplu yevmiye (yer + gün) ---------- */
function openBulkModal({ jobId = null, date = null } = {}) {
  date = date || today();
  let place = jobId ? (job(jobId)?.title || '') : '';
  const rowsState = {};
  const curJobId = () => findJobByName(place)?.id || null;
  let loadedKey = '';
  let ext = [];
  const extNames = () => [...new Set(DB.entries.filter((e) => !e.workerId && e.extName).map((e) => e.extName))].sort(sortTr);
  const lastExtAmount = (name, type) => { const l = DB.entries.filter((e) => !e.workerId && norm(e.extName) === norm(name) && e.type === type).sort((a, b) => (b.date + (b.updatedAt || '')).localeCompare(a.date + (a.updatedAt || '')))[0]; return l ? l.amount : ''; };
  const load = () => {
    const jid = curJobId(); loadedKey = (jid || '') + '|' + date;
    const ex = jid ? DB.entries.filter((x) => !x.workerId && x.jobId === jid && x.date === date) : [];
    if (ex.length) ext = ex.map((x) => ({ name: x.extName, type: x.type, amount: x.amount, db: true }));
    else ext = ext.filter((x) => !x.db);
    DB.workers.forEach((w) => {
      const e = DB.entries.find((x) => x.workerId === w.id && (x.jobId || null) === jid && x.date === date);
      const cur = rowsState[w.id];
      if (e) rowsState[w.id] = { on: true, type: e.type, amount: e.amount, id: e.id };
      else if (!cur || cur.id) rowsState[w.id] = { on: false, type: 'tam', amount: lastAmount(w.id, 'tam'), id: null };
      // kullanıcının o anki seçimi korunur
    });
  };
  load();
  const otherJobs = (wid) => { const jid = curJobId(); return DB.entries.filter((x) => x.workerId === wid && x.date === date && (x.jobId || null) !== jid).map(placeName); };
  const rows = () => [...DB.workers].sort((a, b) => sortTr(a.name, b.name)).map((w, i) => {
    const s = rowsState[w.id]; const oj = otherJobs(w.id);
    return `<div class="bulk-row ${s.on ? 'on' : 'off'}" data-w="${w.id}" style="--i:${i}">
      <div class="chk" data-tg>${I.check}</div>
      <div class="nm" data-tg><div class="avatar">${esc(initials(w.name))}</div><div><div>${esc(w.name)}</div>${oj.length ? `<div class="kbd" style="color:var(--amber)">Aynı gün: ${esc(oj.join(', '))}</div>` : ''}</div></div>
      <div class="seg"><button class="${s.type === 'tam' ? 'on' : ''}" data-ty="tam">Tam Gün</button><button class="${s.type === 'yarim' ? 'on' : ''}" data-ty="yarim">Yarım Gün</button></div>
      <div class="money-inp"><input class="inp tnum" type="number" min="0" step="any" placeholder="Ücret" value="${s.amount}" data-am /><span>₺</span></div>
    </div>`;
  }).join('');
  modal({
    title: 'Yevmiye Gir', sub: 'Seçilen gün kimlerin, nerede, ne kadar çalıştığını işaretleyin', wide: true,
    body: `<div class="frow"><div>${placeField('bPlace', place)}</div><div class="field"><label>Tarih</label><input type="date" class="inp" id="bDate" value="${date}" /></div></div>
      <div class="field" style="margin-bottom:8px;flex-direction:row;justify-content:space-between;align-items:center"><label>İşçiler</label><button class="chip" data-all>Tümünü seç</button></div><div id="bRows" class="stagger">${rows()}</div>
      <div class="ext-sec"><div class="ext-head"><div><b>Sistemde kayıtlı olmayanlar</b><span>Dışarıdan gelen usta, yevmiyeci, ortak usta başı vb. Sadece bu işin sayfasında görünür.</span></div><button class="btn sm" data-addx>${I.plus} Kişi Ekle</button></div>
      <div id="xRows"></div><datalist id="extNames">${extNames().map((n) => `<option value="${esc(n)}">`).join('')}</datalist></div>
      <div class="bulk-sum"><span id="bCount"></span><b id="bTotal" class="tnum"></b></div>`,
    foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn red" data-ok>Kaydet</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      bindPlaceHint(m, 'bPlace');
      const upd = () => { const on = Object.values(rowsState).filter((s) => s.on); const xs = ext.filter((x) => x.name.trim()); $('#bCount', m).textContent = `${on.length} işçi${xs.length ? ` + ${xs.length} dışarıdan` : ''} seçildi`; $('#bTotal', m).textContent = money(on.reduce((a, s) => a + num(s.amount), 0) + xs.reduce((a, x) => a + num(x.amount), 0)); };
      const renderExt = (animLast = false) => {
        $('#xRows', m).innerHTML = ext.map((x, i) => `<div class="bulk-row x-row on ${animLast && i === ext.length - 1 ? 'x-new' : ''}" data-x="${i}">
          <div class="avatar x">${esc(initials(x.name || '?'))}</div>
          <input class="inp" list="extNames" placeholder="Adı soyadı" value="${esc(x.name)}" data-xn />
          <div class="seg"><button class="${x.type === 'tam' ? 'on' : ''}" data-xt="tam">Tam Gün</button><button class="${x.type === 'yarim' ? 'on' : ''}" data-xt="yarim">Yarım Gün</button></div>
          <div style="display:flex;gap:6px;align-items:center"><div class="money-inp" style="flex:1"><input class="inp tnum" type="number" min="0" step="any" placeholder="Ücret" value="${x.amount}" data-xa /><span>₺</span></div><button class="icon-btn danger" data-xd title="Kaldır">${I.close}</button></div>
        </div>`).join('');
        $$('.x-row', m).forEach((r) => {
          const x = ext[+r.dataset.x];
          $('[data-xn]', r).oninput = (e) => { x.name = e.target.value; $('.avatar', r).textContent = initials(x.name || '?'); if (x.amount === '' ) { const la = lastExtAmount(x.name, x.type); if (la !== '') { x.amount = la; $('[data-xa]', r).value = la; } } upd(); };
          $$('[data-xt]', r).forEach((b) => (b.onclick = () => { Sound.play('tick'); x.type = b.dataset.xt; $$('[data-xt]', r).forEach((y) => y.classList.toggle('on', y === b)); upd(); }));
          $('[data-xa]', r).oninput = (e) => { x.amount = e.target.value; upd(); };
          $('[data-xd]', r).onclick = () => { Sound.play('del'); r.classList.add('removing'); setTimeout(() => { ext.splice(+r.dataset.x, 1); renderExt(); upd(); }, 220); };
        });
      };
      renderExt();
      $('[data-addx]', m).onclick = () => { Sound.play('select'); ext.push({ name: '', type: 'tam', amount: '' }); renderExt(true); upd(); const ins = $$('[data-xn]', m); ins[ins.length - 1].focus(); };
      const bind = () => {
        $$('.bulk-row', m).forEach((r) => {
          const s = rowsState[r.dataset.w];
          $$('[data-tg]', r).forEach((t) => (t.onclick = () => { s.on = !s.on; Sound.play(s.on ? 'select' : 'tick'); r.classList.toggle('on', s.on); r.classList.toggle('off', !s.on); upd(); }));
          $$('[data-ty]', r).forEach((b) => (b.onclick = () => { Sound.play('tick'); s.type = b.dataset.ty; $$('[data-ty]', r).forEach((x) => x.classList.toggle('on', x === b)); if (!s.id && !s.touched) { s.amount = lastAmount(r.dataset.w, s.type); $('[data-am]', r).value = s.amount; } upd(); }));
          $('[data-am]', r).oninput = (e) => { s.amount = e.target.value; s.touched = true; upd(); };
        });
        upd();
      };
      bind();
      $('[data-all]', m).onclick = () => { const all = Object.values(rowsState).every((s) => s.on); Object.values(rowsState).forEach((s) => (s.on = !all)); Sound.play('select'); $('#bRows', m).innerHTML = rows(); bind(); };
      const reload = () => {
        place = $('#bPlace', m).value; date = $('#bDate', m).value || today();
        const key = (curJobId() || '') + '|' + date; if (key === loadedKey) return;
        load(); $('#bRows', m).classList.remove('stagger'); $('#bRows', m).innerHTML = rows(); bind(); renderExt();
      };
      let rt; $('#bPlace', m).addEventListener('input', () => { clearTimeout(rt); rt = setTimeout(reload, 300); }); $('#bDate', m).onchange = reload;
      $('[data-ok]', m).onclick = () => {
        date = $('#bDate', m).value; if (!date) { toast('Tarih seçin', true); return; }
        const bad = Object.entries(rowsState).find(([, s]) => s.on && (s.amount === '' || num(s.amount) < 0));
        if (bad) { shakeErr($(`.bulk-row[data-w="${bad[0]}"] [data-am]`, m)); toast('Seçili işçilerin ücretini girin', true, 'none'); return; }
        const xs = ext.filter((x) => x.name.trim());
        const badX = xs.findIndex((x) => x.amount === '' || num(x.amount) < 0);
        if (badX >= 0) { shakeErr($$('.x-row', m)[ext.indexOf(xs[badX])].querySelector('[data-xa]')); toast('Dışarıdan gelenlerin ücretini girin', true, 'none'); return; }
        if (xs.length && !$('#bPlace', m).value.trim()) { shakeErr($('#bPlace', m)); toast('Dışarıdan gelenler için çalışılan yeri yazın', true, 'none'); return; }
        const anyOn = Object.values(rowsState).some((s) => s.on) || xs.length > 0;
        const prevJid = findJobByName($('#bPlace', m).value)?.id || null;
        const hadAny = DB.entries.some((x) => (x.jobId || null) === prevJid && x.date === date);
        if (!anyOn && !hadAny) { toast('En az bir kişi seçin', true); return; }
        const r = anyOn ? resolveJob($('#bPlace', m).value) : { id: prevJid, created: false };
        const jid = r.id; const now = new Date().toISOString(); let n = 0;
        Object.entries(rowsState).forEach(([wid, s]) => {
          const ex = DB.entries.find((x) => x.workerId === wid && (x.jobId || null) === jid && x.date === date);
          if (s.on) { n++; if (ex) Object.assign(ex, { type: s.type, amount: num(s.amount), updatedAt: now }); else DB.entries.push({ id: uid(), workerId: wid, jobId: jid, date, type: s.type, amount: num(s.amount), note: '', createdAt: now, updatedAt: now }); }
          else if (ex) DB.entries = DB.entries.filter((x) => x.id !== ex.id);
        });
        if (jid) DB.entries = DB.entries.filter((x) => !(!x.workerId && x.jobId === jid && x.date === date));
        xs.forEach((x) => { n++; DB.entries.push({ id: uid(), workerId: null, extName: x.name.trim().replace(/\s+/g, ' '), jobId: jid, date, type: x.type, amount: num(x.amount), note: '', createdAt: now, updatedAt: now }); });
        persist(); close(true); refresh();
        toast(`${fmtDate(date, false)} için ${n} kişi kaydedildi`);
        if (r.created) setTimeout(() => toast(`“${r.title}” İş'ler'e eklendi`, false, 'tick'), 450);
        burst(innerWidth / 2, innerHeight - 70, 24);
      };
    }
  });
}

/* ---------- İş'ler ---------- */
function jobStats(j) {
  const es = entriesOf((e) => e.jobId === j.id);
  return { es, paid: sum(es), days: new Set(es.map((e) => e.date)).size, people: [...new Map(es.map((e) => [pKey(e), e])).values()] };
}
function renderJobs() {
  const q = ui.jSearch.toLocaleLowerCase('tr-TR');
  const types = [...new Set(DB.jobs.map((j) => j.type).filter(Boolean))].sort(sortTr);
  if (ui.jType && !types.includes(ui.jType)) ui.jType = '';
  const list = DB.jobs.filter((j) => (!ui.jType || j.type === ui.jType) && (ui.jFilter === 'all' || (ui.jFilter === 'on' ? j.status !== 'done' : j.status === 'done')) && (`${j.title} ${j.location} ${j.client || ''} ${j.type || ''}`).toLocaleLowerCase('tr-TR').includes(q))
    .sort((a, b) => (a.status === 'done') - (b.status === 'done') || (b.startDate || '').localeCompare(a.startDate || ''));
  return `
  <div class="page-head"><div><h1>İş'ler</h1><p>Onaylanan iş teklifleri · malzeme, işçilik, konum ve çalışan günleri</p></div>
  <button class="btn primary" data-act="add-job">${I.plus} Yeni İş</button></div>
  ${DB.jobs.length ? `<div class="toolbar"><div class="search">${I.search}<input id="jSearch" placeholder="İş, konum veya müşteri ara..." value="${esc(ui.jSearch)}" /></div>
    <div class="seg"><button class="${ui.jFilter === 'all' ? 'on' : ''}" data-jf="all">Tümü</button><button class="${ui.jFilter === 'on' ? 'on' : ''}" data-jf="on">Devam Eden</button><button class="${ui.jFilter === 'done' ? 'on' : ''}" data-jf="done">Tamamlanan</button></div></div>
    ${types.length ? `<div class="chips" style="margin-top:-6px">${I.tag.replace('<svg', '<svg width="15" height="15" style="color:var(--tx3);align-self:center;margin-right:4px"')}<button class="chip ${!ui.jType ? 'on' : ''}" data-jt="">Tüm türler</button>${types.map((t) => `<button class="chip ${ui.jType === t ? 'on' : ''}" data-jt="${esc(t)}">${esc(t)} <span style="opacity:.6">${DB.jobs.filter((j) => j.type === t).length}</span></button>`).join('')}</div>` : ''}` : ''}
  ${!DB.jobs.length ? emptyState(I.brief, 'Henüz iş eklenmedi', 'Onaylanan bir iş teklifini ekleyerek başlayın.', '<button class="btn primary" data-act="add-job">' + I.plus + ' İş Ekle</button>')
    : !list.length ? '<div class="empty"><p>Eşleşen iş bulunamadı.</p></div>'
    : `<div class="grid jobs-grid stagger">${list.map((j, i) => {
      const s = jobStats(j);
      const ph = j.photos || [];
      return `<div class="card jcard" style="--i:${Math.min(i, 14)}" data-job="${j.id}">
        ${ph.length ? `<div class="jcover"><img src="${photoUrl(j, ph[0])}" alt="" loading="lazy" /><span>${I.camera.replace('<svg', '<svg width="13" height="13"')} ${ph.length}</span></div>` : ''}
        <div class="jtop"><div style="min-width:0"><div class="jtitle">${esc(j.title)}</div>${j.type ? `<div style="margin-top:7px">${typePill(j)}</div>` : ''}<div class="jloc">${I.pin}<span>${esc(j.location || 'Konum girilmedi')}</span></div></div>${statusPill(j)}</div>
        <div class="jmoney"><div><span>Malzeme</span><b class="tnum">${money(j.materialCost)}</b></div><div><span>İşçilik</span><b class="tnum">${money(j.laborCost)}</b></div><div><span>Toplam</span><b class="tnum">${money(num(j.materialCost) + num(j.laborCost))}</b></div></div>
        <div class="jfoot"><div class="avstack">${s.people.slice(0, 6).map((e) => `<div class="avatar ${e.workerId ? '' : 'x'}" title="${esc(pName(e))}">${esc(initials(pName(e)))}</div>`).join('') || '<span>Henüz çalışan yok</span>'}</div><span>${s.days} gün · ${money(s.paid)} yevmiye</span></div>
      </div>`; }).join('')}</div>`}`;
}
const JOB_TYPES = ['Cam Balkon', 'Pergole', 'Dış Cephe', 'Giyotin Cam', 'Kış Bahçesi', 'Alüminyum Doğrama', 'PVC Pencere', 'Tente / Branda', 'Tadilat'];
const allJobTypes = () => { const set = [...JOB_TYPES]; [...(DB.jobTypes || []), ...DB.jobs.map((j) => j.type)].forEach((t) => { if (t && !set.some((x) => norm(x) === norm(t))) set.push(t); }); return set; };
const typePill = (j) => (j.type ? `<span class="pill tpill">${I.tag.replace('<svg', '<svg width="12" height="12"')}${esc(j.type)}</span>` : '');
const statusPill = (j) => (j.autoCreated ? '<span class="pill half"><i></i>Detay bekliyor</span>' : j.status === 'done' ? '<span class="pill done"><i></i>Tamamlandı</span>' : '<span class="pill on"><i></i>Devam Ediyor</span>');
function openJobModal(id = null) {
  const j = id ? job(id) : null;
  modal({
    title: j ? 'İşi Düzenle' : 'Yeni İş', sub: 'Onaylanan iş teklifinin bilgileri',
    body: `<div class="field"><label>İşin adı <em>*</em></label><input class="inp" id="jTitle" value="${esc(j?.title || '')}" placeholder="Örn. Kadıköy 3 katlı bina dış cephe" /></div>
      <div class="field"><label>İşin türü <em>*</em></label><div class="tchips">${allJobTypes().map((t) => `<button type="button" class="chip ${norm(j?.type) === norm(t) ? 'on' : ''}" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <input class="inp" id="jType" value="${esc(j?.type || '')}" placeholder="Listede yoksa buraya yazın (örn. Duşakabin)" style="margin-top:8px" /></div>
      <div class="field"><label>Müşteri / İş veren</label><input class="inp" id="jClient" value="${esc(j?.client || '')}" placeholder="İsteğe bağlı" /></div>
      <div class="field"><label>İşin konumu <em>*</em></label><input class="inp" id="jLoc" value="${esc(j?.location || '')}" placeholder="Adres, mahalle, ilçe" /></div>
      <div class="frow"><div class="field"><label>Malzeme ücreti</label><div class="money-inp"><input class="inp tnum" id="jMat" type="number" min="0" step="any" value="${j?.materialCost ?? ''}" placeholder="0" /><span>₺</span></div></div>
      <div class="field"><label>İşçilik ücreti</label><div class="money-inp"><input class="inp tnum" id="jLab" type="number" min="0" step="any" value="${j?.laborCost ?? ''}" placeholder="0" /><span>₺</span></div></div></div>
      <div class="frow"><div class="field"><label>Başlangıç tarihi</label><input type="date" class="inp" id="jStart" value="${j?.startDate || today()}" /></div>
      <div class="field"><label>Durum</label><select class="inp" id="jStatus"><option value="on" ${j?.status !== 'done' ? 'selected' : ''}>Devam Ediyor</option><option value="done" ${j?.status === 'done' ? 'selected' : ''}>Tamamlandı</option></select></div></div>
      <div class="field"><label>Not</label><textarea class="inp" id="jNote" placeholder="Teklif detayı, ek bilgiler...">${esc(j?.note || '')}</textarea></div>`,
    foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn primary" data-ok>${j ? 'Kaydet' : 'İşi Ekle'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      const syncChips = () => $$('.tchips .chip', m).forEach((c) => c.classList.toggle('on', norm(c.dataset.type) === norm($('#jType', m).value)));
      $$('.tchips .chip', m).forEach((c) => (c.onclick = () => { Sound.play('select'); $('#jType', m).value = c.dataset.type; syncChips(); }));
      $('#jType', m).oninput = syncChips;
      $('[data-ok]', m).onclick = () => {
        const type = $('#jType', m).value.trim(); if (!type) { shakeErr($('#jType', m)); toast('İşin türünü seçin veya yazın', true, 'none'); return; }
        const title = req(m, '#jTitle'); if (!title) return; const location = req(m, '#jLoc'); if (!location) return;
        const dup = DB.jobs.find((x) => x.id !== id && norm(x.title) === norm(title)); if (dup) { shakeErr($('#jTitle', m)); toast('Bu isimde bir iş zaten var', true, 'none'); return; }
        if (!JOB_TYPES.some((x) => norm(x) === norm(type)) && !DB.jobTypes.some((x) => norm(x) === norm(type))) DB.jobTypes.push(type);
        const data = { type, title, location, client: $('#jClient', m).value.trim(), materialCost: num($('#jMat', m).value), laborCost: num($('#jLab', m).value), startDate: $('#jStart', m).value, status: $('#jStatus', m).value, note: $('#jNote', m).value.trim() };
        if (j) { Object.assign(j, data); j.autoCreated = false; } else DB.jobs.push({ id: uid(), createdAt: new Date().toISOString(), photos: [], ...data });
        persist(); close(true); toast(j ? 'İş güncellendi' : 'İş eklendi'); refresh();
      };
    }
  });
}
function renderJob() {
  const j = job(route.id); const s = jobStats(j);
  const byDate = {}; s.es.forEach((e) => (byDate[e.date] = byDate[e.date] || []).push(e));
  const dates = Object.keys(byDate).sort().reverse();
  const total = num(j.materialCost) + num(j.laborCost);
  const personDays = s.es.reduce((a, e) => a + (e.type === 'yarim' ? 0.5 : 1), 0);
  const dayFn = (ds) => { const es = byDate[ds]; if (!es) return null; return { cls: 'full', tag: es.length + ' kişi', label: money(sum(es)), title: es.map((e) => `${worker(e.workerId)?.name || '—'} · ${typeLabel(e.type)}`).join('\n') }; };
  const perWorker = s.people.map((r) => { const k = pKey(r); const es = s.es.filter((e) => pKey(e) === k); return { id: r.workerId, r, n: es.reduce((a, e) => a + (e.type === 'yarim' ? 0.5 : 1), 0), t: sum(es) }; }).sort((a, b) => b.t - a.t);
  return `
  <button class="crumb" data-go="jobs">${I.back} İş'ler</button>
  <div class="page-head" style="margin-top:4px">
    <div><div style="display:flex;align-items:center;gap:12px"><h1>${esc(j.title)}</h1>${typePill(j)}${statusPill(j)}</div><p>${j.client ? esc(j.client) + ' · ' : ''}${j.startDate ? 'Başlangıç: ' + fmtDate(j.startDate, false) : ''}</p></div>
    <div style="display:flex;gap:8px"><button class="btn red" data-act="bulk-job">${I.plus} Çalışma Günü Ekle</button><button class="btn" data-act="edit-job">${I.edit} Düzenle</button><button class="btn danger" data-act="del-job">${I.trash} Sil</button></div>
  </div>
  ${j.autoCreated ? `<div class="auto-banner">${I.alert}<div><b>Bu iş, yevmiye girerken otomatik eklendi.</b><br/>İşin türü, malzeme ücreti, işçilik ücreti ve konum gibi detayları tamamlayabilirsiniz.</div><button class="btn sm primary" data-act="edit-job">${I.edit} Detayları Tamamla</button></div>` : ''}
  <div class="stagger">
    <div class="grid stats" style="margin-bottom:16px">
      <div class="card stat" style="--i:0"><div class="lbl">${I.brief} Malzeme Ücreti</div><div class="val tnum" data-count="${num(j.materialCost)}" data-money="1">0</div></div>
      <div class="card stat" style="--i:1"><div class="lbl">${I.users} İşçilik Ücreti</div><div class="val tnum" data-count="${num(j.laborCost)}" data-money="1">0</div><div class="sub">Teklifteki işçilik bedeli</div></div>
      <div class="card stat" style="--i:2"><div class="lbl">${I.wallet} Toplam Teklif</div><div class="val tnum" data-count="${total}" data-money="1">0</div><div class="sub">Malzeme + işçilik</div></div>
      <div class="card stat accent" style="--i:3"><div class="lbl">${I.calc} İşçilere Ödenen Yevmiye</div><div class="val tnum" data-count="${s.paid}" data-money="1">0</div><div class="sub">${s.days} gün · ${personDays.toLocaleString('tr-TR')} kişi-gün</div></div>
    </div>
    <div class="detail">
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card" style="--i:4">${calendarHTML('j_' + j.id, dayFn)}
          <div class="cal-legend"><span><i style="background:var(--red)"></i>Bu işte çalışılan gün</span><span class="kbd" style="margin-left:auto">Bir güne tıklayarak o gün kimlerin çalıştığını girin / düzenleyin</span></div>
          <div class="loc-box">${I.pin}<div>${esc(j.location)}</div><button class="btn sm" data-act="map">${I.map} Haritada Aç</button></div>
          ${j.note ? `<p style="color:var(--tx2);margin-top:14px;line-height:1.6;white-space:pre-wrap">${esc(j.note)}</p>` : ''}
        </div>
        ${photosCard(j)}
      </div>
      <div style="display:flex;flex-direction:column;gap:18px">
        <div class="card" style="--i:5" id="whoCard"><h2 class="sec">Hangi Gün Kimler Çalıştı <small>${dates.length} gün</small></h2>
          ${dates.length ? `<div class="scroll" style="max-height:420px">${dates.map((d) => `<div class="dategroup"><div class="dg-head"><b>${fmtDate(d)}</b><span class="tnum">${byDate[d].length} kişi · ${money(sum(byDate[d]))}</span></div>
            <div class="wchips">${byDate[d].map((e) => `<div class="wchip ${e.workerId ? '' : 'x'}" ${e.workerId ? `data-worker="${e.workerId}"` : ''}><div class="avatar">${esc(initials(pName(e)))}</div>${esc(pName(e))}${extTag(e)} <em>${e.type === 'yarim' ? 'Yarım' : 'Tam'} · ${money(e.amount)}</em></div>`).join('')}</div></div>`).join('')}</div>`
          : '<p class="kbd" style="padding:8px 0 4px">Bu işe henüz çalışma günü girilmedi. Takvimde bir güne tıklayın veya “Çalışma Günü Ekle” butonunu kullanın.</p>'}
        </div>
        ${perWorker.length ? `<div class="card" style="--i:6"><h2 class="sec">Kişi Bazında</h2><div class="list">${perWorker.map((p) => `<div class="li" style="cursor:${p.id ? 'pointer' : 'default'}" ${p.id ? `data-worker="${p.id}"` : ''}><div class="avatar ${p.id ? '' : 'x'}" style="width:34px;height:34px;border-radius:10px;font-size:12px">${esc(initials(pName(p.r)))}</div><div class="grow"><div class="t1">${esc(pName(p.r))}${extTag(p.r)}</div><div class="t2">${p.n.toLocaleString('tr-TR')} gün</div></div><div class="amt tnum">${money(p.t)}</div></div>`).join('')}</div></div>` : ''}
      </div>
    </div>
  </div>`;
}

/* ---------- Fotoğraflar ---------- */
const photoUrl = (j, p) => p.data || (window.PhotoCache && PhotoCache.get(j.id + '/' + p.file)) || `atig://photo/${encodeURIComponent(j.id)}/${encodeURIComponent(p.file)}`;
function photosCard(j) {
  const ph = j.photos || [];
  return `<div class="card" style="--i:5" id="photoCard">
    <h2 class="sec">${I.camera.replace('<svg', '<svg width="18" height="18"')} Fotoğraflar <small>${ph.length} fotoğraf</small><span style="margin-left:auto"></span><button class="btn sm primary" data-act="add-photo">${I.plus} Fotoğraf Ekle</button></h2>
    ${ph.length ? `<div class="photo-grid">${ph.map((p, i) => `<div class="ph" style="--i:${i}" data-ph="${i}"><img src="${photoUrl(j, p)}" alt="" loading="lazy" /><button class="ph-del" data-phdel="${i}" title="Sil">${I.trash}</button><span class="ph-date">${p.addedAt ? fmtDate(p.addedAt.slice(0, 10), false) : ''}</span></div>`).join('')}<button class="ph ph-add" data-act="add-photo">${I.plus}<span>Ekle</span></button></div>`
    : `<div class="dropzone" data-act="add-photo"><div class="dz-icon">${I.image}</div><b>Fotoğraf eklemek için tıklayın</b><span>veya fotoğrafları buraya sürükleyip bırakın</span></div>`}
  </div>`;
}
async function addPhotos(jobId, files) {
  const j = job(jobId); if (!j) return;
  try {
    const added = files ? await storage.addPhotoFiles(jobId, files) : await storage.pickPhotos(jobId);
    if (!added || !added.length) return;
    j.photos = j.photos || []; const now = new Date().toISOString();
    added.forEach((a) => j.photos.push({ id: uid(), file: a.file, name: a.name, data: a.data, addedAt: now }));
    persist(); refresh(); toast(`${added.length} fotoğraf eklendi`, false, 'photo');
    setTimeout(() => $$('#photoCard .ph:not(.ph-add)').slice(-added.length).forEach((el) => el.classList.add('ph-new')), 10);
  } catch (e) { toast('Fotoğraf eklenemedi', true); }
}
function bindPhotos(v) {
  const card = $('#photoCard', v); if (!card) return; const j = job(route.id);
  ['dragenter', 'dragover'].forEach((ev) => card.addEventListener(ev, (e) => { e.preventDefault(); card.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach((ev) => card.addEventListener(ev, (e) => { e.preventDefault(); if (ev === 'dragleave' && card.contains(e.relatedTarget)) return; card.classList.remove('drag'); }));
  card.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) addPhotos(j.id, e.dataTransfer.files); });
  $$('[data-ph]', card).forEach((el) => (el.onclick = (e) => { if (e.target.closest('[data-phdel]')) return; openLightbox(j.id, +el.dataset.ph, el); }));
  $$('[data-phdel]', card).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); deletePhoto(j.id, +b.dataset.phdel); }));
}
async function deletePhoto(jobId, idx, after) {
  const j = job(jobId); const p = j.photos[idx]; if (!p) return;
  if (!(await confirmBox('Fotoğrafı sil', 'Bu fotoğraf kalıcı olarak silinecek. Emin misiniz?'))) return;
  j.photos.splice(idx, 1); if (!p.data) storage.deletePhoto(jobId, p.file); persist(); refresh(); toast('Fotoğraf silindi', false, 'del'); if (after) after();
}
function openLightbox(jobId, idx, fromEl) {
  const j = job(jobId); let i = idx;
  const lb = document.createElement('div'); lb.className = 'lightbox';
  lb.innerHTML = `<div class="lb-top"><span class="lb-count"></span><div style="display:flex;gap:8px"><button class="icon-btn danger" data-d title="Sil">${I.trash}</button><button class="icon-btn" data-x title="Kapat">${I.close}</button></div></div>
    <button class="lb-nav l" data-p>${I.left}</button><div class="lb-stage"><img alt="" /></div><button class="lb-nav r" data-n>${I.right}</button><div class="lb-strip"></div>`;
  document.body.appendChild(lb); Sound.play('open');
  const img = $('.lb-stage img', lb);
  if (fromEl) { const r = fromEl.getBoundingClientRect(); img.style.setProperty('--fx', r.left + r.width / 2 - innerWidth / 2 + 'px'); img.style.setProperty('--fy', r.top + r.height / 2 - innerHeight / 2 + 'px'); }
  const show = (dir = 0) => {
    const ph = j.photos; if (!ph.length) return close();
    i = (i + ph.length) % ph.length; img.className = dir ? (dir > 0 ? 'in-r' : 'in-l') : 'in-zoom'; void img.offsetWidth;
    img.src = photoUrl(j, ph[i]); $('.lb-count', lb).textContent = `${i + 1} / ${ph.length}${ph[i].addedAt ? ' · ' + fmtDate(ph[i].addedAt.slice(0, 10), false) : ''}`;
    $('.lb-strip', lb).innerHTML = ph.map((p, k) => `<img src="${photoUrl(j, p)}" class="${k === i ? 'on' : ''}" data-k="${k}" />`).join('');
    $$('.lb-strip img', lb).forEach((t) => (t.onclick = () => { const k = +t.dataset.k; const d = k > i ? 1 : -1; i = k; Sound.play('tick'); show(d); }));
    $$('.lb-nav', lb).forEach((b) => (b.style.display = ph.length > 1 ? '' : 'none'));
  };
  const close = () => { Sound.play('close'); lb.classList.add('closing'); document.removeEventListener('keydown', key); setTimeout(() => lb.remove(), 260); };
  const key = (e) => { if ($('#modalRoot').children.length) return; if (e.key === 'Escape') { e.stopPropagation(); close(); } if (e.key === 'ArrowRight') { i++; Sound.play('tick'); show(1); } if (e.key === 'ArrowLeft') { i--; Sound.play('tick'); show(-1); } };
  document.addEventListener('keydown', key, true);
  $('[data-x]', lb).onclick = close; $('[data-p]', lb).onclick = () => { i--; Sound.play('tick'); show(-1); }; $('[data-n]', lb).onclick = () => { i++; Sound.play('tick'); show(1); };
  $('[data-d]', lb).onclick = () => deletePhoto(jobId, i, () => { if (!j.photos.length) close(); else show(0); });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
  show(0);
}

/* ---------- Ayarlar ---------- */
function renderSettings() {
  return `
  <div class="page-head"><div><h1>Ayarlar</h1><p>Ses, yedekleme ve veri yönetimi</p></div></div>
  <div class="settings-grid stagger">
    <div class="card set-card" style="--i:0"><div class="set-icon">${I.sound}</div><h3>Sesler</h3><p>Onay, hata, silme ve açılış logosu sesleri. Ses seviyesini aşağıdan ayarlayabilirsiniz.</p>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><button class="switch ${DB.settings?.sound !== false ? 'on' : ''}" data-act="sound-toggle"><i></i></button><span>${DB.settings?.sound !== false ? 'Açık' : 'Kapalı'}</span></div>
      <div style="display:flex;align-items:center;gap:12px"><input type="range" id="vol" min="0" max="1" step="0.05" value="${DB.settings?.volume ?? 0.7}" class="range" /><button class="btn sm" data-act="sound-test">Dene</button></div></div>
    <div class="card set-card" style="--i:0"><div class="set-icon">${I.download}</div><h3>Yedek Al</h3><p>Tüm kayıtları ve fotoğrafları tek dosya yapar. Açılan pencereden "Dosyalar'a Kaydet" seçin veya WhatsApp ile kendinize gönderin.</p><button class="btn primary" data-act="export">${I.download} Yedek Dosyası Oluştur</button></div>
    <div class="card set-card" style="--i:1"><div class="set-icon">${I.upload}</div><h3>Yedekten Geri Yükle</h3><p>Daha önce aldığınız yedek dosyasını yükleyin. Dikkat: mevcut tüm veriler yedekteki verilerle değiştirilir.</p><button class="btn" data-act="import">${I.upload} Yedek Dosyası Seç</button></div>
    <div class="card set-card" style="--i:2"><div class="set-icon">${I.folder}</div><h3>Veriler Nerede?</h3><p>Tüm kayıtlar ve fotoğraflar sadece bu telefonun içinde saklanır, internete gönderilmez. Telefon kaybolursa veya uygulama silinirse veriler de gider; bu yüzden haftada bir yedek alın.</p><p class="kbd" id="usageTxt">Kullanılan alan hesaplanıyor...</p></div>
    <div class="card set-card" style="--i:3"><div class="set-icon">${I.share}</div><h3>Ana Ekrana Ekle</h3><p>Uygulamayı iPhone ana ekranına simge olarak eklemenin adımlarını gösterir.</p><button class="btn" data-act="install-guide">${I.share} Nasıl Eklenir?</button></div>
    <div class="card set-card" style="--i:3"><img src="assets/logo.png" style="height:26px;margin-top:8px" alt="" /><h3>ATIG İşçi Takip</h3><p>Sürüm 2.0 (iPhone)<br/>${DB.workers.length} işçi · ${DB.jobs.length} iş · ${DB.entries.length} çalışma kaydı</p></div>
  </div>`;
}

/* ---------- Olay bağlama ---------- */
function bindView(v) {
  $$('[data-go]', v).forEach((b) => (b.onclick = () => go(b.dataset.go)));
  $$('[data-worker]', v).forEach((b) => (b.onclick = () => go('worker', b.dataset.worker)));
  $$('[data-job]', v).forEach((b) => (b.onclick = () => go('job', b.dataset.job)));
  $$('[data-cal]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); shiftCal(b.dataset.cal, +b.dataset.mv); }));
  const ws = $('#wSearch', v); if (ws) { ws.oninput = () => { ui.wSearch = ws.value; refresh(); const n = $('#wSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }; }
  const js = $('#jSearch', v); if (js) { js.oninput = () => { ui.jSearch = js.value; refresh(); const n = $('#jSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }; }
  $$('[data-jf]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); ui.jFilter = b.dataset.jf; refresh(); }));

  if (route.name === 'worker') {
    const w = worker(route.id); const cs = calcState(w.id);
    $$('.day[data-day]', v).forEach((d) => (d.onclick = () => {
      const ds = d.dataset.day;
      if (cs.mode === 'pick') { cs.sel.has(ds) ? (cs.sel.delete(ds), Sound.play('tick')) : (cs.sel.add(ds), Sound.play('select')); refresh(); }
      else openDayModal(w.id, ds);
    }));
    $$('[data-mode]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); cs.mode = b.dataset.mode; refresh(); }));
    $$('[data-preset]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); applyPreset(cs, b.dataset.preset); refresh(); }));
    const f = $('#cFrom', v), t = $('#cTo', v);
    if (f) f.onchange = () => { cs.from = f.value; cs.preset = ''; refresh(); };
    if (t) t.onchange = () => { cs.to = t.value; cs.preset = ''; refresh(); };
  }
  if (route.name === 'job') {
    $$('.day[data-day]', v).forEach((d) => (d.onclick = () => openBulkModal({ jobId: route.id, date: d.dataset.day })));
    bindPhotos(v);
  }
  $$('[data-act]', v).forEach((b) => (b.onclick = () => action(b.dataset.act)));
  if (route.name === 'debts' || route.name === 'person') bindDebts(v);
  bindAdvances(v); bindReminders(v);
  const ut = $('#usageTxt', v); if (ut && storage.usage) storage.usage().then((u) => { ut.textContent = `Kullanılan alan: ${(u / 1048576).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB · ${(DB.jobs || []).reduce((n, j) => n + (j.photos || []).length, 0)} fotoğraf`; });
  $$('[data-jt]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); ui.jType = b.dataset.jt; refresh(); }));
  const vol = $('#vol', v); if (vol) { vol.oninput = () => { DB.settings = { ...(DB.settings || {}), volume: +vol.value }; Sound.setVolume(); }; vol.onchange = () => { persist(); Sound.play('success'); }; }
}
async function action(a) {
  const id = route.id;
  if (await debtAction(a)) return;
  if (await advAction(a)) return;
  switch (a) {
    case 'add-worker': return openWorkerModal();
    case 'edit-worker': return openWorkerModal(id);
    case 'del-worker': {
      const w = worker(id); const n = DB.entries.filter((e) => e.workerId === id).length;
      if (await confirmBox('İşçiyi sil', `<b>${esc(w.name)}</b> ve ona ait <b>${n}</b> çalışma kaydı ile <b>${(DB.advances || []).filter((x) => x.workerId === id).length}</b> avans kaydı kalıcı olarak silinecek. Emin misiniz?`)) {
        DB.workers = DB.workers.filter((x) => x.id !== id); DB.entries = DB.entries.filter((e) => e.workerId !== id); DB.advances = (DB.advances || []).filter((x) => x.workerId !== id); persist(); toast('İşçi silindi', false, 'del'); go('workers');
      } return;
    }
    case 'add-job': return openJobModal();
    case 'edit-job': return openJobModal(id);
    case 'del-job': {
      const j = job(id); const n = DB.entries.filter((e) => e.jobId === id).length;
      if (await confirmBox('İşi sil', `<b>${esc(j.title)}</b> ve fotoğrafları silinecek.${n ? `<br/><br/>Bu yerde girilmiş <b>${n}</b> çalışma kaydı işçilerin takviminden <b>silinmez</b>; ücretler korunur, yeri “Yer belirtilmedi” olarak görünür.` : ''}<br/><br/>İş bittiyse silmek yerine durumunu “Tamamlandı” yapmanız önerilir.`)) {
        DB.jobs = DB.jobs.filter((x) => x.id !== id); DB.entries.forEach((e) => { if (e.jobId === id) e.jobId = null; }); storage.deleteJobPhotos(id); persist(); toast('İş silindi', false, 'del'); go('jobs');
      } return;
    }
    case 'bulk-job': return openBulkModal({ jobId: id });
    case 'add-photo': return addPhotos(id);
    case 'sound-toggle': DB.settings = { ...(DB.settings || {}), sound: DB.settings?.sound === false }; persist(); refresh(); Sound.play('success'); return;
    case 'sound-test': return Sound.play('intro');
    case 'bulk-today': return openBulkModal({});
    case 'map': return storage.openExternal('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(job(id).location));
    case 'sel-month': {
      const cs = calcState(id); const st = ui.cal['w_' + id]; const pre = `${st.y}-${pad(st.m + 1)}-`;
      DB.entries.filter((e) => e.workerId === id && e.date.startsWith(pre)).forEach((e) => cs.sel.add(e.date)); return refresh();
    }
    case 'sel-clear': calcState(id).sel.clear(); return refresh();
    case 'export': { try { const p = await storage.exportData(DB); if (p) toast('Yedek kaydedildi'); } catch (e) { toast('Yedek alınamadı', true); } return; }
    case 'import': {
      try {
        const d = await storage.importData(); if (!d) return;
        if (await confirmBox('Yedeği yükle', `Yedekte <b>${d.workers.length}</b> işçi, <b>${d.jobs.length}</b> iş <b>${d.entries.length}</b> çalışma kaydı ve <b>${(d.people || []).length}</b> borç kişisi var. Mevcut veriler bunlarla değiştirilecek.`, 'Yükle')) {
          DB = { version: 1, workers: [], jobs: [], entries: [], people: [], debts: [], jobTypes: [], advances: [], settings: DB.settings, ...d }; persist(); ui.calc = {}; toast('Yedek yüklendi'); refresh();
        }
      } catch (e) { toast('Geçersiz yedek dosyası', true); }
      return;
    }
    case 'folder': return storage.openFolder();
    case 'install-guide': return showInstallGuide(true);
  }
}

/* ---------- Açılış ---------- */
async function boot() {
  const word = 'Yükleniyor';
  $('#loaderText').innerHTML = word.split('').map((c, i) => `<span style="animation-delay:${i * 60}ms,${600 + i * 90}ms">${c}</span>`).join('');
  buildDock();
  const minWait = new Promise((r) => setTimeout(r, 2100));
  try { const d = await storage.load(); if (d && Array.isArray(d.workers)) DB = { version: 1, workers: [], jobs: [], entries: [], people: [], debts: [], jobTypes: [], advances: [], settings: { sound: true, volume: 0.7 }, ...d };
    ['people', 'debts', 'jobTypes', 'advances'].forEach((k) => { if (!Array.isArray(DB[k])) DB[k] = []; }); } catch (e) { console.error(e); }
  render(false);
  await minWait;
  $('#loader').classList.add('out');
  await new Promise((r) => setTimeout(r, 450));
  if (DB.settings?.sound !== false) {
    Sound.unlock(); await new Promise((r) => setTimeout(r, 80));
    if (!Sound.running()) {
      const g = $('#tapGate'); g.classList.add('show');
      await new Promise((r) => { const h = () => { Sound.unlock(); if (window.Assistant && Assistant.unlockVoice) Assistant.unlockVoice(); r(); }; $('#splash').addEventListener('click', h, { once: true }); });
      g.classList.remove('show'); g.classList.add('gone'); await new Promise((r) => setTimeout(r, 380));
    }
  }
  $('#splashLogo').classList.add('in'); Sound.play('intro');
  setTimeout(() => $('#splash').classList.add('hit'), 820);
  await new Promise((r) => setTimeout(r, 2500));
  $('#splash').classList.add('out');
  document.body.classList.add('ready');
  render(true);
  setTimeout(moveIndicator, 50);
  setTimeout(() => $('#splash').remove(), 1000);
  setTimeout(() => { if (!showInstallGuide(false)) maybeRemind(); }, 1100);
}

/* ---------- iPhone: ana ekrana ekle rehberi ---------- */
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
function showInstallGuide(force) {
  if (!force && (!window.IS_WEB || !isIOS() || isStandalone() || localStorage.getItem('atig_install_skip') === today())) return false;
  const ov = document.createElement('div'); ov.className = 'install';
  ov.innerHTML = `<div class="in-card">
    <img src="assets/apple-touch-icon.png" class="in-icon" alt="" />
    <h3>ATIG'i ana ekrana ekleyin</h3>
    <p>Böylece uygulama telefonda simge olarak durur, tam ekran açılır ve internet olmadan da çalışır.</p>
    <ol class="in-steps">
      <li style="--i:0"><span class="in-n">1</span><div>Safari'nin altındaki <b>Paylaş</b> düğmesine dokunun <span class="in-ic">${I.share}</span></div></li>
      <li style="--i:1"><span class="in-n">2</span><div>Listeyi aşağı kaydırıp <b>Ana Ekrana Ekle</b>'ye dokunun <span class="in-ic">${I.plus}</span></div></li>
      <li style="--i:2"><span class="in-n">3</span><div>Sağ üstteki <b>Ekle</b>'ye dokunun. Artık ana ekrandaki <b>ATIG</b> simgesinden açın.</div></li>
    </ol>
    ${isStandalone() ? '<p class="kbd" style="color:var(--green)">Uygulama zaten ana ekrandan açılmış durumda.</p>' : ''}
    <button class="btn primary" data-ok style="width:100%;height:48px">Anladım</button>
    ${!force ? '<button class="btn ghost" data-later style="width:100%;margin-top:6px">Bugün tekrar gösterme</button>' : ''}
  </div>${!isStandalone() && isIOS() ? `<div class="in-arrow">${I.share}<i></i></div>` : ''}`;
  document.body.appendChild(ov); Sound.play('open'); requestAnimationFrame(() => ov.classList.add('show'));
  const close = () => { Sound.play('close'); ov.classList.remove('show'); setTimeout(() => ov.remove(), 400); if (!force) setTimeout(maybeRemind, 500); };
  $('[data-ok]', ov).onclick = close;
  const l = $('[data-later]', ov); if (l) l.onclick = () => { localStorage.setItem('atig_install_skip', today()); close(); };
  return true;
}
window.addEventListener('resize', moveIndicator);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modalRoot').children.length && !$('.lightbox') && (route.name === 'worker' || route.name === 'job')) go(route.name === 'worker' ? 'workers' : 'jobs'); });
