// Offline support for the installed app. Served as is (public/), next to index.html.
// Pages: network first, so a new version shows up as soon as it is online; the cached
// copy when offline. Everything else: from the cache once fetched (Vite gives built
// files hashed names, so a cached file never goes stale).
// Bump VERSION to drop old caches (not needed for normal deploys).
const VERSION = 1;
const CACHE = `nazar-v${VERSION}`;

// The page and what it loads: the built JS and CSS are found by reading index.html,
// since their names change with every build.
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('./', res);
    const urls = [...html.matchAll(/(?:src|href)="(\.?\/?(?:assets|icons)\/[^"]+|\.?\/?manifest\.webmanifest)"/g)].map(m => m[1]);
    await cache.addAll([...new Set(urls)]);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate'){
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put('./', res.clone());
        return res;
      } catch {
        return (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});
