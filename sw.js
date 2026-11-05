// Service worker de PROJECT 5K: funciona offline (cache-first del "app shell")
// y avisa cuando hay una versión nueva. Cambiá VERSION en cada publicación.
const VERSION = 'p5k-v1.0.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js', 'js/bus.js', 'js/db.js', 'js/store.js', 'js/seed.js', 'js/util.js', 'js/ui.js',
  'js/charts.js', 'js/figures.js', 'js/quicklog.js', 'js/reminders.js', 'js/health.js', 'js/insights.js', 'js/backup.js',
  'js/views/today.js', 'js/views/train.js', 'js/views/player.js', 'js/views/progress.js', 'js/views/weekly.js',
  'js/views/nutrition.js', 'js/views/habits.js', 'js/views/plan.js', 'js/views/more.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // Navegación: devolver el index cacheado (la app usa rutas con #).
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then((r) => r || fetch(req)).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => 'focus' in w);
    return c ? c.focus() : self.clients.openWindow('./');
  }));
});
