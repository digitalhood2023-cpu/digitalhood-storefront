export type MarketplacePolicyPage = {
  slug: string
  title: string
  subtitle: string
  lastUpdated: string
  highlights?: string[]
  actions?: { name: string; href: string }[]
  sections: {
    title: string
    body: string[]
    links?: { name: string; href: string }[]
  }[]
}

export const MARKETPLACE_POLICY_LINKS = [
  { name: 'Help & FAQs', href: '/help' },
  { name: 'Returns & refunds', href: '/returns' },
  { name: 'Shipping & delivery', href: '/shipping' },
  { name: 'Warranty & repairs', href: '/warranty' },
  { name: 'Marketplace terms', href: '/marketplace-terms' },
  { name: 'Seller terms', href: '/seller-terms' },
  { name: 'Restricted products', href: '/prohibited-products' },
  { name: 'Dispute resolution', href: '/dispute-resolution' },
  { name: 'Privacy & data', href: '/data-protection' },
  { name: 'Security', href: '/incident-response' },
]

function validPolicy(value: unknown, slug: string): value is MarketplacePolicyPage {
  if (!value || typeof value !== 'object') return false
  const p = value as MarketplacePolicyPage
  const validLinks = (links?: { name: string; href: string }[]) => links === undefined ||
    Array.isArray(links) && links.length <= 30 && links.every(link => typeof link?.name === 'string' && typeof link.href === 'string' && /^\/(?!\/)[a-z0-9/?=&%#_-]*$/i.test(link.href))
  return p.slug === slug && typeof p.title === 'string' && typeof p.subtitle === 'string' && typeof p.lastUpdated === 'string' &&
    (p.highlights === undefined || Array.isArray(p.highlights) && p.highlights.every(item => typeof item === 'string')) &&
    validLinks(p.actions) && Array.isArray(p.sections) && p.sections.length > 0 && p.sections.length <= 30 &&
    p.sections.every(section => typeof section?.title === 'string' && Array.isArray(section.body) && section.body.every(text => typeof text === 'string') && validLinks(section.links))
}

// The server places this public JSON outside React's root. A direct visit needs
// no extra request; internal navigation loads only that policy, not all policy
// text in every shopper's JavaScript bundle. No private data or credentials.
export function readEmbeddedPolicy(slug: string): MarketplacePolicyPage | null {
  try {
    const value: unknown = JSON.parse(document.getElementById('dh-public-policy')?.textContent || 'null')
    return validPolicy(value, slug) ? value : null
  } catch { return null }
}

const policyCache = new Map<string, { policy: MarketplacePolicyPage; at: number }>()
export async function loadPublicPolicy(slug: string, signal: AbortSignal): Promise<MarketplacePolicyPage> {
  if (!MARKETPLACE_POLICY_LINKS.some(link => link.href === `/${slug}`)) throw new Error('Policy not found.')
  const cached = policyCache.get(slug)
  if (cached && Date.now() - cached.at < 300000) return cached.policy
  const response = await fetch(`/api/public/policies/${encodeURIComponent(slug)}`, {
    method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store', signal,
  })
  if (!response.ok) throw new Error('Policy could not be loaded.')
  const value: unknown = await response.json()
  if (!validPolicy(value, slug)) throw new Error('Policy response was incomplete.')
  policyCache.set(slug, { policy: value, at: Date.now() })
  return value
}
