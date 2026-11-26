'use strict';
const CACHE = 'atig-e6497bac05';
const FILES = [
  "./",
  "advances.js",
  "app.js",
  "assets/apple-touch-icon.png",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon.png",
  "assets/logo.png",
  "assets/voice/a0.mp3",
  "assets/voice/s1.mp3",
  "assets/voice/s10.mp3",
  "assets/voice/s11.mp3",
  "assets/voice/s12.mp3",
  "assets/voice/s13.mp3",
  "assets/voice/s14.mp3",
  "assets/voice/s15.mp3",
  "assets/voice/s16.mp3",
  "assets/voice/s17.mp3",
  "assets/voice/s18.mp3",
  "assets/voice/s19.mp3",
  "assets/voice/s2.mp3",
  "assets/voice/s20.mp3",
  "assets/voice/s21.mp3",
  "assets/voice/s22.mp3",
  "assets/voice/s3.mp3",
  "assets/voice/s4.mp3",
  "assets/voice/s5.mp3",
  "assets/voice/s6.mp3",
  "assets/voice/s7.mp3",
  "assets/voice/s8.mp3",
  "assets/voice/s9.mp3",
  "assistant.js",
  "debts.js",
  "fonts/inter-latin-400-normal.woff2",
  "fonts/inter-latin-500-normal.woff2",
  "fonts/inter-latin-600-normal.woff2",
  "fonts/inter-latin-700-normal.woff2",
  "fonts/inter-latin-ext-400-normal.woff2",
  "fonts/inter-latin-ext-500-normal.woff2",
  "fonts/inter-latin-ext-600-normal.woff2",
  "fonts/inter-latin-ext-700-normal.woff2",
  "fonts/inter.css",
  "index.html",
  "manifest.webmanifest",
  "styles.css",
  "sw-register.js",
  "webstore.js",
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url); if (url.origin !== location.origin) return;
  // Sayfa: önce internet (güncelleme için), yoksa önbellek. Diğer dosyalar: önce önbellek.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })));
});
