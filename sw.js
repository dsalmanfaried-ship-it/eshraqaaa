/* sw.js — تنزيل من كروم + شغل أوفلاين + يضيف inapp.js لـ index.html تلقائي (من غير ما تعدّل index.html) */
const V = 'deen-v5';
const CORE = ['./', 'index.html', 'quran.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'inapp.js', 'extra-data.js', 'images.js'];
const TAG = '<script src="inapp.js"></script>';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(V).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

/* يجيب الصفحة الرئيسية ويضيف سطر inapp.js قبل </body> (لو مش موجود) */
async function mainPage(r) {
  const res = await fetch(r);
  if (!res.ok || !(res.headers.get('content-type') || '').includes('text/html')) return res;
  const t = await res.text();
  const body = (t.includes('inapp.js') || !t.includes('</body>')) ? t : t.replace('</body>', TAG + '\n</body>');
  return new Response(body, { status: res.status, statusText: res.statusText, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;                 // يوتيوب والخطوط وغيرهم: مش بنتدخل
  const isMain = r.mode === 'navigate' && /(\/|\/index\.html)$/.test(u.pathname);
  e.respondWith(
    (isMain ? mainPage(r) : fetch(r)).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)).catch(() => {}); }
      return res;
    }).catch(() =>
      caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
