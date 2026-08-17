// Push handlers — được importScripts vào service worker do vite-plugin-pwa sinh
// (giữ nguyên offline/precache; chỉ thêm push). Xem vite.config workbox.importScripts.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || 'AI English Companion';
  const body = data.body || 'Đã đến giờ ôn từ!';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      lang: 'vi',
      data: { url: data.url || '/review' },
      tag: 'aec-reminder', // gộp, không spam nhiều thông báo
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/review';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
