// Service Worker - Al-Diqqa Optics
// عند تعديل أي ملف من البرنامج غيّر رقم النسخة هنا (v1 -> v2) ليتحدّث عند المستخدمين
const CACHE = 'aldiqqa-optics-v2';
const LOCAL_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(LOCAL_FILES);
    // مكتبة حفظ الصورة: تُحفظ مرة واحدة لتعمل بدون إنترنت
    try {
      const res = await fetch(HTML2CANVAS, { mode: 'cors', signal: AbortSignal.timeout(10000) });
      if (res.ok) await cache.put(HTML2CANVAS, res);
    } catch (e) { /* سيُحفظ لاحقاً عند أول استخدام مع الإنترنت */ }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin && req.url !== HTML2CANVAS) return;   // واتساب وغيره يمرّ مباشرة

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const network = fetch(req).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => null);

    if (cached) { network.catch(() => {}); return cached; }   // من الذاكرة فوراً ويتحدّث بالخلفية
    const res = await network;
    if (res) return res;
    if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
