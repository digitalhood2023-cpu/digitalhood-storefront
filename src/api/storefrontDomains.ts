import { isSafeSellerDomainUrl } from '@/lib/sellerDomains'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

const resolutionCache = new Map<
  string,
  { expiresAt: number; value: SellerStorefrontResolution }
>()
const resolutionRequests = new Map<string, Promise<SellerStorefrontResolution>>()

export type SellerStorefrontDomain = {
  id: string
  sellerId: string
  publicSellerKey: string
  label: string
  hostname: string
  url: string
  kind: 'canonical' | 'redirect' | 'retired' | string
  availability: 'active' | 'suspended' | string
  availabilityReason?: string
  isCanonical: boolean
  canonicalHostname: string
  canonicalUrl: string
  marketplacePath: string
}

export type SellerStorefrontResolution = {
  success: boolean
  redirect: boolean
  domain: SellerStorefrontDomain
  seller: {
    id?: string
    key: string
    storeName: string
    verified?: boolean
  }
  marketplaceUrl: string
}

async function domainFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (response.status === 404
          ? 'This marketplace store is not available.'
          : 'Unable to load this marketplace store.')
    )
  }

  return payload as T
}

function assertSafeDomain(domain?: SellerStorefrontDomain) {
  if (
    !domain ||
    !isSafeSellerDomainUrl(domain.url) ||
    !isSafeSellerDomainUrl(domain.canonicalUrl)
  ) {
    throw new Error('The marketplace returned an invalid store domain.')
  }

  return domain
}

export async function resolveSellerStorefrontHostname(hostname: string) {
  const key = String(hostname || '').trim().toLowerCase()
  const cached = resolutionCache.get(key)

  if (cached && cached.expiresAt > Date.now()) return cached.value

  const pending = resolutionRequests.get(key)
  if (pending) return pending

  const request = domainFetch<SellerStorefrontResolution>(
    `/api/public/storefront-hosts/resolve?host=${encodeURIComponent(key)}`
  ).then((payload) => {
    assertSafeDomain(payload.domain)
    resolutionCache.set(key, {
      expiresAt: Date.now() + (payload.redirect ? 5 * 60_000 : 60_000),
      value: payload,
    })
    return payload
  }).finally(() => {
    resolutionRequests.delete(key)
  })

  resolutionRequests.set(key, request)
  return request
}

export async function fetchSellerStorefrontDomain(sellerKey: string) {
  const payload = await domainFetch<{
    success: boolean
    domain: SellerStorefrontDomain
    seller: { key: string; storeName: string }
  }>(
    `/api/public/storefront-hosts/seller/${encodeURIComponent(sellerKey)}`
  )
  assertSafeDomain(payload.domain)
  return payload
}
