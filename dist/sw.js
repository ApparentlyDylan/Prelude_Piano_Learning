const SAMPLE_CACHE = "prelude-samples-v1";
const APP_CACHE = "prelude-app-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SAMPLE_CACHE && k !== APP_CACHE)
          .map((k) => caches.delete(k)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // piano samples and fonts: immutable, cache-first
  if (url.hostname === "tonejs.github.io" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(SAMPLE_CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        const res = await fetch(e.request);
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // SPA navigations: network first, cached shell offline
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(APP_CACHE).then((c) => c.put("/", res.clone()));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  // same-origin assets (hashed filenames): stale-while-revalidate
  if (url.origin === location.origin) {
    e.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        const refresh = fetch(e.request)
          .then((res) => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit ?? refresh;
      }),
    );
  }
});
