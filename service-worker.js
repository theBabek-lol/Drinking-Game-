const CACHE = 'drinkgame-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './questions.json',
  // Add-to-homescreen (only the files you actually load)
  './vendor/add-to-homescreen/add-to-homescreen.min.js',
  './vendor/add-to-homescreen/add-to-homescreen.min.css',
  
];

// Precache
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

// Cleanup old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
  );
  self.clients.claim();
});

// Routing
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Don't cache GoatCounter or any cross-origin analytics
  if (url.hostname.endsWith('zgo.at') || url.hostname.endsWith('goatcounter.com')) return;

  // Navigations: network first, fallback to cached index
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static GET: stale-while-revalidate
  if (e.request.method === 'GET') {
    e.respondWith(swr(e.request));
  }
});

async function swr(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => { cache.put(request, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}
