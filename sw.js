const CACHE_NAME = "onflow-shell-v11";
const APP_SHELL = [
  "/",
  "/index.html",
  "/styles.css?v=oneflow-7",
  "/compact.css?v=onflow-13",
  "/app.js?v=onflow-16",
  "/manifest.webmanifest",
  "/assets/onflow-mark.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/fonts/Switzer-Regular.woff",
  "/assets/fonts/Switzer-Bold.woff",
  "/assets/fonts/Plein-Bold.woff",
  "/assets/fonts/DS-DIGI.TTF"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }))
  );
});
