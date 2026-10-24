// Public product feedback only. Never use seller draft IDs or authenticated Trust data.
export type ProductFeedbackReview = {
  id: string; reviewer: string; review: string; title: string; rating: number; dateCreated: string
  response: string; media: Array<{ url: string; type: 'image' | 'video' }>
}
export type ProductFeedback = {
  reviews: ProductFeedbackReview[]
  count: number; averageRating: number; page: number; pages: number
}

export function publishedProductId(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (!/^[1-9]\d*$/.test(String(value))) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}
function text(value: unknown) { return typeof value === 'string' ? value : '' }
function safeMediaUrl(value: unknown) {
  try { const url = new URL(text(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : '' } catch { return '' }
}

export function parseProductFeedback(value: unknown, productId: number): ProductFeedback {
  const data = record(value)
  if (data.success !== true || !Array.isArray(data.reviews) || publishedProductId(data.productId) !== productId) {
    throw new Error('Invalid product feedback response.')
  }
  const reviews = data.reviews.flatMap((value): ProductFeedbackReview[] => {
    const row = record(value), rating = Number(row.rating)
    // The public route already filters moderation; this also guards future API changes.
    if (row.verified !== true || (row.moderationStatus && row.moderationStatus !== 'published') || !Number.isInteger(rating) || rating < 1 || rating > 5 || !row.id) return []
    return [{
      id: String(row.id), reviewer: text(row.reviewer) || 'Marketplace buyer', review: text(row.review), title: text(row.title), rating,
      dateCreated: text(row.dateCreated), response: text(record(row.response).text),
      media: (Array.isArray(row.media) ? row.media : []).slice(0, 5).flatMap(value => {
        const item = record(value), url = safeMediaUrl(item.url)
        return url && (item.type === 'image' || item.type === 'video') ? [{ url, type: item.type as 'image' | 'video' }] : []
      }),
    }]
  })
  const summary = record(data.summary), pagination = record(data.pagination)
  // Legacy Woo reviews have no marketplace aggregate: use only verified rows, not all reviews.
  const aggregate = data.source === 'digitalhood-verified-delivery' && Number.isSafeInteger(summary.count) && Number(summary.count) >= reviews.length && Number.isFinite(summary.averageRating) && Number(summary.averageRating) >= 1 && Number(summary.averageRating) <= 5
  return {
    reviews,
    count: aggregate ? Number(summary.count) : reviews.length,
    averageRating: aggregate ? Number(summary.averageRating) : reviews.length ? reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length : 0,
    page: Number.isSafeInteger(pagination.page) && Number(pagination.page) > 0 ? Number(pagination.page) : 1,
    pages: aggregate && Number.isSafeInteger(pagination.pages) && Number(pagination.pages) > 0 ? Number(pagination.pages) : 1,
  }
}

export async function requestProductFeedback(base: string, productId: number, page: number, signal: AbortSignal) {
  if (publishedProductId(productId) !== productId) throw new Error('A published product is required.')
  const response = await fetch(`${base.replace(/\/$/, '')}/api/products/${productId}/reviews?per_page=20&page=${page}`, {
    signal, credentials: 'omit', cache: 'no-cache',
  })
  if (!response.ok) throw new Error('Buyer feedback is temporarily unavailable.')
  return parseProductFeedback(await response.json(), productId)
}
