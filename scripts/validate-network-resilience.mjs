import fs from 'node:fs'
import vm from 'node:vm'

const read = (path) => fs.readFileSync(path, 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(`Network resilience validation failed: ${message}`)
}

const worker = read('public/sw.js')
const policySource = read('public/network-cache-policy.js')
const policySandbox = { self: {} }
vm.runInNewContext(policySource, policySandbox)
const policy = policySandbox.self.DIGITALHOOD_NETWORK_POLICY
const network = read('src/lib/networkResilience.ts')
const account = read('src/context/AccountContext.tsx')
const notifications = read('src/context/NotificationsContext.tsx')
const main = read('src/main.tsx')
const manifest = JSON.parse(read('public/site.webmanifest'))

for (const prohibited of [
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
]) {
  assert(policy.networkOnlyPrefixes.includes(prohibited), `${prohibited} must remain network-only`)
}

assert(worker.includes("importScripts('/network-cache-policy.js')"), 'the service worker must load the executable cache policy')
assert(policy.version === policy.retainedVersions[0], 'the current service-worker cache version must be first in rollback retention')
assert(policy.retainedVersions.length === 2, 'exactly one previous public shell version must be retained for rollback')
assert(policy.maxPublicEntries <= 100 && policy.maxAssetEntries <= 150, 'runtime caches must have bounded entry counts')
assert(policy.maxPublicResponseBytes <= 524288, 'public API cache entries must stay under 512 KiB')
assert(worker.includes("cacheControl.includes('private')") && worker.includes("cacheControl.includes('no-store')"), 'private and no-store responses must never be cached')

assert(
  worker.includes("request.method !== 'GET'") &&
    !worker.includes("addEventListener('sync'") &&
    !worker.includes('backgroundSync'),
  'the service worker must never queue mutations'
)
assert(
  network.includes("'notification_read'") &&
    network.includes("'notification_archive'") &&
    network.includes("'notification_mark_all_read'") &&
    !network.includes("'payment'") &&
    !network.includes("'delivery_confirmation'"),
  'only allow-listed idempotent account actions may retry'
)
assert(
  account.includes('clearOfflineAccountQueue()') &&
    notifications.includes('flushOfflineActions') &&
    notifications.includes("window.addEventListener('online', flush)"),
  'logout must clear account retry state and reconnect must flush it'
)
assert(
  main.includes('registerDigitalHoodServiceWorker()') && main.includes('applyNetworkPreferences()'),
  'the app must register its shell and network preference runtime'
)
assert(
  manifest.start_url === '/' && manifest.scope === '/' && manifest.display === 'standalone',
  'the web manifest must be installable at marketplace scope'
)

console.log('Network resilience validation passed')
