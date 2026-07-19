/* 1% service worker — network-first for navigation, cache-first for assets.
   Hashed Vite filenames make stale-asset bugs structurally impossible. */
var CACHE = 'onepercent-v18'

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (k) {
              return k !== CACHE
            })
            .map(function (k) {
              return caches.delete(k)
            }),
        )
      })
      .then(function () {
        return self.clients.claim()
      }),
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
          caches.open(CACHE).then(function (c) {
            c.put(req, copy)
          })
          return res
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
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
        if (res.ok) {
          var copy = res.clone()
          caches.open(CACHE).then(function (c) {
            c.put(req, copy)
          })
        }
        return res
      })
    }),
  )
})
