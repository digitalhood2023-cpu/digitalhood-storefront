type DiscoveryInterestProduct = {
  name?: string
  category?: string
}

const STOP_WORDS = new Set([
  'and',
  'for',
  'from',
  'marketplace',
  'new',
  'of',
  'product',
  'products',
  'the',
  'with',
])

function normalizeInterest(value: unknown) {
  const raw = String(value || '').trim()

  if (!raw || /@/.test(raw) || /^\+?[\d\s()-]{8,}$/.test(raw)) return ''

  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

function getProductInterest(product: DiscoveryInterestProduct) {
  const category = normalizeInterest(product.category)

  if (category && category !== 'marketplace') return category

  return normalizeInterest(product.name)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .slice(0, 4)
    .join(' ')
}

export function deriveHomeDiscoveryInterests({
  searches = [],
  recentlyViewed = [],
}: {
  searches?: string[]
  recentlyViewed?: DiscoveryInterestProduct[]
}) {
  const candidates = [
    ...searches,
    ...recentlyViewed.map(getProductInterest),
  ]
  const seen = new Set<string>()
  const interests: string[] = []

  for (const candidate of candidates) {
    const normalized = normalizeInterest(candidate)

    if (
      normalized.length < 2 ||
      normalized === 'marketplace' ||
      seen.has(normalized)
    ) {
      continue
    }

    seen.add(normalized)
    interests.push(normalized)

    if (interests.length >= 5) break
  }

  return interests
}
