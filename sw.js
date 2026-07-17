const CACHE = "stepdown-v1";
const SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Google Fonts: cache-first with background fill
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok) c.put(e.request, res.clone());
          return res;
        } catch {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;

  // App shell: cache-first, refresh in background
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
