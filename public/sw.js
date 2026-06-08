/*
 * Self-unregistering service worker.
 *
 * This app no longer ships a service worker, but earlier deployed versions did,
 * so returning visitors still have one registered — it keeps requesting /sw.js
 * (a 404 that, via the error-page render, tripped an SSR payload bug). This stub
 * takes over, unregisters itself, clears old caches, and reloads open tabs so
 * every stale client cleans itself up. Safe to delete once traffic has cycled.
 */
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      if (self.caches) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) client.navigate(client.url)
    } catch {
      /* best-effort cleanup */
    }
  })())
})
