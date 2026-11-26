'use strict';
/* ============ Avanslar (maaştan ayrı verilen ödemeler) ============ */
const advOf = (fn = () => true) => (DB.advances || []).filter(fn);
const advSort = (a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || ''));

function advPeriod() {
  const st = ui.adv || (ui.adv = { y: new Date().getFullYear(), m: new Date().getMonth(), all: false, w: '' });
  const from = `${st.y}-${pad(st.m + 1)}-01`; const to = ymd(new Date(st.y, st.m + 1, 0));
  return { st, from, to };
}
function renderAdvances() {
  const { st, from, to } = advPeriod();
  const inP = (a) => st.all || (a.date >= from && a.date <= to);
  const list = advOf((a) => inP(a) && (!st.w || a.workerId === st.w)).sort(advSort);
  const periodAll = advOf(inP);
  const [ms, me] = monthRange(0);
  const thisMonth = advOf((a) => a.date >= ms && a.date <= me);
  const byW = {}; periodAll.forEach((a) => { (byW[a.workerId] = byW[a.workerId] || []).push(a); });
  const wl = Object.keys(byW).map((id) => ({ w: worker(id), id, n: byW[id].length, t: sum(byW[id]) })).filter((x) => x.w).sort((a, b) => b.t - a.t);
  const label = st.all ? 'Tüm zamanlar' : `${MONTHS[st.m]} ${st.y}`;
  // tarihe göre grupla
  const groups = []; list.forEach((a) => { const g = groups[groups.length - 1]; if (g && g.date === a.date) g.items.push(a); else groups.push({ date: a.date, items: [a] }); });
  return `
  <div class="page-head"><div><h1>Avanslar</h1><p>İşçilere maaştan ayrı verilen avanslar · Kime, ne kadar, hangi tarihte</p></div>
  <button class="btn amber" data-act="adv-new">${I.cash} Avans Ver</button></div>
  <div class="stagger">
    <div class="grid stats adv-stats">
      <div class="card stat accent-amber" style="--i:0"><div class="lbl">${I.cash} ${MONTHS[new Date().getMonth()]} Ayı Avans</div><div class="val tnum" data-count="${sum(thisMonth)}" data-money="1">0</div><div class="sub">${thisMonth.length} avans verildi</div></div>
      <div class="card stat" style="--i:1"><div class="lbl">${I.users} Bu Ay Avans Alan</div><div class="val tnum" data-count="${new Set(thisMonth.map((a) => a.workerId)).size}">0</div><div class="sub">işçi</div></div>
      <div class="card stat" style="--i:2"><div class="lbl">${I.wallet} Toplam Verilen</div><div class="val tnum" data-count="${sum(advOf())}" data-money="1">0</div><div class="sub">tüm zamanlar · ${advOf().length} avans</div></div>
    </div>
    ${!(DB.advances || []).length ? `<div class="card" style="--i:3">${emptyState(I.cash, 'Henüz avans verilmedi', DB.workers.length ? 'Bir işçiye avans verdiğinizde buraya yazın. Kime, ne kadar ve hangi gün verdiğiniz burada görünür.' : 'Avans verebilmek için önce İşçiler bölümünden işçi ekleyin.', DB.workers.length ? `<button class="btn amber" data-act="adv-new">${I.plus} İlk Avansı Gir</button>` : `<button class="btn primary" data-go="workers">${I.users} İşçilere Git</button>`)}</div>` : `
    <div class="card adv-bar" style="--i:3">
      <div class="adv-month"><button class="icon-btn" data-advm="-1" ${st.all ? 'disabled' : ''}>${I.left}</button><b>${label}</b><button class="icon-btn" data-advm="1" ${st.all ? 'disabled' : ''}>${I.right}</button></div>
      <div class="seg"><button class="${!st.all ? 'on' : ''}" data-advall="0">Aylık</button><button class="${st.all ? 'on' : ''}" data-advall="1">Tümü</button></div>
    </div>
    <div class="home-grid adv-grid">
      <div class="card" style="--i:4"><h2 class="sec">İşçi Bazında <small>${label}</small></h2>
        ${wl.length ? `<div class="list">${st.w ? `<button class="chip on" data-advw="" style="margin-bottom:8px">${I.close.replace('<svg', '<svg width="12" height="12"')} Filtreyi kaldır</button>` : ''}${wl.map((x) => `<div class="li advw ${st.w === x.id ? 'sel' : ''}" data-advw="${x.id}"><div class="avatar" style="width:38px;height:38px;border-radius:11px;font-size:12px">${esc(initials(x.w.name))}</div><div class="grow"><div class="t1">${esc(x.w.name)}</div><div class="t2">${x.n} avans</div></div><div class="amt tnum amber">${money(x.t)}</div></div>`).join('')}</div>` : '<p class="kbd">Bu dönemde avans yok.</p>'}
      </div>
      <div class="card" style="--i:5"><h2 class="sec">Avans Hareketleri <small>${list.length} kayıt${st.w && worker(st.w) ? ' · ' + esc(worker(st.w).name) : ''}</small><span style="margin-left:auto" class="amt tnum amber">${money(sum(list))}</span></h2>
        ${groups.length ? groups.map((g) => `<div class="adv-day"><div class="adv-date">${fmtDate(g.date)}</div><div class="list">${g.items.map((a) => advRow(a, true)).join('')}</div></div>`).join('') : '<p class="kbd">Bu dönemde avans yok.</p>'}
      </div>
    </div>`}
  </div>`;
}
function advRow(a, showWorker = false) {
  const w = worker(a.workerId);
  return `<div class="li">
    <div class="dk adv">${I.cash}</div>
    <div class="grow"><div class="t1">${showWorker ? esc(w?.name || 'Silinmiş işçi') : fmtDate(a.date)}</div><div class="t2">${showWorker ? '' : ''}${a.note ? esc(a.note) : showWorker ? 'Avans' : 'Not yok'}</div></div>
    <div class="amt tnum amber">${money(a.amount)}</div>
    <button class="icon-btn" data-adved="${a.id}" title="Düzenle">${I.edit}</button><button class="icon-btn danger" data-advdel="${a.id}" title="Sil">${I.trash}</button>
  </div>`;
}
function advRangeFor(cs, wid) {
  if (cs.mode === 'range') return [cs.from || '0000-00-00', cs.to || '9999-12-31'];
  const ds = [...cs.sel].sort(); return ds.length ? [ds[0], ds[ds.length - 1]] : null;
}
function advCalcBlock(wid, cs, earned) {
  const r = advRangeFor(cs, wid); if (!r) return '';
  const list = advOf((a) => a.workerId === wid && a.date >= r[0] && a.date <= r[1]);
  const t = sum(list); const net = earned - t;
  return `<div class="adv-calc">
    <div><span>${I.cash.replace('<svg', '<svg width="14" height="14"')} Bu dönemde verilen avans <em>${list.length} adet</em></span><b class="tnum amber">−${money(t)}</b></div>
    <div class="net"><span>Kalan ödenecek</span><b class="tnum ${net < 0 ? 'neg' : ''}" data-key="net_${wid}" data-count="${net}" data-money="1">${money(net)}</b></div>
    ${net < 0 ? '<p class="kbd" style="color:var(--amber)">Verilen avans, bu dönemin kazancından fazla.</p>' : ''}
  </div>`;
}
function workerAdvCard(wid) {
  const list = advOf((a) => a.workerId === wid).sort(advSort);
  return `<div class="card" style="--i:3"><h2 class="sec">${I.cash.replace('<svg', '<svg width="18" height="18"')} Avanslar <small>${list.length} avans · ${money(sum(list))}</small><span style="margin-left:auto"></span><button class="btn sm amber" data-act="adv-worker">${I.plus} Avans Ver</button></h2>
    ${list.length ? `<div class="list scroll" style="max-height:320px">${list.map((a) => advRow(a)).join('')}</div>` : '<p class="kbd" style="padding:6px 0">Bu işçiye henüz avans verilmedi.</p>'}</div>`;
}

function openAdvanceModal({ workerId = null, editId = null } = {}) {
  const ed = editId ? (DB.advances || []).find((a) => a.id === editId) : null;
  if (ed) workerId = ed.workerId;
  if (!DB.workers.length) { toast('Önce işçi eklemelisiniz', true); go('workers'); return; }
  let wid = workerId;
  const ws = [...DB.workers].sort((a, b) => sortTr(a.name, b.name));
  const last = (id) => advOf((a) => a.workerId === id).sort(advSort)[0];
  modal({
    title: ed ? 'Avansı Düzenle' : 'Avans Ver', sub: 'Maaştan ayrı olarak verilen para',
    body: `<div class="field"><label>Kime verildi? <em>*</em></label><div class="adv-wpick" id="aW">${ws.map((w) => `<button class="awc ${w.id === wid ? 'on' : ''}" data-w="${w.id}"><span class="avatar">${esc(initials(w.name))}</span><b>${esc(w.name)}</b></button>`).join('')}</div></div>
      <div class="field"><label>Tutar <em>*</em></label><div class="money-inp"><input class="inp tnum big-inp" id="aAmt" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${ed?.amount ?? ''}" /><span>₺</span></div>
        <div class="chips" style="margin-top:8px">${[500, 1000, 2000, 5000].map((n) => `<button class="chip" data-q="${n}">${money(n)}</button>`).join('')}</div></div>
      <div class="frow"><div class="field"><label>Tarih</label><input type="date" class="inp" id="aDate" value="${ed?.date || today()}" /></div>
      <div class="field"><label>Not</label><input class="inp" id="aNote" value="${esc(ed?.note || '')}" placeholder="Örn. Kira için, elden verildi" /></div></div>
      <p class="kbd" id="aLast"></p>`,
    foot: `${ed ? `<button class="btn ghost danger" data-del style="margin-right:auto">${I.trash} Sil</button>` : ''}<button class="btn ghost" data-c>Vazgeç</button><button class="btn amber" data-ok>${ed ? 'Güncelle' : 'Avansı Kaydet'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      const showLast = () => { const l = wid && last(wid); $('#aLast', m).textContent = l && (!ed || l.id !== ed.id) ? `Son avans: ${fmtDate(l.date, false)} · ${money(l.amount)}` : ''; };
      $$('.awc', m).forEach((b) => (b.onclick = () => { Sound.play('select'); wid = b.dataset.w; $$('.awc', m).forEach((x) => x.classList.toggle('on', x === b)); $('#aW', m).classList.remove('err'); showLast(); }));
      $$('[data-q]', m).forEach((b) => (b.onclick = () => { Sound.play('tick'); $('#aAmt', m).value = b.dataset.q; }));
      showLast();
      const onSel = $('.awc.on', m); if (onSel) setTimeout(() => onSel.scrollIntoView({ block: 'nearest', inline: 'center' }), 50);
      if (ed) $('[data-del]', m).onclick = async () => { close(true); if (await confirmBox('Avansı sil', 'Bu avans kaydı silinecek. Emin misiniz?')) { DB.advances = DB.advances.filter((a) => a.id !== ed.id); persist(); toast('Avans silindi', false, 'del'); refresh(); } };
      $('[data-ok]', m).onclick = () => {
        if (!wid) { const p = $('#aW', m); p.classList.remove('err'); void p.offsetWidth; p.classList.add('err'); Sound.play('error'); toast('Avansın kime verildiğini seçin', true, 'none'); return; }
        const a = $('#aAmt', m); if (a.value === '' || num(a.value) <= 0) { shakeErr(a); return; }
        const data = { workerId: wid, amount: num(a.value), date: $('#aDate', m).value || today(), note: $('#aNote', m).value.trim() };
        if (ed) Object.assign(ed, data); else DB.advances.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
        persist(); close(true); toast(ed ? 'Avans güncellendi' : `${worker(wid).name}: ${money(data.amount)} avans kaydedildi`);
        refresh(); burst(innerWidth / 2, 160, 20);
      };
    }
  });
}
function bindAdvances(v) {
  $$('[data-adved]', v).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); openAdvanceModal({ editId: b.dataset.adved }); }));
  $$('[data-advdel]', v).forEach((b) => (b.onclick = async (e) => {
    e.stopPropagation();
    if (await confirmBox('Avansı sil', 'Bu avans kaydı silinecek. Emin misiniz?')) { DB.advances = DB.advances.filter((a) => a.id !== b.dataset.advdel); persist(); toast('Avans silindi', false, 'del'); refresh(); }
  }));
  if (route.name !== 'advances') return;
  const { st } = advPeriod();
  $$('[data-advm]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); const d = new Date(st.y, st.m + +b.dataset.advm, 1); st.y = d.getFullYear(); st.m = d.getMonth(); refresh(); }));
  $$('[data-advall]', v).forEach((b) => (b.onclick = () => { Sound.play('tick'); st.all = b.dataset.advall === '1'; refresh(); }));
  $$('[data-advw]', v).forEach((b) => (b.onclick = () => { Sound.play('select'); st.w = st.w === b.dataset.advw ? '' : b.dataset.advw; refresh(); }));
}
async function advAction(a) {
  switch (a) {
    case 'adv-new': openAdvanceModal({ workerId: route.name === 'advances' ? ui.adv?.w || null : null }); return true;
    case 'adv-worker': openAdvanceModal({ workerId: route.id }); return true;
  }
  return false;
}
