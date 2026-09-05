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
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(SHELL_CACHE)
    await cache.put(request, response.clone())
    await trimCache(SHELL_CACHE, POLICY.maxAssetEntries)
  }
  return response
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(PUBLIC_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (await isPublicResponseCacheable(response)) {
        await cache.put(request, response.clone())
        await trimCache(PUBLIC_CACHE, POLICY.maxPublicEntries)
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
      Promise.all(keys.filter((key) => !POLICY.retainedVersions.some((version) => key.startsWith(version))).map((key) => caches.delete(key)))
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
    event.respondWith(staleWhileRevalidate(request))
  }
})
