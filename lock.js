'use strict';
/* ============ 4 haneli PIN kilidi ============ */
(() => {
  const KEY = 'atig_pin_v1';
  const hash = async (pin) => {
    const data = new TextEncoder().encode('atig|' + pin);
    if (window.crypto && crypto.subtle) { const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
    let x = 5381; for (const c of 'atig|' + pin) x = ((x << 5) + x + c.charCodeAt(0)) >>> 0; return 'h' + x;
  };
  const get = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
  function ensure() {
    return new Promise((resolve) => {
      let stored = get(); let step = stored ? 'enter' : 'create'; let first = ''; let val = ''; let busy = false;
      const ov = document.createElement('div'); ov.className = 'lock';
      ov.innerHTML = `<div class="lk-box"><img src="assets/logo.png" class="lk-logo" alt="ATIG" /><h2 id="lkTitle"></h2><p id="lkSub"></p>
        <div class="lk-dots"><i></i><i></i><i></i><i></i></div>
        <div class="lk-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-n="${n}">${n}</button>`).join('')}<span></span><button data-n="0">0</button><button data-del aria-label="Sil">⌫</button></div></div>`;
      document.body.appendChild(ov);
      const $t = ov.querySelector('#lkTitle'), $s = ov.querySelector('#lkSub'), dots = [...ov.querySelectorAll('.lk-dots i')], box = ov.querySelector('.lk-dots');
      const texts = {
        create: ['PIN belirleyin', '4 haneli bir şifre seçin. Bir kez belirlenir.'],
        confirm: ['PIN\'i tekrar girin', 'Aynı 4 haneyi tekrar yazın.'],
        enter: ['PIN girin', 'Devam etmek için şifrenizi yazın.']
      };
      const paint = () => { $t.textContent = texts[step][0]; if (!$s.dataset.err) $s.textContent = texts[step][1]; dots.forEach((d, i) => d.classList.toggle('on', i < val.length)); };
      const err = (msg) => { $s.textContent = msg; $s.dataset.err = '1'; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); if (navigator.vibrate) navigator.vibrate(60); setTimeout(() => { delete $s.dataset.err; val = ''; busy = false; paint(); }, 650); };
      const done = () => { ov.classList.add('out'); setTimeout(() => ov.remove(), 450); resolve(); };
      const full = async () => {
        busy = true;
        if (step === 'create') { first = val; val = ''; step = 'confirm'; busy = false; paint(); return; }
        if (step === 'confirm') {
          if (val === first) { try { localStorage.setItem(KEY, await hash(val)); } catch (e) {} done(); }
          else { step = 'create'; first = ''; err('PIN\'ler uyuşmadı, baştan deneyin'); }
          return;
        }
        if ((await hash(val)) === stored) done(); else err('Hatalı PIN');
      };
      const press = (n) => {
        if (busy || val.length >= 4) return;
        try { if (window.Sound) Sound.unlock(); if (window.Assistant && Assistant.unlockVoice) Assistant.unlockVoice(); } catch (e) {}
        val += n; paint(); if (val.length === 4) setTimeout(full, 120);
      };
      ov.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => press(b.dataset.n)));
      ov.querySelector('[data-del]').addEventListener('click', () => { if (!busy) { val = val.slice(0, -1); paint(); } });
      document.addEventListener('keydown', function k(e) { if (!document.body.contains(ov)) return document.removeEventListener('keydown', k); if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace' && !busy) { val = val.slice(0, -1); paint(); } });
      paint();
    });
  }
  window.PinLock = { ensure };
})();
