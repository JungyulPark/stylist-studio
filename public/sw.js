const CACHE_NAME = 'stylist-v3'
const STATIC_ASSETS = [
  '/',
  '/og-image.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests; skip API, cross-origin, and non-http
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && request.url.match(/\.(js|css|png|jpg|webp|avif|svg|woff2?)$/)) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ─── Morning push: "today's look has arrived" ────────────────────
self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('오늘, 뭐 입지?', {
      body: '오늘의 코디가 도착했어요 — 날씨에 맞춘 스타일을 확인하세요',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-style',
      data: { url: '/#subscription-dashboard' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
