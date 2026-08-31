import { isSafeSellerDomainUrl } from '@/lib/sellerDomains'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

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
  const payload = await domainFetch<SellerStorefrontResolution>(
    `/api/public/storefront-hosts/resolve?host=${encodeURIComponent(hostname)}`
  )
  assertSafeDomain(payload.domain)
  return payload
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
