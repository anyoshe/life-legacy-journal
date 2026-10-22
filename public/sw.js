/* Network-first app shell so installed PWA always gets latest pages & data from server.
   API and auth are never intercepted. Static icons may be cached. */
const CACHE = "llj-shell-v2";
const STATIC = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(STATIC).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Always network for API, auth, Next data — fresh todos/goals every open
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/sign-") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.includes(".") === false // HTML navigations: prefer network
  ) {
    // For document navigations use network-first
    if (req.mode === "navigate" || req.destination === "document") {
      event.respondWith(
        fetch(req)
          .then((res) => res)
          .catch(() => caches.match("/dashboard").then((c) => c || caches.match("/"))),
      );
      return;
    }
    // API: do not cache — let browser hit network only
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/sign-")) {
      return;
    }
  }

  // Static assets: cache-first
  if (url.pathname.startsWith("/icons") || url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico") {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
