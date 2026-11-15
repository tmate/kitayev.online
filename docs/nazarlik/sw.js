// Offline support for the installed app, and notifications. Served as is (public/),
// next to index.html.
// The page and blessings.json: network first, so a new version shows up as soon as
// it is online; the cached copy when offline. Everything else: from the cache once
// fetched (Vite gives built files hashed names, so a cached file never goes stale).
// Bump VERSION to drop old caches (not needed for normal deploys).
const VERSION = 2;
const FRESH = /\/blessings\.json$/;
const CACHE = `nazarlik-v${VERSION}`;

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
  const nav = req.mode === 'navigate';
  if (nav || FRESH.test(new URL(req.url).pathname)){
    const key = nav ? './' : req;
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req, nav ? undefined : { cache: 'no-cache' });
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch {
        return (await cache.match(key)) || Response.error();
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

// Notifications from the push server (push/): { title, body }.
self.addEventListener('push', e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(msg.title || 'Nazarlik', {
    body: msg.body || '', icon: './icons/icon-192.png', tag: 'nazarlik', lang: 'en',
  }));
});

// Tapping one brings the app forward, or opens it.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = wins.find(w => w.url.startsWith(self.registration.scope));
    if (win) return win.focus();
    return self.clients.openWindow(self.registration.scope);
  })());
});
