/* DigitalHood low-data service worker. Sensitive and transactional APIs are never cached. */
const VERSION = 'dh-pwa-v1'
const SHELL_CACHE = `${VERSION}:shell`
const PUBLIC_CACHE = `${VERSION}:public`
const APP_SHELL = [
  '/',
  '/offline.html',
  '/site.webmanifest',
  '/logo.jpg',
  '/favicon.ico',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
]

const PROHIBITED_PREFIXES = [
  '/api/account',
  '/api/auth',
  '/api/admin',
  '/api/seller',
  '/api/chat',
  '/api/create-order',
  '/api/lenco',
  '/api/payments',
  '/checkout',
  '/orders',
  '/track-order',
]

const PUBLIC_READ_PREFIXES = [
  '/api/public/products',
  '/api/public/sellers',
  '/api/public/stores',
  '/api/public/status',
]

function isProhibited(url) {
  return PROHIBITED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

function isPublicRead(request, url) {
  return request.method === 'GET' && PUBLIC_READ_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PUBLIC_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && !response.headers.get('set-cookie')) {
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)
  return cached || (await network) || new Response(JSON.stringify({ offline: true }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || request.method !== 'GET' || isProhibited(url)) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.match('/')) || (await caches.match('/offline.html'))
      )
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (isPublicRead(request, url)) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
