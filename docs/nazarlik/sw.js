// Offline support for the installed app, and notifications. Served as is (public/),
// next to index.html.
// The page, blessings.json, the manifest and icons (their names don't change between
// deploys): network first, so a new version shows up as soon as it is online; the
// cached copy when offline. The built JS and CSS: from the cache once fetched (Vite
// gives them hashed names, so a cached one never goes stale). When a new page comes
// in, its files are fetched and the previous version's are dropped, so the cache
// holds one version and an offline launch always has the page's own scripts.
// The app's own check for a new version (main.js) goes straight to the network and
// is not cached: a page whose scripts were never fetched must not be served offline.
// Bump VERSION to drop old caches (not needed for normal deploys).
const VERSION = 4;
const FRESH = /\/(blessings\.json|manifest\.webmanifest|icons\/[^/]+)$/;
const CACHE = `nazarlik-v${VERSION}`;
const scope = () => self.registration.scope;

// What a page loads from here: found by reading it, since built names change with every build.
const pageFiles = html => [...new Set([...html.matchAll(/(?:src|href)="(\.?\/?(?:assets|icons)\/[^"]+|\.?\/?manifest\.webmanifest)"/g)]
  .map(m => new URL(m[1], scope()).href))];

// Fetches a new page's built files, then drops those of earlier versions.
async function keepOnly(cache, html){
  const built = pageFiles(html).filter(u => u.startsWith(scope() + 'assets/'));
  const missing = [];
  for (const u of built) if (!(await cache.match(u))) missing.push(u);
  await cache.addAll(missing); // throws if offline: then nothing is dropped
  for (const r of await cache.keys())
    if (r.url.startsWith(scope() + 'assets/') && !built.includes(r.url)) await cache.delete(r);
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch('./', { cache: 'no-cache' });
    const html = await res.clone().text();
    await cache.put('./', res);
    await cache.addAll(pageFiles(html));
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
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const nav = req.mode === 'navigate', root = new URL(scope()).pathname;
  const isPage = url.pathname === root || url.pathname === root + 'index.html';
  if (!nav && url.pathname === root) return; // the update check
  if (nav || FRESH.test(url.pathname)){
    const key = nav ? './' : req;
    // only the app page itself goes under './': not a JSON or image opened in a tab
    const keep = res => res.ok && (!nav || (isPage && (res.headers.get('Content-Type') || '').includes('text/html')));
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        // past the HTTP cache too, so a reload for a new version gets the new page
        const res = await fetch(req, { cache: 'no-cache' });
        if (keep(res)){
          await cache.put(key, res.clone());
          if (nav) e.waitUntil(res.clone().text().then(html => keepOnly(cache, html)).catch(() => {}));
        }
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

// Notifications from the push server (push/): { title, body, tag?, lang? }. A broadcast
// has its own tag, so it doesn't replace an unread "your nəzərlik broke" one.
self.addEventListener('push', e => {
  let msg = {};
  try { msg = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(msg.title || 'Nəzərlik', {
    body: msg.body || '', icon: './icons/icon-192.png', tag: /^nazarlik(-[a-z]+)?$/.test(msg.tag) ? msg.tag : 'nazarlik',
    renotify: true, // a new one replacing an unread one with the same tag still alerts
    lang: typeof msg.lang === 'string' ? msg.lang : '',
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
