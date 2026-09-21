const CACHE_NAME = "barberflow-static-v2";
const SHELL = ["/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  // Nunca devolver a página pública no lugar de uma rota autenticada ou de JS.
  if (SHELL.includes(new URL(event.request.url).pathname)) {
    event.respondWith(fetch(event.request).catch(async () => await caches.match(event.request) || Response.error()));
  }
});
self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? { title: "BarberFlow", body: "Você tem uma atualização na agenda.", url: "/admin" };
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: "/favicon.svg", badge: "/favicon.svg", data: { url: payload.url } }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const target = clients.find((client) => "focus" in client);
    return target ? target.focus().then(() => target.navigate(event.notification.data?.url ?? "/")) : self.clients.openWindow(event.notification.data?.url ?? "/");
  }));
});
