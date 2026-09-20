const CACHE_NAME = "navalha-shell-v1";
const SHELL = ["/", "/agenda", "/clientes", "/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((response) => response || caches.match("/"))));
});
self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? { title: "Navalha", body: "Você tem uma atualização na agenda.", url: "/notificacoes" };
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: "/favicon.svg", badge: "/favicon.svg", data: { url: payload.url } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const target = clients.find((client) => "focus" in client);
    return target ? target.focus().then(() => target.navigate(event.notification.data?.url ?? "/")) : self.clients.openWindow(event.notification.data?.url ?? "/");
  }));
});
