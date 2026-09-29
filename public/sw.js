/* DigitalHood low-data service worker. Sensitive and transactional APIs are never cached. */
importScripts('/network-cache-policy.js')

const POLICY = self.DIGITALHOOD_NETWORK_POLICY
if (!POLICY) throw new Error('DigitalHood cache policy is unavailable')
const VERSION = POLICY.version
const SHELL_CACHE = `${VERSION}:shell`
const PUBLIC_CACHE = `${VERSION}:public`
const APP_SHELL = POLICY.applicationShell
const PROHIBITED_PREFIXES = POLICY.networkOnlyPrefixes
const PUBLIC_READ_PREFIXES = POLICY.publicReadPrefixes

function isProhibited(url) {
  return PROHIBITED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

function isPublicRead(request, url) {
  return request.method === 'GET' && PUBLIC_READ_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

async function trimCache(cacheName, maximumEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  const overflow = keys.length - maximumEntries
  if (overflow > 0) await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)))
}

async function isPublicResponseCacheable(response) {
  if (!response.ok || response.headers.get('set-cookie')) return false
  const cacheControl = String(response.headers.get('cache-control') || '').toLowerCase()
  if (cacheControl.includes('private') || cacheControl.includes('no-store')) return false
  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength) return contentLength <= POLICY.maxPublicResponseBytes
  const body = await response.clone().arrayBuffer()
  return body.byteLength <= POLICY.maxPublicResponseBytes
}

async function cacheFirst(request) {
  try {
    const cached = await caches.match(request)
    if (cached) return cached
  } catch { /* Storage failure must not block an online asset. */ }
  const response = await fetch(request)
  if (response.ok) {
    try {
      const cache = await caches.open(SHELL_CACHE)
      await cache.put(request, response.clone())
      await trimCache(SHELL_CACHE, POLICY.maxAssetEntries)
    } catch { /* Return the successful network response even when storage is full. */ }
  }
  return response
}

async function staleWhileRevalidate(request, event) {
  const network = fetch(request)
    .then(async (response) => {
      try {
        if (await isPublicResponseCacheable(response)) {
          const cache = await caches.open(PUBLIC_CACHE)
          await cache.put(request, response.clone())
          await trimCache(PUBLIC_CACHE, POLICY.maxPublicEntries)
        }
      } catch { /* Optional public caching must not discard a good response. */ }
      return response
    })
    .catch(() => null)
  event.waitUntil(network.then(() => undefined))
  let cached = null
  try {
    const cache = await caches.open(PUBLIC_CACHE)
    cached = await cache.match(request)
  } catch { /* Continue with the network. */ }
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
      Promise.all(keys.filter((key) => !POLICY.retainedVersions.some((version) => key.startsWith(version))).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || request.method !== 'GET' || isProhibited(url)) return

  // Lite is real server HTML. Never substitute an old React shell for this route.
  if (url.pathname === '/lite' || url.pathname.startsWith('/lite/')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const currentShell = await caches.open(SHELL_CACHE)
        return (await currentShell.match('/')) || (await currentShell.match('/offline.html'))
      })
    )
    return
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (isPublicRead(request, url)) {
    event.respondWith(staleWhileRevalidate(request, event))
  }
})
