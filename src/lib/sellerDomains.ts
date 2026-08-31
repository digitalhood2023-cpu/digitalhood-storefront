const DEFAULT_SELLER_DOMAIN_SUFFIX = 'store.digitalhood.info'
const DEFAULT_MARKETPLACE_ORIGIN = 'https://store.digitalhood.info'

export type SellerDomainContext = {
  hostname: string
  label: string
  suffix: string
}

export function getSellerDomainSuffix() {
  return String(
    import.meta.env.VITE_SELLER_STOREFRONT_SUFFIX ||
      DEFAULT_SELLER_DOMAIN_SUFFIX
  )
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '')
}

export function parseSellerDomainHostname(
  hostname: string,
  suffix = getSellerDomainSuffix()
): SellerDomainContext | null {
  const normalizedHostname = String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
  const normalizedSuffix = String(suffix || '')
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, '')
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

  return {
    hostname: normalizedHostname,
    label,
    suffix: normalizedSuffix,
  }
}

export function getCurrentSellerDomainContext() {
  if (typeof window === 'undefined') return null
  return parseSellerDomainHostname(window.location.hostname)
}

export function getMarketplaceOrigin() {
  return String(
    import.meta.env.VITE_MARKETPLACE_ORIGIN ||
      DEFAULT_MARKETPLACE_ORIGIN
  ).replace(/\/+$/, '')
}

export function getMarketplaceUrl(path = '/') {
  return new URL(path || '/', `${getMarketplaceOrigin()}/`).toString()
}

export function isSafeSellerDomainUrl(value = '') {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      Boolean(parseSellerDomainHostname(url.hostname))
    )
  } catch {
    return false
  }
}
