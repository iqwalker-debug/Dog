// Refuge PWA service worker.
// - App shell: cache-first
// - API GETs: network-first with 24h fallback
// - Images: stale-while-revalidate
// - Navigation failures: offline.html fallback

const VERSION = "v1";
const SHELL = `refuge-shell-${VERSION}`;
const API = `refuge-api-${VERSION}`;
const IMG = `refuge-img-${VERSION}`;

const SHELL_ASSETS = ["/", "/offline.html", "/manifest.webmanifest"];
const API_TTL_MS = 24 * 60 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![SHELL, API, IMG].includes(k))
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(networkFirstNav(req));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(req));
    return;
  }

  if (req.destination === "image") {
    event.respondWith(staleWhileRevalidate(req, IMG));
    return;
  }

  event.respondWith(cacheFirst(req, SHELL));
});

async function networkFirstNav(req) {
  try {
    const res = await fetch(req);
    const cache = await caches.open(SHELL);
    cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || caches.match("/offline.html");
  }
}

async function networkFirstApi(req) {
  const cache = await caches.open(API);
  try {
    const res = await fetch(req);
    if (res.ok) {
      const stamped = new Response(res.clone().body, {
        status: res.status,
        statusText: res.statusText,
        headers: new Headers({ ...Object.fromEntries(res.headers), "x-cached-at": String(Date.now()) }),
      });
      cache.put(req, stamped);
    }
    return res;
  } catch {
    const cached = await cache.match(req);
    if (!cached) throw new Error("offline");
    const ts = Number(cached.headers.get("x-cached-at") || 0);
    if (ts && Date.now() - ts > API_TTL_MS) {
      return new Response(JSON.stringify({ data: null, error: { code: "offline_stale", message: "You're offline and this data is older than 24 hours." } }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    }
    return cached;
  }
}

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(cacheName);
    cache.put(req, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}
