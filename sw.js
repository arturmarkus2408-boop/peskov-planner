// PESKOV Smart Planner — Service Worker v4
// Обновлено: добавлена поддержка offline для заметок, тем, новой навигации
const CACHE = 'peskov-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Установка: кэшируем все ассеты
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые кэши (peskov-v1, v2, v3...)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Стратегия: Network-first для index.html (всегда свежая версия),
// Cache-first для всего остального (иконки, манифест)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  const isHTML = url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-first: пробуем сеть, при ошибке — кэш
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
    );
  } else {
    // Cache-first: иконки и статика из кэша, при отсутствии — сеть
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        }).catch(() => caches.match('/index.html'));
      })
    );
  }
});

// Клик по системному уведомлению — открываем/фокусируем приложение
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const taskId = e.notification.data && e.notification.data.taskId;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      // Если вкладка уже открыта — фокус на неё
      for (const c of cls) {
        if ('focus' in c) return c.focus();
      }
      // Иначе открываем новую
      return clients.openWindow('/');
    })
  );
});

// Фоновая синхронизация (на будущее — для надёжных напоминаний)
self.addEventListener('sync', e => {
  if (e.tag === 'reminder-sync') {
    // Место для фоновой логики напоминаний при восстановлении сети
  }
});
