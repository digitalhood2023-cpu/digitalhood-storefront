const DEFAULT_SUFFIX = 'store.digitalhood.info'
const DEFAULT_API = 'https://payments.digitalhood.info'
const cache = new Map()

export function normalizeSellerDomainSuffix(value = DEFAULT_SUFFIX) {
  return String(value || DEFAULT_SUFFIX)
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '')
}

export function parseSellerDomainHostname(hostname = '', suffix = DEFAULT_SUFFIX) {
  const normalizedHostname = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
  const normalizedSuffix = normalizeSellerDomainSuffix(suffix)
  const ending = `.${normalizedSuffix}`

  if (!normalizedHostname.endsWith(ending)) return null
  const label = normalizedHostname.slice(0, -ending.length)

  if (
    label.length < 3 ||
    label.length > 63 ||
    label.includes('.') ||
    label.startsWith('xn--') ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
  ) {
    return null
  }

  return { hostname: normalizedHostname, label, suffix: normalizedSuffix }
}

export function isSafeSellerDomainUrl(value = '', suffix = DEFAULT_SUFFIX) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      Boolean(parseSellerDomainHostname(url.hostname, suffix))
    )
  } catch {
    return false
  }
}

async function fetchJson(path, { apiBase = DEFAULT_API, suffix = DEFAULT_SUFFIX } = {}) {
  const key = `${apiBase}|${path}`
  const cached = cache.get(key)

  if (cached && Date.now() - cached.createdAt < cached.ttlMs) {
    return cached.value
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 3500)

  try {
    const response = await fetch(`${String(apiBase).replace(/\/+$/, '')}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = await response.json()
    const domain = payload?.domain

    if (
      !domain?.canonicalUrl ||
      !isSafeSellerDomainUrl(domain.canonicalUrl, suffix) ||
      !isSafeSellerDomainUrl(domain.url, suffix)
    ) {
      return null
    }

    cache.set(key, {
      createdAt: Date.now(),
      ttlMs: payload.redirect ? 5 * 60 * 1000 : 60 * 1000,
      value: payload,
    })
    return payload
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export function resolveSellerDomainHostname(hostname, options = {}) {
  return fetchJson(
    `/api/public/storefront-hosts/resolve?host=${encodeURIComponent(hostname)}`,
    options
  )
}

export function resolveSellerDomainForKey(sellerKey, options = {}) {
  return fetchJson(
    `/api/public/storefront-hosts/seller/${encodeURIComponent(sellerKey)}`,
    options
  )
}
