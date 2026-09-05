import fs from 'node:fs'
import vm from 'node:vm'

const sandbox = { self: {} }
vm.runInNewContext(fs.readFileSync('public/network-cache-policy.js', 'utf8'), sandbox)
const policy = sandbox.self.DIGITALHOOD_NETWORK_POLICY
const worker = fs.readFileSync('public/sw.js', 'utf8')
const server = fs.readFileSync('server.js', 'utf8')
const images = fs.readFileSync('src/lib/images.ts', 'utf8')

function strategy({ method = 'GET', path, mode = 'cors', sameOrigin = true }) {
  if (!sameOrigin || method !== 'GET' || policy.networkOnlyPrefixes.some((prefix) => path.startsWith(prefix))) return 'network-only'
  if (mode === 'navigate') return 'network-first-offline-shell'
  if (path.startsWith('/assets/')) return 'cache-first-versioned'
  if (policy.publicReadPrefixes.some((prefix) => path.startsWith(prefix))) return 'stale-while-revalidate-bounded'
  return 'network-only'
}

const cases = [
  [{ path: '/api/public/products?per_page=4' }, 'stale-while-revalidate-bounded'],
  [{ path: '/api/public/status' }, 'stale-while-revalidate-bounded'],
  [{ path: '/api/account/orders' }, 'network-only'],
  [{ path: '/api/chat/conversations' }, 'network-only'],
  [{ path: '/api/create-order', method: 'POST' }, 'network-only'],
  [{ path: '/orders/28447', mode: 'navigate' }, 'network-only'],
  [{ path: '/product/phone', mode: 'navigate' }, 'network-first-offline-shell'],
  [{ path: '/assets/app.js' }, 'cache-first-versioned'],
  [{ path: '/api/public/products', sameOrigin: false }, 'network-only'],
]

const failures = cases.filter(([input, expected]) => strategy(input) !== expected)
if (failures.length) throw new Error(`Network scenario failures: ${JSON.stringify(failures)}`)
if (!worker.includes('arrayBuffer()') || !worker.includes('maxPublicResponseBytes')) throw new Error('Unknown-size public responses must be measured before caching.')
if (!worker.includes("const currentShell = await caches.open(SHELL_CACHE)")) throw new Error('Offline navigation must prefer the current release shell.')
if (!server.includes("normalizedPath.endsWith('/network-cache-policy.js')") || !server.includes("'no-cache, no-store, must-revalidate'")) throw new Error('The cache policy itself must never be served stale.')
if (!images.includes('CLOUDFLARE_LOW_DATA_IMAGE_QUALITY') || !images.includes("dataset.dataSaver === 'on'")) throw new Error('Low-data image quality must be adaptive.')

console.log(JSON.stringify({ success: true, scenarios: cases.length, cacheVersion: policy.version, retainedVersions: policy.retainedVersions }))
