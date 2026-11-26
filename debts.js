'use strict';
/* ============ Borç Takibi ============ */
const CUR = { TRY: { s: '₺', l: 'TL', name: 'Türk Lirası' }, EUR: { s: '€', l: 'EURO', name: 'Euro' }, USD: { s: '$', l: 'DOLAR', name: 'Dolar' } };
const CURS = ['TRY', 'EUR', 'USD'];
const moneyC = (n, c = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: c, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(+n || 0);
const person = (id) => (DB.people || []).find((p) => p.id === id);

function balances(personId = null) {
  const b = {}; CURS.forEach((c) => (b[c] = { borrow: 0, pay: 0, left: 0 }));
  (DB.debts || []).filter((d) => !personId || d.personId === personId).forEach((d) => {
    const x = b[d.currency] || (b[d.currency] = { borrow: 0, pay: 0, left: 0 });
    x[d.kind] += +d.amount || 0;
  });
  Object.values(b).forEach((x) => (x.left = x.borrow - x.pay));
  return b;
}
function leftChips(b) {
  const parts = CURS.filter((c) => b[c].borrow || b[c].pay).map((c) => {
    const l = b[c].left;
    return `<span class="cchip ${l > 0 ? 'owe' : l < 0 ? 'over' : 'zero'}"><em>${CUR[c].l}</em>${moneyC(Math.abs(l), c)}${l < 0 ? ' fazla' : ''}</span>`;
  });
  return parts.length ? parts.join('') : '<span class="kbd">Henüz hareket yok</span>';
}

function renderDebts() {
  const all = balances();
  const people = [...(DB.people || [])].map((p) => ({ p, b: balances(p.id) }))
    .sort((a, b) => sortTr(a.p.name, b.p.name));
  const q = (ui.dSearch || '').toLocaleLowerCase('tr-TR');
  const list = people.filter((x) => x.p.name.toLocaleLowerCase('tr-TR').includes(q));
  const recent = [...(DB.debts || [])].sort((a, b) => (b.date + (b.createdAt || '')).localeCompare(a.date + (a.createdAt || ''))).slice(0, 10);
  return `
  <div class="page-head"><div><h1>Borç Takibi</h1><p>Aldığımız borçlar ve yaptığımız ödemeler · TL, Euro ve Dolar ayrı hesaplanır</p></div>
  <div style="display:flex;gap:8px"><button class="btn" data-act="debt-pay">${I.check} Ödeme Yaptık</button><button class="btn red" data-act="debt-borrow">${I.plus} Borç Aldık</button><button class="btn primary" data-act="add-person">${I.person} Kişi Ekle</button></div></div>
  <div class="stagger">
    <div class="grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px" id="debtSummary">
      ${CURS.map((c, i) => `<div class="card stat ${all[c].left > 0 ? 'accent' : ''}" style="--i:${i}"><div class="lbl"><span class="cur-badge">${CUR[c].s}</span> Kalan Borç · ${CUR[c].name}</div>
        <div class="val tnum" data-count="${Math.abs(all[c].left)}" data-cur="${c}">0</div>
        <div class="sub">Alınan ${moneyC(all[c].borrow, c)} · Ödenen ${moneyC(all[c].pay, c)}</div></div>`).join('')}
    </div>
    ${!people.length ? `<div class="card" style="--i:3">${emptyState(I.person, 'Henüz kişi eklenmedi', 'Borç aldığınız veya ödeme yaptığınız kişiyi ekleyerek başlayın.', `<button class="btn primary" data-act="add-person">${I.plus} Kişi Ekle</button>`)}</div>` : `
    <div class="home-grid" style="margin-top:0">
      <div class="card" style="--i:3">
        <h2 class="sec">Kişiler <small>${people.length} kişi</small><span style="margin-left:auto"></span><div class="search" style="max-width:220px">${I.search}<input id="dSearch" placeholder="Kişi ara..." value="${esc(ui.dSearch || '')}" style="height:34px" /></div></h2>
        <div class="list">${list.map((x) => `<div class="li pli" data-person="${x.p.id}"><div class="avatar" style="width:40px;height:40px;border-radius:12px;font-size:13px">${esc(initials(x.p.name))}</div>
          <div class="grow"><div class="t1">${esc(x.p.name)}</div><div class="t2">${esc(x.p.phone || '')}${x.p.note ? ' · ' + esc(x.p.note) : ''}</div></div><div class="cchips">${leftChips(x.b)}</div>${I.right.replace('<svg', '<svg width="16" height="16" style="color:var(--tx3)"')}</div>`).join('') || '<p class="kbd">Eşleşen kişi yok.</p>'}</div>
      </div>
      <div class="card" style="--i:4"><h2 class="sec">Son Hareketler</h2>
        ${recent.length ? `<div class="list scroll" style="max-height:460px">${recent.map((d) => debtRow(d, true)).join('')}</div>` : '<p class="kbd">Henüz hareket yok.</p>'}
      </div>
    </div>`}
  </div>`;
}
function debtRow(d, showPerson = false) {
  const p = person(d.personId);
  return `<div class="li">
    <div class="dk ${d.kind}">${d.kind === 'borrow' ? I.plus : I.check}</div>
    <div class="grow"><div class="t1">${showPerson ? esc(p?.name || 'Silinmiş kişi') + ' · ' : ''}${d.kind === 'borrow' ? 'Borç aldık' : 'Ödeme yaptık'}</div>
    <div class="t2">${fmtDate(d.date, false)}${d.reason ? ' · ' + esc(d.reason) : ''}</div>${d.kind === 'borrow' && d.due ? duePill(d) : ''}</div>
    <div class="amt tnum ${d.kind === 'borrow' ? 'neg' : 'pos'}">${d.kind === 'borrow' ? '+' : '−'}${moneyC(d.amount, d.currency)}</div>
    ${!showPerson ? `<button class="icon-btn" data-ded="${d.id}" title="Düzenle">${I.edit}</button><button class="icon-btn danger" data-ddel="${d.id}" title="Sil">${I.trash}</button>` : ''}
  </div>`;
}
function renderPerson() {
  const p = person(route.id); const b = balances(p.id);
  const ds = (DB.debts || []).filter((d) => d.personId === p.id).sort((a, c) => (c.date + (c.createdAt || '')).localeCompare(a.date + (a.createdAt || '')));
  const borrows = ds.filter((d) => d.kind === 'borrow'), pays = ds.filter((d) => d.kind === 'pay');
  const used = CURS.filter((c) => b[c].borrow || b[c].pay);
  return `
  <button class="crumb" data-go="debts">${I.back} Borçlar</button>
  <div class="page-head" style="margin-top:4px">
    <div class="whead"><div class="avatar lg">${esc(initials(p.name))}</div><div><h1>${esc(p.name)}</h1><p>${esc(p.phone || 'Telefon yok')}${p.note ? ' · ' + esc(p.note) : ''}</p></div></div>
    <div style="display:flex;gap:8px" id="personActions"><button class="btn red" data-act="debt-borrow">${I.plus} Borç Aldık</button><button class="btn" style="border-color:rgba(61,220,132,.4)" data-act="debt-pay">${I.check} Ödeme Yaptık</button><button class="icon-btn" data-act="edit-person" title="Düzenle">${I.edit}</button><button class="icon-btn danger" data-act="del-person" title="Sil">${I.trash}</button></div>
  </div>
  <div class="stagger">
    <div class="grid" style="grid-template-columns:repeat(${Math.max(used.length, 1)},1fr);margin-bottom:16px">
      ${used.length ? used.map((c, i) => `<div class="card stat ${b[c].left > 0 ? 'accent' : ''}" style="--i:${i}"><div class="lbl"><span class="cur-badge">${CUR[c].s}</span> ${b[c].left >= 0 ? 'Kalan borcumuz' : 'Fazla ödedik'} · ${CUR[c].name}</div>
        <div class="val tnum" data-count="${Math.abs(b[c].left)}" data-cur="${c}">0</div>
        <div class="progress"><i style="width:${b[c].borrow ? Math.min(100, (b[c].pay / b[c].borrow) * 100) : 100}%"></i></div>
        <div class="sub">Alınan ${moneyC(b[c].borrow, c)} · Ödenen ${moneyC(b[c].pay, c)}</div></div>`).join('')
      : `<div class="card" style="--i:0"><p class="kbd">Bu kişiyle henüz bir hareket yok. Yukarıdaki düğmelerle borç veya ödeme ekleyin.</p></div>`}
    </div>
    <div class="home-grid" style="margin-top:0;grid-template-columns:1fr 1fr">
      <div class="card" style="--i:3"><h2 class="sec"><span class="dk borrow sm">${I.plus}</span> Aldığımız Borçlar <small>${borrows.length}</small></h2>${borrows.length ? `<div class="list">${borrows.map((d) => debtRow(d)).join('')}</div>` : '<p class="kbd">Kayıt yok.</p>'}</div>
      <div class="card" style="--i:4"><h2 class="sec"><span class="dk pay sm">${I.check}</span> Yaptığımız Ödemeler <small>${pays.length}</small></h2>${pays.length ? `<div class="list">${pays.map((d) => debtRow(d)).join('')}</div>` : '<p class="kbd">Kayıt yok.</p>'}</div>
    </div>
  </div>`;
}

function openPersonModal(id = null, after) {
  const p = id ? person(id) : null;
  modal({
    title: p ? 'Kişiyi Düzenle' : 'Kişi Ekle',
    body: `<div class="field"><label>Adı Soyadı <em>*</em></label><input class="inp" id="pName" value="${esc(p?.name || '')}" placeholder="Örn. Mehmet Usta, ABC Cam Ltd." /></div>
      <div class="field"><label>Telefon</label><input class="inp" id="pPhone" value="${esc(p?.phone || '')}" placeholder="İsteğe bağlı" /></div>
      <div class="field"><label>Not</label><input class="inp" id="pNote" value="${esc(p?.note || '')}" placeholder="İsteğe bağlı" /></div>`,
    foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn primary" data-ok>${p ? 'Kaydet' : 'Kişiyi Ekle'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      const save = () => {
        const name = req(m, '#pName'); if (!name) return;
        if (DB.people.find((x) => x.id !== id && norm(x.name) === norm(name))) { shakeErr($('#pName', m)); toast('Bu isimde bir kişi zaten var', true, 'none'); return; }
        const data = { name, phone: $('#pPhone', m).value.trim(), note: $('#pNote', m).value.trim() };
        let nid = id;
        if (p) Object.assign(p, data); else { nid = uid(); DB.people.push({ id: nid, createdAt: new Date().toISOString(), ...data }); }
        persist(); close(true); toast(p ? 'Kişi güncellendi' : 'Kişi eklendi');
        if (after) after(nid); else refresh();
      };
      $('[data-ok]', m).onclick = save; $('#pName', m).onkeydown = (e) => { if (e.key === 'Enter') save(); };
    }
  });
}

function openDebtModal({ kind = 'borrow', personId = null, editId = null } = {}) {
  const ed = editId ? DB.debts.find((d) => d.id === editId) : null;
  if (ed) { kind = ed.kind; personId = ed.personId; }
  let cur = ed?.currency || 'TRY';
  const lastCur = DB.debts.filter((d) => d.personId === personId).slice(-1)[0]?.currency; if (!ed && lastCur) cur = lastCur;
  const peopleOpts = () => [...DB.people].sort((a, b) => sortTr(a.name, b.name)).map((p) => `<option value="${p.id}" ${p.id === personId ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
  modal({
    title: ed ? 'Kaydı Düzenle' : kind === 'borrow' ? 'Borç Aldık' : 'Ödeme Yaptık',
    sub: kind === 'borrow' ? 'Kimden, ne için, ne kadar borç aldınız?' : 'Kime, ne kadar ödeme yaptınız?',
    body: `<div class="typeSeg kindSeg" style="margin-bottom:14px"><button data-k="borrow" class="${kind === 'borrow' ? 'on' : ''}"><i></i>Borç Aldık</button><button data-k="pay" class="p ${kind === 'pay' ? 'on' : ''}"><i></i>Ödeme Yaptık</button></div>
      <div class="field"><label>Kişi <em>*</em></label><div style="display:flex;gap:8px"><select class="inp" id="dPerson">${DB.people.length ? '' : '<option value="">Önce kişi ekleyin</option>'}${peopleOpts()}</select><button class="btn" data-newp title="Yeni kişi">${I.plus} Yeni Kişi</button></div></div>
      <div class="field"><label>Tutar <em>*</em></label><div class="money-inp"><input class="inp tnum" id="dAmt" type="number" min="0" step="any" placeholder="0" value="${ed?.amount ?? ''}" /><span id="dSym">${CUR[cur].s}</span></div></div>
      <div class="field"><label>Para cinsi</label><div class="curSeg">${CURS.map((c) => `<button data-c="${c}" class="${c === cur ? 'on' : ''}"><b>${CUR[c].s}</b>${CUR[c].l}</button>`).join('')}</div></div>
      <div class="field due-field ${kind === 'borrow' ? '' : 'hidden'}"><label>${I.bell.replace('<svg', '<svg width="13" height="13" style="vertical-align:-2px"')} Ne zaman ödeyeceğiz? <span class="kbd">(isteğe bağlı, hatırlatma için)</span></label>
        <div class="chips due-chips"><button class="chip" data-due="0">Tarih yok</button><button class="chip" data-due="7">1 hafta sonra</button><button class="chip" data-due="30">1 ay sonra</button><button class="chip" data-due="90">3 ay sonra</button></div>
        <input type="date" class="inp" id="dDue" value="${ed?.due || ''}" /></div>
      <div class="frow"><div class="field"><label>Tarih</label><input type="date" class="inp" id="dDate" value="${ed?.date || today()}" /></div>
      <div class="field"><label id="dReasonL">${kind === 'borrow' ? 'Ne için aldık?' : 'Açıklama'}</label><input class="inp" id="dReason" value="${esc(ed?.reason || '')}" placeholder="${kind === 'borrow' ? 'Örn. Malzeme alımı, maaş ödemesi' : 'İsteğe bağlı'}" /></div></div>`,
    foot: `<button class="btn ghost" data-c>Vazgeç</button><button class="btn red" data-ok>${ed ? 'Güncelle' : 'Kaydet'}</button>`,
    onMount: (m, close) => {
      $('[data-c]', m).onclick = close;
      const setKind = (k) => { kind = k; $$('.kindSeg button', m).forEach((x) => x.classList.toggle('on', x.dataset.k === k)); $('.m-head h3', m).textContent = ed ? 'Kaydı Düzenle' : k === 'borrow' ? 'Borç Aldık' : 'Ödeme Yaptık'; $('#dReasonL', m).textContent = k === 'borrow' ? 'Ne için aldık?' : 'Açıklama'; $('.due-field', m).classList.toggle('hidden', k !== 'borrow'); };
      const syncDue = () => { const v = $('#dDue', m).value; $$('.due-chips .chip', m).forEach((c) => c.classList.toggle('on', c.dataset.due === '0' ? !v : false)); };
      $$('.due-chips .chip', m).forEach((c) => (c.onclick = () => { Sound.play('select'); const n = +c.dataset.due; if (!n) $('#dDue', m).value = ''; else { const d = parseYmd($('#dDate', m).value || today()); d.setDate(d.getDate() + n); $('#dDue', m).value = ymd(d); } syncDue(); $$('.due-chips .chip', m).forEach((x) => x.classList.toggle('on', x === c)); }));
      $('#dDue', m).onchange = syncDue; syncDue();
      $$('.kindSeg button', m).forEach((b) => (b.onclick = () => { Sound.play('select'); setKind(b.dataset.k); }));
      $$('.curSeg button', m).forEach((b) => (b.onclick = () => { Sound.play('tick'); cur = b.dataset.c; $$('.curSeg button', m).forEach((x) => x.classList.toggle('on', x === b)); $('#dSym', m).textContent = CUR[cur].s; $('#dSym', m).classList.remove('flip'); void $('#dSym', m).offsetWidth; $('#dSym', m).classList.add('flip'); }));
      $('[data-newp]', m).onclick = () => openPersonModal(null, (nid) => { personId = nid; $('#dPerson', m).innerHTML = peopleOpts(); });
      $('[data-ok]', m).onclick = () => {
        const pid = $('#dPerson', m).value; if (!pid) { shakeErr($('#dPerson', m)); toast('Önce bir kişi seçin veya ekleyin', true, 'none'); return; }
        const a = $('#dAmt', m); if (a.value === '' || num(a.value) <= 0) { shakeErr(a); return; }
        const data = { personId: pid, kind, amount: num(a.value), currency: cur, date: $('#dDate', m).value || today(), reason: $('#dReason', m).value.trim(), due: kind === 'borrow' ? ($('#dDue', m).value || '') : '' };
        if (ed) Object.assign(ed, data); else DB.debts.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
        persist(); close(true); toast(ed ? 'Kayıt güncellendi' : kind === 'borrow' ? 'Borç kaydedildi' : 'Ödeme kaydedildi');
        refresh(); burst(innerWidth / 2, 160, 20);
      };
    }
  });
}

function bindDebts(v) {
  const ds = $('#dSearch', v); if (ds) ds.oninput = () => { ui.dSearch = ds.value; refresh(); const n = $('#dSearch'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  $$('[data-person]', v).forEach((el) => (el.onclick = () => { Sound.play('nav'); go('person', el.dataset.person); }));
  $$('[data-ded]', v).forEach((b) => (b.onclick = () => openDebtModal({ editId: b.dataset.ded })));
  $$('[data-ddel]', v).forEach((b) => (b.onclick = async () => {
    if (await confirmBox('Kaydı sil', 'Bu borç / ödeme kaydı silinecek. Emin misiniz?')) { DB.debts = DB.debts.filter((d) => d.id !== b.dataset.ddel); persist(); toast('Kayıt silindi', false, 'del'); refresh(); }
  }));
}
async function debtAction(a) {
  const pid = route.name === 'person' ? route.id : null;
  switch (a) {
    case 'add-person': openPersonModal(); return true;
    case 'edit-person': openPersonModal(pid); return true;
    case 'del-person': {
      const p = person(pid); const n = DB.debts.filter((d) => d.personId === pid).length;
      if (await confirmBox('Kişiyi sil', `<b>${esc(p.name)}</b> ve ona ait <b>${n}</b> borç / ödeme kaydı kalıcı olarak silinecek. Emin misiniz?`)) {
        DB.people = DB.people.filter((x) => x.id !== pid); DB.debts = DB.debts.filter((d) => d.personId !== pid); persist(); toast('Kişi silindi', false, 'del'); go('debts');
      } return true;
    }
    case 'debt-borrow': if (!DB.people.length) { openPersonModal(null, (nid) => { refresh(); openDebtModal({ kind: 'borrow', personId: nid }); }); return true; } openDebtModal({ kind: 'borrow', personId: pid }); return true;
    case 'debt-pay': if (!DB.people.length) { openPersonModal(null, (nid) => { refresh(); openDebtModal({ kind: 'pay', personId: nid }); }); return true; } openDebtModal({ kind: 'pay', personId: pid }); return true;
  }
  return false;
}

/* ============ Borç hatırlatıcı ============ */
const dayDiff = (a, b) => Math.round((parseYmd(a) - parseYmd(b)) / 86400000);
// Ödemeler en eski borçtan başlayarak düşülür (FIFO). Her borcun kalanını verir.
function borrowLeftMap() {
  const map = {};
  (DB.people || []).forEach((p) => CURS.forEach((c) => {
    const ds = (DB.debts || []).filter((d) => d.personId === p.id && d.currency === c);
    let paid = ds.filter((d) => d.kind === 'pay').reduce((n, d) => n + (+d.amount || 0), 0);
    ds.filter((d) => d.kind === 'borrow').sort((a, b) => ((a.due || a.date) + a.date).localeCompare((b.due || b.date) + b.date)).forEach((b) => {
      const cover = Math.min(paid, +b.amount || 0); paid -= cover; map[b.id] = (+b.amount || 0) - cover;
    });
  }));
  return map;
}
function dueInfo(due) {
  const n = dayDiff(due, today());
  if (n < 0) return { cls: 'late', txt: `${-n} gün gecikti`, n };
  if (n === 0) return { cls: 'late', txt: 'Bugün ödenmeli', n };
  if (n <= 7) return { cls: 'soon', txt: `${n} gün kaldı`, n };
  return { cls: 'later', txt: `${n} gün kaldı`, n };
}
function duePill(d) {
  const left = borrowLeftMap()[d.id];
  if (left <= 0) return `<span class="duepill done">${I.check.replace('<svg', '<svg width="11" height="11"')} Ödendi</span>`;
  const i = dueInfo(d.due);
  return `<span class="duepill ${i.cls}">${I.bell.replace('<svg', '<svg width="11" height="11"')} Vade ${fmtDate(d.due, false)} · ${i.txt}</span>`;
}
function debtReminders() {
  const left = borrowLeftMap(); const items = [];
  (DB.debts || []).filter((d) => d.kind === 'borrow' && left[d.id] > 0).forEach((d) => {
    const p = person(d.personId); if (!p) return;
    items.push({ d, p, left: left[d.id], info: d.due ? dueInfo(d.due) : null });
  });
  const dated = items.filter((x) => x.info).sort((a, b) => a.info.n - b.info.n);
  const undated = items.filter((x) => !x.info);
  return { dated, undated, late: dated.filter((x) => x.info.n <= 0), soon: dated.filter((x) => x.info.n > 0 && x.info.n <= 7) };
}
function remRow(x) {
  const cls = x.info ? x.info.cls : 'none';
  return `<div class="li rem ${cls}" data-person="${x.p.id}">
    <div class="rem-ic">${I.bell}</div>
    <div class="grow"><div class="t1">${esc(x.p.name)}</div><div class="t2">${x.d.reason ? esc(x.d.reason) + ' · ' : ''}${x.info ? x.info.txt + ' · ' + fmtDate(x.d.due, false) : 'Ödeme tarihi girilmemiş'}</div></div>
    <div class="amt tnum neg">${moneyC(x.left, x.d.currency)}</div></div>`;
}
function reminderCard() {
  if (!(DB.debts || []).length) return '';
  const r = debtReminders(); const all = [...r.dated, ...r.undated];
  if (!all.length) return `<div class="card remcard ok" style="--i:1"><div class="rem-head"><div class="rem-bell ok">${I.check}</div><div><b>Borç hatırlatıcı</b><span>Ödenmemiş borç yok. Tebrikler.</span></div></div></div>`;
  const shown = all.slice(0, 4);
  return `<div class="card remcard ${r.late.length ? 'alarm' : ''}" style="--i:1">
    <div class="rem-head"><div class="rem-bell ${r.late.length ? 'ring' : ''}">${I.bell}</div><div><b>Borç Hatırlatıcı</b><span>${r.late.length ? `<em class="late">${r.late.length} borcun ödeme günü geldi veya geçti</em>` : r.soon.length ? `<em class="soon">${r.soon.length} borcun ödeme günü bu hafta</em>` : `${all.length} ödenmemiş borç var`}</span></div><button class="btn sm" data-go="debts">Tümü ${I.right}</button></div>
    <div class="list">${shown.map(remRow).join('')}</div>
    ${all.length > shown.length ? `<p class="kbd" style="margin-top:8px">+${all.length - shown.length} borç daha</p>` : ''}
  </div>`;
}
function bindReminders(v) {
  if (route.name !== 'home') return;
  $$('.remcard [data-person]', v).forEach((el) => (el.onclick = () => { Sound.play('nav'); go('person', el.dataset.person); }));
}
function maybeRemind() {
  if (window.TOUR_ACTIVE) return;
  const r = debtReminders(); const urgent = [...r.late, ...r.dated.filter((x) => x.info.n > 0 && x.info.n <= 3)];
  if (!urgent.length || localStorage.getItem('atig_remind_day') === today()) return;
  localStorage.setItem('atig_remind_day', today());
  setTimeout(() => Sound.play('warn'), 40);
  modal({
    title: 'Borç Hatırlatma', sub: 'Ödeme günü gelen veya yaklaşan borçlar',
    body: `<div class="rem-pop"><div class="rem-bell big ring">${I.bell}</div></div><div class="list">${urgent.map(remRow).join('')}</div>`,
    foot: `<button class="btn ghost" data-c>Tamam</button><button class="btn red" data-ok>Borçlara Git</button>`,
    onMount: (m, close) => { $('[data-c]', m).onclick = close; $('[data-ok]', m).onclick = () => { close(true); go('debts'); }; $$('[data-person]', m).forEach((el) => (el.onclick = () => { close(true); go('person', el.dataset.person); })); }
  });
}
