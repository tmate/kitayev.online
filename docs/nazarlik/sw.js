// Nəzərlik moved to https://nazarlik.online/. This replaces the old app's service
// worker: it drops the offline copy, removes itself and reloads open windows, which
// then get the redirect page (index.html) from the network.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const win of await self.clients.matchAll({ type: 'window' })) win.navigate(win.url);
  })());
});
