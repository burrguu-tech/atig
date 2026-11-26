'use strict';
/* ============ Sesli Asistan ============ */
const TOUR_STEPS = {
  a0: { text: 'Merhaba! Ben ATIG asistanı. Size programı sesli olarak anlatabilirim. Öğrenmek istediğiniz konunun üzerine bir kere dokunun.' },
  s1: { route: ['home'], target: null, title: 'Hoş geldiniz', text: 'Merhaba! Şimdi size bu programı adım adım tanıtacağım. Merak etmeyin, şu an ekranda gördükleriniz örnek bilgilerdir. Sizin kayıtlarınız hiç değişmez.' },
  s2: { route: ['home'], target: '#dock', title: 'Ana menü', text: 'Ekranın en altında ana menü var. Gitmek istediğiniz bölümün üzerine bir kere dokunmanız yeterli.' },
  s3: { route: ['home'], target: '.stats', title: 'Ana sayfa', text: 'Ana sayfada; kaç işçiniz olduğunu, devam eden işleri, bugün kimlerin çalıştığını ve bu ayın toplam yevmiyesini görürsünüz.' },
  s21: { route: ['home'], target: '.remcard', title: 'Borç hatırlatıcı', text: 'Ana sayfadaki borç hatırlatıcı, ödeme günü gelen ya da yaklaşan borçları gösterir. Günü geçen borçlar kırmızı yanıp söner. Program her gün ilk açıldığında da sizi uyarır.' },
  s4: { route: ['workers'], target: '.workers-grid', title: 'İşçiler', text: 'İşçiler bölümünde bütün işçileriniz kart kart durur. Yeni bir işçi eklemek için üstteki Yeni İşçi düğmesine dokunursunuz.' },
  s5: { route: ['worker', 'dw1'], target: '.detail > .card', title: 'İşçinin takvimi', text: 'Bir işçiye dokununca onun takvimi açılır. Kırmızı günler, işçinin çalıştığı günlerdir. Yarısı kırmızı olan günler ise yarım gündür.' },
  s6: { route: ['worker', 'dw1'], enter: () => openDayModal('dw1', today()), target: '.modal', title: 'Gün girme', text: 'Takvimde bir güne dokununca bu pencere açılır. Tam gün mü, yarım gün mü seçersiniz. O günkü ücreti ve çalıştığı yeri yazıp Kaydet düğmesine dokunursunuz. Yazdığınız yer İşler bölümünde yoksa, oraya kendiliğinden eklenir.' },
  s7: { route: ['worker', 'dw1'], target: '.calc', title: 'Maaş hesaplama', text: 'Takvimin altındaki Maaş Hesapla bölümünden istediğiniz tarihleri seçersiniz. Program o günlerin toplam ücretini hesaplar. Gün Seç düğmesiyle takvimden tek tek gün de seçebilirsiniz.' },
  s8: { route: ['home'], target: '.dock-item.plus', title: 'Hızlı yevmiye', text: 'Alttaki kırmızı artı düğmesi en hızlı yoldur. Bir günde, bir işte çalışan herkesi tek seferde girersiniz.' },
  s9: { route: ['home'], enter: () => openBulkModal({ jobId: 'dj1' }), target: '.modal', title: 'Toplu giriş', text: 'Bu pencerede çalışılan yeri ve tarihi seçip, o gün gelen işçileri işaretlersiniz. Sistemde kayıtlı olmayan, dışarıdan gelen ustaları da aşağıdaki Kişi Ekle düğmesiyle yazabilirsiniz.' },
  s18: { route: ['advances'], target: '.adv-stats', title: 'Avanslar', text: 'Avans bölümünde işçilere maaştan ayrı verdiğiniz paraları görürsünüz. Kime, ne kadar ve hangi gün verdiğiniz burada ay ay listelenir.' },
  s19: { route: ['advances'], enter: () => openAdvanceModal({ workerId: 'dw1' }), target: '.modal', title: 'Avans verme', text: 'Avans Ver düğmesine dokununca bu pencere açılır. Önce işçiyi seçersiniz, sonra tutarı yazıp Avansı Kaydet düğmesine dokunursunuz. Tarih kendiliğinden bugün olarak gelir.' },
  s20: { route: ['worker', 'dw1'], target: '.adv-calc', title: 'Avans ve maaş', text: 'İşçinin sayfasında, maaş hesabının altında o dönemde verilen avans ve geriye kalan ödenecek para yazar. Böylece işçiye ne kadar daha ödeyeceğinizi hemen görürsünüz.' },
  s10: { route: ['jobs'], target: '.jobs-grid', title: 'İşler', text: 'İşler bölümünde onaylanan işleriniz durur. Her kartta işin türü, yani cam balkon, pergole ya da dış cephe olduğu, konumu ve ücretleri görünür.' },
  s11: { route: ['job', 'dj1'], target: '.stats', title: 'İşin detayı', text: 'Bir işe dokununca; malzeme ücreti, işçilik ücreti, toplam teklif ve işçilere ödenen yevmiye toplamı karşınıza çıkar.' },
  s12: { route: ['job', 'dj1'], target: '#whoCard', title: 'Kimler çalıştı', text: 'Burada, hangi gün o işte kimlerin çalıştığını görürsünüz. Dışarıdan gelen ustalar da burada ayrıca yazar.' },
  s13: { route: ['job', 'dj1'], target: '#photoCard', title: 'Fotoğraflar', text: 'Fotoğraflar bölümünden işe ait resimleri ekleyebilirsiniz. İsterseniz telefonun kamerasıyla hemen çekebilirsiniz. Bir fotoğrafa dokununca büyük olarak açılır.' },
  s14: { route: ['debts'], target: '#debtSummary', title: 'Borç takibi', text: 'Borçlar bölümünde aldığınız borçları ve yaptığınız ödemeleri takip edersiniz. Türk lirası, euro ve dolar ayrı ayrı hesaplanır.' },
  s15: { route: ['person', 'dp1'], target: '#personActions', title: 'Borç ve ödeme', text: 'Bir kişiye dokununca; Borç Aldık düğmesiyle ne için, ne kadar aldığınızı, Ödeme Yaptık düğmesiyle de ne kadar ödediğinizi yazarsınız. Kalan borç kendiliğinden hesaplanır.' },
  s22: { route: ['person', 'dp1'], enter: () => openDebtModal({ kind: 'borrow', personId: 'dp1' }), target: '.due-field', title: 'Ödeme günü', text: 'Borç yazarken ne zaman ödeyeceğinizi de seçebilirsiniz. Bir hafta, bir ay ya da istediğiniz bir tarih. O gün yaklaşınca program sizi uyarır.' },
  s16: { route: ['settings'], target: '.settings-grid > .set-card:nth-child(2)', title: 'Yedek alma', text: 'Ayarlar bölümünden yedek alabilirsiniz. Bilgiler sadece bu telefonda durduğu için, haftada bir yedek alıp WhatsApp ile kendinize göndermenizi öneririm.' },
  s17: { route: ['home'], target: '.dock-item.assist', title: 'Bitti', text: 'Hepsi bu kadar! Tekrar yardım isterseniz, aşağıdaki Asistan düğmesine dokunmanız yeterli. Kolay gelsin!' }
};
const TOUR_TOPICS = [
  { k: 'all', title: 'Programı baştan tanıt', sub: 'Bütün bölümleri sırayla anlatır', icon: 'play', steps: ['s1', 's2', 's3', 's21', 's4', 's5', 's6', 's7', 's8', 's9', 's18', 's19', 's20', 's10', 's11', 's12', 's13', 's14', 's15', 's22', 's16', 's17'], big: true },
  { k: 'gun', title: 'İşçiye gün nasıl girilir?', sub: 'Tam gün, yarım gün ve ücret', icon: 'cal', steps: ['s4', 's5', 's6', 's8', 's9'] },
  { k: 'maas', title: 'Maaş nasıl hesaplanır?', sub: 'Tarih seçip toplamı görme', icon: 'calc', steps: ['s5', 's7', 's20'] },
  { k: 'avans', title: 'Avans nasıl verilir?', sub: 'Kime, ne kadar, hangi gün', icon: 'cash', steps: ['s18', 's19', 's20'] },
  { k: 'is', title: 'İşler ve fotoğraflar', sub: 'İş türü, ücretler, kimler çalıştı', icon: 'brief', steps: ['s10', 's11', 's12', 's13'] },
  { k: 'borc', title: 'Borç takibi ve hatırlatma', sub: 'Borç aldık, ödeme yaptık, vade', icon: 'debt', steps: ['s14', 's15', 's22', 's21'] },
  { k: 'yedek', title: 'Yedek nasıl alınır?', sub: 'Bilgileri kaybetmemek için', icon: 'download', steps: ['s16'] }
];

function makeDemoDB() {
  const n = new Date(); const y = n.getFullYear(), mo = n.getMonth(); const td = n.getDate();
  const d = (day) => ymd(new Date(y, mo, day));
  const workers = [['dw1', 'Ahmet Usta', '0532 000 00 01'], ['dw2', 'Mehmet Kalfa', '0533 000 00 02'], ['dw3', 'Hasan Yılmaz', ''], ['dw4', 'Ali Demir', '']].map(([id, name, phone]) => ({ id, name, phone, note: '' }));
  const jobs = [
    { id: 'dj1', type: 'Cam Balkon', title: 'Kadıköy Cam Balkon', location: 'Caferağa Mah. Moda Cad. Kadıköy / İstanbul', client: 'Yılmaz Apt.', materialCost: 85000, laborCost: 40000, startDate: d(1), status: 'on', photos: [], createdAt: '2' },
    { id: 'dj2', type: 'Pergole', title: 'Beykoz Villa Pergole', location: 'Beykoz / İstanbul', client: 'Kaya Ailesi', materialCost: 120000, laborCost: 55000, startDate: d(1), status: 'on', photos: [], createdAt: '1' },
    { id: 'dj3', type: 'Dış Cephe', title: 'Ümraniye Dış Cephe', location: 'Ümraniye / İstanbul', materialCost: 60000, laborCost: 45000, startDate: d(1), status: 'done', photos: [], createdAt: '0' }
  ];
  const entries = []; let k = 0;
  for (let day = 1; day <= Math.max(td, 12); day++) {
    const dt = new Date(y, mo, day); if (dt.getDay() === 0 || day > 28) continue;
    workers.forEach((w, i) => {
      if ((day + i) % 5 === 0) return; const half = (day + i) % 6 === 0;
      entries.push({ id: 'de' + k++, workerId: w.id, jobId: i % 2 ? 'dj2' : 'dj1', date: d(day), type: half ? 'yarim' : 'tam', amount: half ? 900 : 1800, note: '', updatedAt: String(day) });
    });
    if (day % 3 === 0) entries.push({ id: 'de' + k++, workerId: null, extName: 'Selim Usta', jobId: 'dj1', date: d(day), type: 'tam', amount: 2500, note: '', updatedAt: String(day) });
  }
  const people = [{ id: 'dp1', name: 'Kemal Bey', phone: '0532 000 00 09', note: '' }, { id: 'dp2', name: 'ABC Alüminyum', phone: '', note: 'Toptancı' }];
  const debts = [
    { id: 'dd1', personId: 'dp1', kind: 'borrow', amount: 50000, currency: 'TRY', date: d(2), reason: 'Malzeme alımı', due: ymd(new Date(y, mo, td - 3)) },
    { id: 'dd2', personId: 'dp1', kind: 'pay', amount: 20000, currency: 'TRY', date: d(Math.min(td, 10)), reason: '' },
    { id: 'dd3', personId: 'dp1', kind: 'borrow', amount: 1000, currency: 'USD', date: d(3), reason: 'Profil siparişi', due: ymd(new Date(y, mo, td + 5)) },
    { id: 'dd4', personId: 'dp2', kind: 'borrow', amount: 2000, currency: 'EUR', date: d(4), reason: 'Cam siparişi' },
    { id: 'dd5', personId: 'dp2', kind: 'pay', amount: 500, currency: 'EUR', date: d(Math.min(td, 8)), reason: '' }
  ];
  const advances = [
    { id: 'da1', workerId: 'dw1', amount: 3000, date: d(Math.max(1, td - 9)), note: 'Kira için', createdAt: '1' },
    { id: 'da2', workerId: 'dw1', amount: 2000, date: d(Math.max(1, td - 2)), note: '', createdAt: '2' },
    { id: 'da3', workerId: 'dw2', amount: 5000, date: d(Math.max(1, td - 5)), note: 'Elden verildi', createdAt: '3' },
    { id: 'da4', workerId: 'dw3', amount: 1500, date: d(Math.max(1, td - 1)), note: '', createdAt: '4' }
  ];
  return { version: 1, workers, jobs, entries, people, debts, advances, jobTypes: [], settings: DB.settings };
}

const Assistant = (() => {
  let real = null, steps = [], idx = 0, audio = null, paused = false, timer = null, wordTimer = null, actx = null, analyser = null, raf = null, menuEl = null, tourEl = null, runId = 0;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const voiceUrl = (id) => `assets/voice/${id}.mp3`;
  const vol = () => Math.max(0.5, DB.settings?.volume ?? 0.7);

  function orbHTML(size = 'lg') {
    return `<div class="orb ${size}"><div class="orb-core"></div><div class="orb-ring r1"></div><div class="orb-ring r2"></div><div class="orb-ring r3"></div><div class="orb-bars">${Array.from({ length: 24 }, (_, i) => `<i style="--a:${i * 15}deg"></i>`).join('')}</div></div>`;
  }
  // iPhone: tek bir ses öğesi kullanılır; ilk dokunuşta kilidi açılır
  let el = null;
  function ensureEl() {
    if (el) return el;
    el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
    if (!isIOS()) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); analyser = actx.createAnalyser(); analyser.fftSize = 128; analyser.connect(actx.destination); actx.createMediaElementSource(el).connect(analyser); }
      catch (e) { analyser = null; }
    }
    return el;
  }
  function unlockVoice() {
    const a = ensureEl(); if (actx && actx.state === 'suspended') actx.resume();
    if (a.dataset.unlocked) return; a.dataset.unlocked = '1';
    try { a.muted = true; a.src = voiceUrl('a0'); const p = a.play(); if (p) p.then(() => { if (a.muted) { a.pause(); } }).catch(() => {}); } catch (e) {}
  }
  function stopAudio() {
    clearTimeout(timer); clearInterval(wordTimer); cancelAnimationFrame(raf);
    if (audio) { audio.onended = null; audio.ontimeupdate = null; audio.onerror = null; audio.pause(); audio = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    document.querySelectorAll('.orb').forEach((o) => o.classList.remove('talking'));
  }
  function visualize(root) {
    const bars = root ? [...root.querySelectorAll('.orb-bars i')] : [];
    const core = root?.querySelector('.orb-core');
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const loop = () => {
      let lvl = 0;
      if (analyser && data) { analyser.getByteFrequencyData(data); for (let i = 0; i < 32; i++) lvl += data[i]; lvl /= 32 * 255; }
      const playing = audio && !audio.paused;
      if (playing && lvl < 0.01) lvl = 0.25 + Math.random() * 0.35; // analiz yoksa yapay dalga
      if (!playing) lvl = 0;
      bars.forEach((b, i) => { const v = analyser && data && data[i * 2] ? data[i * 2] / 255 : lvl * (0.5 + Math.random() * 0.8); b.style.transform = `rotate(${i * 15}deg) translateY(calc(-1 * var(--rad))) scaleY(${0.25 + v * 2.2})`; });
      if (core) core.style.transform = `scale(${1 + lvl * 0.18})`;
      raf = requestAnimationFrame(loop);
    };
    cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  }
  // Ses çalar; metindeki kelimeleri sırayla vurgular
  function speak(id, textEl, root) {
    return new Promise((resolve) => {
      stopAudio();
      const text = TOUR_STEPS[id].text;
      if (textEl) textEl.innerHTML = text.split(' ').map((w) => `<span>${esc(w)}</span>`).join(' ');
      const words = textEl ? [...textEl.querySelectorAll('span')] : [];
      const hl = (p) => { const n = Math.floor(p * words.length + 0.3); words.forEach((w, i) => w.classList.toggle('said', i < n)); };
      root?.querySelector('.orb')?.classList.add('talking');
      const done = () => { hl(1); root?.querySelector('.orb')?.classList.remove('talking'); resolve(); };
      const fallback = () => {
        const dur = Math.max(2500, text.length * 65); const t0 = Date.now();
        wordTimer = setInterval(() => hl((Date.now() - t0) / dur), 80);
        if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'tr-TR'; u.rate = 0.95; speechSynthesis.speak(u); } catch (e) {} }
        timer = setTimeout(() => { clearInterval(wordTimer); done(); }, dur);
      };
      audio = ensureEl(); audio.muted = false; audio.src = voiceUrl(id); audio.currentTime = 0; audio.volume = Math.min(1, vol());
      audio.ontimeupdate = () => { if (audio && audio.duration) hl(audio.currentTime / audio.duration); };
      audio.onended = () => { clearInterval(wordTimer); done(); };
      audio.onerror = () => { if (audio) { audio.onended = null; audio = null; fallback(); } };
      if (actx && actx.state === 'suspended') actx.resume();
      const pr = audio.play(); if (pr) pr.catch(() => { if (audio) { audio.onended = null; audio.onerror = null; audio = null; fallback(); } });
      visualize(root);
    });
  }

  /* ---- Menü ---- */
  function openMenu() {
    if (menuEl || tourEl) return;
    unlockVoice();
    Sound.play('open');
    menuEl = document.createElement('div'); menuEl.className = 'assist-menu';
    menuEl.innerHTML = `<button class="icon-btn am-close" data-x>${I.close}</button>
      <div class="am-inner">
        ${orbHTML('lg')}
        <h2>Merhaba, ben <b>ATIG Asistan</b></h2>
        <p class="am-text" id="amText"></p>
        <div class="am-topics">${TOUR_TOPICS.map((t, i) => `<button class="am-topic ${t.big ? 'big' : ''}" data-t="${t.k}" style="--i:${i}"><div class="am-ic">${I[t.icon]}</div><div><b>${t.title}</b><span>${t.sub} · ${t.steps.length} adım</span></div>${I.right}</button>`).join('')}</div>
        <button class="btn ghost am-replay" data-r>${I.sound} Tekrar dinle</button>
      </div>`;
    document.body.appendChild(menuEl);
    requestAnimationFrame(() => menuEl.classList.add('show'));
    const close = () => { stopAudio(); Sound.play('close'); menuEl.classList.remove('show'); menuEl.classList.add('hide'); const m = menuEl; menuEl = null; setTimeout(() => m.remove(), 400); document.removeEventListener('keydown', key); };
    const key = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', key);
    menuEl.querySelector('[data-x]').onclick = close;
    menuEl.querySelector('[data-r]').onclick = () => speak('a0', menuEl.querySelector('#amText'), menuEl);
    menuEl.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { const t = TOUR_TOPICS.find((x) => x.k === b.dataset.t); stopAudio(); document.removeEventListener('keydown', key); const m = menuEl; menuEl = null; m.classList.add('hide'); setTimeout(() => m.remove(), 400); start(t.steps); }));
    setTimeout(() => menuEl && speak('a0', menuEl.querySelector('#amText'), menuEl), 500);
  }

  /* ---- Tanıtım turu ---- */
  function start(list) {
    steps = list; idx = 0; paused = false;
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; storage.save(DB); }
    real = DB; DB = makeDemoDB(); window.TOUR_ACTIVE = true; ui.cal = {}; ui.calc = {};
    tourEl = document.createElement('div'); tourEl.className = 'tour';
    tourEl.innerHTML = `<div class="tour-block"></div><div class="tour-spot"></div>
      <div class="tour-card">
        <div class="tc-left">${orbHTML('sm')}</div>
        <div class="tc-main"><div class="tc-top"><span class="tc-step"></span><span class="tc-demo">Örnek bilgiler gösteriliyor</span></div><h3 class="tc-title"></h3><p class="tc-text"></p>
          <div class="tc-dots"></div>
          <div class="tc-ctrl"><button class="btn sm ghost" data-prev>${I.left} Geri</button><button class="btn sm" data-pause>${I.pause} Duraklat</button><button class="btn sm primary" data-next>İleri ${I.right}</button><span style="flex:1"></span><button class="btn sm ghost danger" data-end>${I.close} Bitir</button></div>
        </div>
      </div>`;
    document.body.appendChild(tourEl);
    requestAnimationFrame(() => tourEl.classList.add('show'));
    tourEl.querySelector('[data-prev]').onclick = () => { if (idx > 0) { idx--; run(); } };
    tourEl.querySelector('[data-next]').onclick = () => next();
    tourEl.querySelector('[data-end]').onclick = () => end();
    tourEl.querySelector('[data-pause]').onclick = (e) => {
      const b = e.currentTarget; paused = !paused;
      if (paused) { if (audio) audio.pause(); if (window.speechSynthesis) speechSynthesis.pause(); b.innerHTML = `${I.play} Devam`; }
      else { if (audio) audio.play(); else if (window.speechSynthesis) speechSynthesis.resume(); b.innerHTML = `${I.pause} Duraklat`; }
    };
    document.addEventListener('keydown', tourKey, true);
    run();
  }
  function tourKey(e) {
    if (!tourEl) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); end(); }
    if (e.key === 'ArrowRight') { e.stopPropagation(); next(); }
    if (e.key === 'ArrowLeft') { e.stopPropagation(); if (idx > 0) { idx--; run(); } }
  }
  function next() { if (idx < steps.length - 1) { idx++; run(); } else end(); }
  function closeModals() { document.querySelectorAll('#modalRoot .backdrop').forEach((b) => b.remove()); }
  function placeSpot(el) {
    const spot = tourEl.querySelector('.tour-spot'); const card = tourEl.querySelector('.tour-card');
    if (!el) { spot.style.cssText = `top:50%;left:50%;width:0;height:0;`; spot.classList.add('none'); card.classList.remove('top'); return; }
    spot.classList.remove('none');
    const r = el.getBoundingClientRect(); const pad = 10;
    const top = Math.max(innerWidth < 760 ? 6 : 40, r.top - pad), left = Math.max(6, r.left - pad);
    const w = Math.min(innerWidth - left - 6, r.width + pad * 2), h = Math.min(innerHeight - top - 6, r.height + pad * 2);
    spot.style.cssText = `top:${top}px;left:${left}px;width:${w}px;height:${h}px;`;
    // kart, işaretlenen alanın üstünü kapatmasın
    const mob = innerWidth < 760; const cardH = mob ? card.offsetHeight + 30 : 230; const below = innerHeight - (top + h);
    card.classList.toggle('top', below < cardH && (mob || top > cardH));
    card.classList.toggle('side', !mob && below < cardH && top <= cardH);
  }
  async function run() {
    const my = ++runId; stopAudio();
    const id = steps[idx]; const st = TOUR_STEPS[id];
    const card = tourEl.querySelector('.tour-card');
    card.classList.remove('in'); void card.offsetWidth;
    tourEl.querySelector('.tc-step').textContent = `Adım ${idx + 1} / ${steps.length}`;
    tourEl.querySelector('.tc-title').textContent = st.title;
    tourEl.querySelector('.tc-dots').innerHTML = steps.map((_, i) => `<i class="${i < idx ? 'done' : i === idx ? 'cur' : ''}"></i>`).join('');
    tourEl.querySelector('[data-prev]').disabled = idx === 0;
    tourEl.querySelector('[data-next]').innerHTML = idx === steps.length - 1 ? `Bitir ${I.check}` : `İleri ${I.right}`;
    paused = false; tourEl.querySelector('[data-pause]').innerHTML = `${I.pause} Duraklat`;
    closeModals();
    const [rn, rid = null] = st.route;
    if (route.name !== rn || route.id !== rid) { go(rn, rid); await wait(520); }
    if (my !== runId) return;
    if (st.enter) { st.enter(); await wait(480); }
    if (my !== runId) return;
    const el = st.target ? document.querySelector(st.target) : null;
    if (el && !st.target.includes('dock') && !st.target.includes('modal')) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); await wait(450); }
    if (my !== runId) return;
    placeSpot(el); Sound.play('tick');
    card.classList.add('in');
    await speak(id, tourEl.querySelector('.tc-text'), tourEl);
    if (my !== runId || !tourEl) return;
    timer = setTimeout(() => { if (my === runId && !paused) next(); }, 900);
  }
  function end() {
    runId++; stopAudio(); closeModals();
    document.removeEventListener('keydown', tourKey, true);
    if (real) { DB = real; real = null; }
    window.TOUR_ACTIVE = false; ui.cal = {}; ui.calc = {}; ui.prev = {};
    if (tourEl) { const t = tourEl; tourEl = null; t.classList.remove('show'); t.classList.add('hide'); setTimeout(() => t.remove(), 450); }
    Sound.play('success');
    route = { name: '__', id: null }; go('home');
  }
  window.addEventListener('resize', () => { if (tourEl) { const st = TOUR_STEPS[steps[idx]]; placeSpot(st.target ? document.querySelector(st.target) : null); } });
  return { openMenu, start, end, unlockVoice };
})();

boot();
