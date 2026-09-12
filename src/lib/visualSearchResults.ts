import type {
  ImageSearchResponse,
  SearchSuggestionProduct,
} from '@/lib/woocommerce'

const RESULT_KEY_PREFIX = 'digitalhood-visual-search-result-v2:'
const RESULT_INDEX_KEY = 'digitalhood-visual-search-result-index-v2'
const RESULT_TTL_MS = 30 * 60 * 1000
const MAX_SAVED_RESULTS = 4
const MAX_VISUAL_PRODUCTS = 24
const MAX_RECOMMENDED_PRODUCTS = 12

type VisualRecognition = {
  query: string
  object: string
  category: string
  brand: string
  model: string
  colour: string
  confidence: number
  source: string
  family: string
}

export type VisualSearchResult = {
  version: 2
  id: string
  createdAt: number
  query: string
  message: string
  imageSearchMode: string
  visualMatchConfidence: number
  visualComparedImages: number
  visualIndexedImages: number
  products: SearchSuggestionProduct[]
  recommendations: SearchSuggestionProduct[]
  recognition: VisualRecognition
}

function getRecommendedProducts(
  response: ImageSearchResponse,
  visualProducts: SearchSuggestionProduct[]
) {
  const visualIds = new Set(visualProducts.map((product) => Number(product.id)))
  const seen = new Set<number>()

  return (Array.isArray(response.recommendations) ? response.recommendations : [])
    .filter((product) => {
      const productId = Number(product?.id)
      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0 ||
        visualIds.has(productId) ||
        seen.has(productId)
      ) {
        return false
      }
      seen.add(productId)
      return product.stock_status === 'instock' && product.can_add_to_cart !== false
    })
    .slice(0, MAX_RECOMMENDED_PRODUCTS)
}

function normalizeRecognition(response: ImageSearchResponse): VisualRecognition {
  const recognition = response.recognition || {}
  const clean = (value: unknown, maximum = 120) =>
    String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum)

  return {
    query: clean(recognition.query || response.correctedQuery || response.query, 160),
    object: clean(recognition.object),
    category: clean(recognition.category),
    brand: clean(recognition.brand, 60),
    model: clean(recognition.model, 80),
    colour: clean(recognition.colour, 40),
    confidence: Math.min(1, clampMetric(recognition.confidence)),
    source: clean(recognition.source, 40),
    family: clean(recognition.family, 60),
  }
}

function createResultId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

function isValidResultId(value: string) {
  return /^[a-z0-9-]{12,64}$/i.test(value)
}

function clampMetric(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function getVisualProducts(response: ImageSearchResponse) {
  const seen = new Set<number>()
  const candidates = (Array.isArray(response.suggestions) ? response.suggestions : [])
    .filter((product) => {
      const productId = Number(product?.id)
      const similarity = Number(product?.visual_similarity)

      if (
        !Number.isSafeInteger(productId) ||
        productId <= 0 ||
        !product.visual_match_tier ||
        !Number.isFinite(similarity) ||
        similarity <= 0 ||
        seen.has(productId)
      ) {
        return false
      }

      seen.add(productId)
      return true
    })

  const bestScore = Math.max(
    0,
    ...candidates.map((product) => Number(product.visual_similarity || 0))
  )
  const resultFloor = bestScore >= 0.96
    ? Math.max(0.88, bestScore - 0.08)
    : bestScore >= 0.88
      ? Math.max(0.82, bestScore - 0.1)
      : Math.max(0.76, bestScore - 0.06)

  return candidates
    .filter((product) => Number(product.visual_similarity) >= resultFloor)
    .slice(0, MAX_VISUAL_PRODUCTS)
}

function readResultIndex() {
  if (typeof window === 'undefined') return [] as string[]

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(RESULT_INDEX_KEY) || '[]')
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string' && isValidResultId(value))
      : []
  } catch {
    return []
  }
}

function writeResultIndex(ids: string[]) {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(RESULT_INDEX_KEY, JSON.stringify(ids))
  } catch {
    // Visual results still travel in router state if session storage is unavailable.
  }
}

export function createVisualSearchResult(
  response: ImageSearchResponse,
  id = createResultId()
): VisualSearchResult {
  const products = getVisualProducts(response)
  return {
    version: 2,
    id,
    createdAt: Date.now(),
    query: String(response.correctedQuery || response.query || '').trim().slice(0, 160),
    message: String(response.message || '').trim().slice(0, 320),
    imageSearchMode: String(response.imageSearchMode || '').trim().slice(0, 80),
    visualMatchConfidence: Math.min(1, clampMetric(response.visualMatchConfidence)),
    visualComparedImages: Math.trunc(clampMetric(response.visualComparedImages)),
    visualIndexedImages: Math.trunc(clampMetric(response.visualIndexedImages)),
    products,
    recommendations: getRecommendedProducts(response, products),
    recognition: normalizeRecognition(response),
  }
}

export function saveVisualSearchResult(response: ImageSearchResponse) {
  const result = createVisualSearchResult(response)
  if (typeof window === 'undefined') return result

  const retainedIds = readResultIndex().filter((id) => id !== result.id)
  const nextIds = [result.id, ...retainedIds].slice(0, MAX_SAVED_RESULTS)

  try {
    window.sessionStorage.setItem(
      `${RESULT_KEY_PREFIX}${result.id}`,
      JSON.stringify(result)
    )
    retainedIds.slice(MAX_SAVED_RESULTS - 1).forEach((id) => {
      window.sessionStorage.removeItem(`${RESULT_KEY_PREFIX}${id}`)
    })
    writeResultIndex(nextIds)
  } catch {
    // The caller also passes the result through router state.
  }

  return result
}

export function isUsableVisualSearchResult(value: unknown): value is VisualSearchResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<VisualSearchResult>

  return (
    candidate.version === 2 &&
    typeof candidate.id === 'string' &&
    isValidResultId(candidate.id) &&
    Number.isFinite(Number(candidate.createdAt)) &&
    Number(candidate.createdAt) > Date.now() - RESULT_TTL_MS &&
    Array.isArray(candidate.products) &&
    candidate.products.length <= MAX_VISUAL_PRODUCTS &&
    candidate.products.every(
      (product) =>
        Number.isSafeInteger(Number(product?.id)) &&
        Number(product.id) > 0 &&
        Boolean(product.visual_match_tier) &&
        Number(product.visual_similarity) > 0
    ) &&
    Array.isArray(candidate.recommendations) &&
    candidate.recommendations.length <= MAX_RECOMMENDED_PRODUCTS &&
    candidate.recommendations.every(
      (product) =>
        Number.isSafeInteger(Number(product?.id)) &&
        Number(product.id) > 0 &&
        !product.visual_match_tier
    ) &&
    Boolean(candidate.recognition) &&
    typeof candidate.recognition === 'object'
  )
}

export function loadVisualSearchResult(id: string) {
  if (typeof window === 'undefined' || !isValidResultId(id)) return null

  const key = `${RESULT_KEY_PREFIX}${id}`

  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(key) || 'null')
    if (isUsableVisualSearchResult(parsed)) return parsed
    window.sessionStorage.removeItem(key)
  } catch {
    window.sessionStorage.removeItem(key)
  }

  return null
}
