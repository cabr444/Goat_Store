self.addEventListener('push', event => {
  let payload;
  try { payload = event.data.json(); } catch { return; }
  event.waitUntil(self.registration.showNotification(payload.title || 'Goats', {
    body: payload.body || 'Hay una nueva compra.', tag: payload.tag,
    data: { url: payload.url }, icon: '/images/goats-push.svg', badge: '/images/goats-push.svg',
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/administracion/ventas', self.location.origin);
  if (target.origin !== self.location.origin || !target.pathname.startsWith('/administracion/ventas')) return;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin) { await client.navigate(target.href); return client.focus(); }
    }
    return self.clients.openWindow(target.href);
  })());
});
