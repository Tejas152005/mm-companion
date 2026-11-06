// Man Matters Companion service worker. Keeps the app shell available offline.
// It never touches /api or other sites (Supabase, MediaPipe), so sign-in, data and the assistant are always live.
const V = 'mmc-v1'
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(['/', '/manifest.webmanifest', '/icons/icon-192.png'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return
  if (req.mode === 'navigate') {
    // Pages: network first, so people always get the latest app. Offline: the cached shell.
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(V).then((c) => c.put('/', copy)); return r }).catch(() => caches.match('/')))
    return
  }
  // Built files and icons: serve from cache, refresh in the background.
  e.respondWith(caches.open(V).then(async (c) => {
    const hit = await c.match(req)
    const net = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r }).catch(() => hit)
    return hit || net
  }))
})
