const CACHE_NAME = 'devpocket-shell-v1'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/pwa-180.png',
  '/pwa-192.png',
  '/pwa-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((key) => key.startsWith('devpocket-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put('/', response.clone())
      }
      return response
    }).catch(async () => {
      return await caches.match('/') ?? new Response('DevPocket perlu koneksi internet untuk memuat catatan.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/fonts/') || APP_SHELL.includes(url.pathname)) {
    event.respondWith(caches.match(request).then(async (cached) => {
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    }))
  }
})
