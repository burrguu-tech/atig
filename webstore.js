'use strict';
/* ============ Telefon (tarayıcı) depolaması: IndexedDB ============ */
(() => {
  const DBNAME = 'atig-mobil', VER = 1;
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DBNAME, VER);
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv'); if (!d.objectStoreNames.contains('photos')) d.createObjectStore('photos'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(store, mode); const s = t.objectStore(store); let out; const r = fn(s); if (r) r.onsuccess = () => (out = r.result); t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
  const kvGet = (k) => tx('kv', 'readonly', (s) => s.get(k));
  const kvSet = (k, v) => tx('kv', 'readwrite', (s) => s.put(v, k));
  const phPut = (k, blob) => tx('photos', 'readwrite', (s) => s.put(blob, k));
  const phDel = (k) => tx('photos', 'readwrite', (s) => s.delete(k));
  const phAll = async () => { const d = await open(); return new Promise((res, rej) => { const out = []; const t = d.transaction('photos', 'readonly'); const c = t.objectStore('photos').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error); }); };

  // Fotoğraf önbelleği: anahtar "işId/dosya" -> blob adresi
  const cache = new Map();
  window.PhotoCache = { get: (k) => cache.get(k), ready: null };
  const setUrl = (k, blob) => { const old = cache.get(k); if (old) URL.revokeObjectURL(old); cache.set(k, URL.createObjectURL(blob)); };

  // Fotoğrafı küçült (telefon fotoğrafları çok büyük olur)
  function shrink(file, max = 1600, q = 0.82) {
    return new Promise((res) => {
      const url = URL.createObjectURL(file); const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img; const r = Math.min(1, max / Math.max(w, h)); w = Math.round(w * r); h = Math.round(h * r);
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); c.toBlob((b) => res(b || file), 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  async function storeFiles(jobId, files) {
    const out = [];
    for (const f of [...files]) {
      if (!f.type.startsWith('image/') && !/\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f.name)) continue;
      const blob = await shrink(f);
      const file = Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + '.jpg';
      const k = jobId + '/' + file; await phPut(k, blob); setUrl(k, blob);
      out.push({ file, name: f.name || file });
    }
    return out;
  }
  const pickFiles = (accept, multiple = true) => new Promise((res) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple;
    i.style.cssText = 'position:fixed;left:-999px;top:0;opacity:0';
    document.body.appendChild(i);
    i.onchange = () => { res(i.files); i.remove(); };
    i.click();
  });
  const blobToB64 = (b) => new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(b); });
  const b64ToBlob = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: 'image/jpeg' }); };

  const EMPTY = { version: 1, workers: [], jobs: [], entries: [] };
  window.IS_WEB = true;
  window.api = {
    async load() {
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
      let d = await kvGet('db');
      if (!d) { const ls = localStorage.getItem('atig'); d = ls ? JSON.parse(ls) : EMPTY; }
      window.PhotoCache.ready = phAll().then((all) => all.forEach(([k, b]) => setUrl(k, b))).catch(() => {});
      await window.PhotoCache.ready;
      return typeof d === 'string' ? JSON.parse(d) : d;
    },
    async save(d) { await kvSet('db', JSON.stringify(d)); return true; },
    async exportData(d) {
      const copy = JSON.parse(JSON.stringify(d));
      for (const j of copy.jobs || []) for (const ph of j.photos || []) {
        try { const all = await tx('photos', 'readonly', (s) => s.get(j.id + '/' + ph.file)); if (all) ph.base64 = await blobToB64(all); } catch (e) {}
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `ATIG-yedek-${stamp}.json`;
      const blob = new Blob([JSON.stringify(copy)], { type: 'application/json' });
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'ATIG Yedek' }); return name; }
        catch (e) { if (e && e.name === 'AbortError') return false; }
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return name;
    },
    async importData() {
      const fs = await pickFiles('.json,application/json,text/plain', false); if (!fs || !fs[0]) return null;
      const d = JSON.parse(await fs[0].text());
      if (!d || !Array.isArray(d.workers) || !Array.isArray(d.jobs) || !Array.isArray(d.entries)) throw new Error('Geçersiz yedek');
      for (const j of d.jobs) for (const ph of j.photos || []) {
        if (ph.base64) { const k = j.id + '/' + ph.file; const b = b64ToBlob(ph.base64); await phPut(k, b); setUrl(k, b); delete ph.base64; }
        else if (ph.data && ph.data.startsWith('data:')) { const k = j.id + '/' + ph.file; const b = b64ToBlob(ph.data.split(',')[1]); await phPut(k, b); setUrl(k, b); delete ph.data; }
      }
      return d;
    },
    openFolder: async () => {},
    openExternal: async (u) => { window.open(u, '_blank'); },
    async pickPhotos(jobId) { const fs = await pickFiles('image/*'); return fs && fs.length ? storeFiles(jobId, fs) : []; },
    addPhotoFiles: (jobId, files) => storeFiles(jobId, files),
    async deletePhoto(jobId, file) { const k = jobId + '/' + file; await phDel(k); const u = cache.get(k); if (u) URL.revokeObjectURL(u); cache.delete(k); return true; },
    async deleteJobPhotos(jobId) { for (const k of [...cache.keys()]) if (k.startsWith(jobId + '/')) { await phDel(k); URL.revokeObjectURL(cache.get(k)); cache.delete(k); } return true; },
    async usage() { try { const e = await navigator.storage.estimate(); return e.usage || 0; } catch (e) { return 0; } }
  };
})();
