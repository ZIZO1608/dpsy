/* Digital Plus service worker: offline pages, fast images, push notifications. */
const V = 'dp-v1';
const SHELL = ['/store/', '/store/admin.html', '/assets/docs.js', '/assets/logo.png', '/assets/logo-white.png', '/assets/icons/icon-192.png', '/assets/icons/badge-72.png'];
const IMG_CACHE = 'dp-img-v1', MAX_IMG = 400;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName = V) {
  const c = await caches.open(cacheName);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (e) {
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    if (hit) return hit;
    if (req.mode === 'navigate') { const shell = await c.match(new URL(req.url).pathname.includes('admin') ? '/store/admin.html' : '/store/'); if (shell) return shell; }
    throw e;
  }
}
async function cacheFirst(req, cacheName) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok || r.type === 'opaque') {
    c.put(req, r.clone());
    c.keys().then(ks => { if (ks.length > MAX_IMG) ks.slice(0, ks.length - MAX_IMG).forEach(k => c.delete(k)); });
  }
  return r;
}
async function staleWhileRevalidate(req) {
  const c = await caches.open(V);
  const hit = await c.match(req);
  const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (u.pathname === '/api/products' || u.pathname === '/api/settings/public') return e.respondWith(networkFirst(req));
    if (u.pathname.startsWith('/api/')) return;                        // live data, never cached
    if (u.pathname.startsWith('/img/')) return e.respondWith(cacheFirst(req, IMG_CACHE));
    if (req.mode === 'navigate' || u.pathname.endsWith('.html') || u.pathname.endsWith('/')) return e.respondWith(networkFirst(req));
    if (u.pathname.startsWith('/assets/') || u.pathname.endsWith('.webmanifest')) return e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$|cdnjs\.cloudflare\.com$/.test(u.hostname)) return e.respondWith(staleWhileRevalidate(req));
  if (u.hostname.endsWith('dpsy.com') && req.destination === 'image') return e.respondWith(cacheFirst(req, IMG_CACHE));
});

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Digital Plus', body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Digital Plus', {
    body: d.body || '', icon: '/assets/icons/icon-192.png', badge: '/assets/icons/badge-72.png',
    tag: d.tag, renotify: !!d.tag, data: { url: d.url || '/store/' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || '/store/', location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const same = list.find(c => c.url.split('#')[0] === url.split('#')[0]);
    if (same) return same.focus().then(c => c.navigate ? c.navigate(url) : c);
    return self.clients.openWindow(url);
  }));
});
