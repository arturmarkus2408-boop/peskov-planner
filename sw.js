// PESKOV Smart Planner — Service Worker v5.1
const CACHE = 'peskov-v5';
const ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// HTML: Network-first | Статика: Cache-first
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTML = url.pathname === '/' || url.pathname.endsWith('.html');
  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => { if (res && res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone())); return res; })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});

// Клик по уведомлению — действия прямо из шторки
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const taskId = e.notification.data && e.notification.data.taskId;

  if (e.action === 'done' && taskId) {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
        cls.forEach(c => c.postMessage({ type: 'markDone', taskId }));
        if (cls.length > 0) return cls[0].focus();
        return clients.openWindow('/');
      })
    );
  } else if (e.action === 'snooze' && taskId) {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
        cls.forEach(c => c.postMessage({ type: 'snooze', taskId }));
      })
    );
  } else {
    e.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
        for (const c of cls) if ('focus' in c) return c.focus();
        return clients.openWindow('/');
      })
    );
  }
});
