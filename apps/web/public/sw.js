// FRAME service worker (v2.0 PWA). App-shell caching with a network-first
// strategy for navigation (so fresh app code wins when online) and an
// offline fallback page. Data (tRPC/API) is never cached — it needs the
// network; offline just shows the shell + a friendly notice.

const CACHE = "frame-shell-v1"
const OFFLINE_URL = "/offline.html"
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)
  // Never intercept API / Supabase / cross-origin — those require the network.
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/trpc")) return

  // Navigations: network-first, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL).then((r) => r ?? Response.error()))
    )
    return
  }

  // Static assets (_next/static, icons, fonts): cache-first, then network.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ??
        fetch(request).then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy))
          return res
        }).catch(() => cached ?? Response.error())
      )
    )
  }
})
