// Service Worker для push-уведомлений
const CACHE_NAME = 'imlsklad-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Получение push-уведомления
self.addEventListener('push', (event) => {
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Новое уведомление',
        body: event.data.text(),
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        url: '/',
        task_id: null,
      };
    }
  }

  const title = data.title || 'IMLSKLAD';
  const options = {
    body: data.body || 'Новое уведомление',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    data: {
      url: data.url || '/',
      task_id: data.task_id || null,
    },
    requireInteraction: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Клик по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const taskId = event.notification.data?.task_id;

  // Формируем URL с параметром для открытия модалки
  let targetUrl = url;
  if (taskId) {
    targetUrl = `${url}?task_id=${taskId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Если есть открытое окно, фокусируем его
        for (const client of clientList) {
          if (client.url.includes(window.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'OPEN_TASK',
              task_id: taskId,
              url: targetUrl,
            });
            return client.focus();
          }
        }
        // Иначе открываем новое окно
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Кэширование запросов (опционально)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});