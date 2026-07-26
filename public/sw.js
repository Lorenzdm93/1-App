/* 1% service worker — v39.
   Navigation: network-first with cached fallback (offline works after the
   first visit). Assets: cache-first (Vite hashes make staleness impossible).
   Updates: the new worker WAITS; the app shows "Update ready" and the person
   chooses the moment. No mid-session rug-pulls. */
var CACHE = 'onepercent-v45'
var CORE = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png']

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (c) {
      return c.addAll(CORE).catch(function () { /* partial precache is fine */ })
    }),
  )
})

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE }).map(function (k) { return caches.delete(k) }),
        )
      })
      .then(function () { return self.clients.claim() }),
  )
})

self.addEventListener('fetch', function (event) {
  var req = event.request
  if (req.method !== 'GET') return
  var url = new URL(req.url)
  if (url.origin !== location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(function (res) {
          var copy = res.clone()
          caches.open(CACHE).then(function (c) { c.put(req, copy) })
          return res
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            return hit || caches.match('./')
          }).then(function (hit) {
            return hit || Response.error()
          })
        }),
    )
    return
  }

  event.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit
      return fetch(req).then(function (res) {
        if (res.ok && (url.pathname.indexOf('/assets/') !== -1 || url.pathname.match(/\.(png|svg|css|js|woff2?)$/))) {
          var copy = res.clone()
          caches.open(CACHE).then(function (c) { c.put(req, copy) })
        }
        return res
      })
    }),
  )
})
