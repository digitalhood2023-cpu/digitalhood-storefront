import { getAccountToken } from '@/api/account'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

export type FeedbackTargetType = 'product' | 'seller' | 'buyer'

export type FeedbackEligibility = {
  id: string
  orderId: number
  orderNumber: string
  orderItemId?: number | null
  authorRole: 'buyer' | 'seller'
  targetType: FeedbackTargetType
  targetId: string
  targetPublicKey?: string | null
  targetDisplayName: string
  seller?: {
    id: string
    publicKey?: string | null
    name: string
  } | null
  product?: {
    id: number
    name: string
    imageUrl: string
  } | null
  deliveredAt?: string | null
  opensAt?: string | null
  closesAt?: string | null
  status: 'eligible' | 'submitted' | 'expired' | 'revoked'
  submittedFeedbackId?: string | null
}

export type MarketplaceFeedback = {
  id: string
  orderId?: number
  authorRole: 'buyer' | 'seller'
  authorName: string
  targetType: FeedbackTargetType
  targetId?: string
  targetPublicKey?: string | null
  targetDisplayName: string
  rating: number
  sentiment: 'positive' | 'neutral' | 'negative'
  title?: string
  comment?: string
  tags: string[]
  dimensions: Record<string, number>
  verifiedPurchase: boolean
  moderationStatus?: 'published' | 'held' | 'removed' | 'revision_requested'
  submittedAt?: string | null
  editedAt?: string | null
  media: Array<{
    id: string
    type: 'image' | 'video'
    url: string
    thumbnailUrl?: string
    mimeType?: string
  }>
  response?: {
    id: string
    responderRole: 'seller' | 'buyer'
    text: string
    createdAt?: string | null
  } | null
}

export type FeedbackSummary = {
  count: number
  averageRating: number
  positivePercent: number
  sentiment: {
    positive: number
    neutral: number
    negative: number
  }
  ratings: Record<1 | 2 | 3 | 4 | 5, number>
  dimensions: Record<string, number>
  updatedAt?: string | null
}

type Pagination = {
  page: number
  limit: number
  count: number
  pages: number
}

async function parseResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.error ||
      data?.details ||
      `Feedback request failed with status ${response.status}`
    )
  }
  return data as T
}

async function accountFeedbackRequest<T>(path: string, options: RequestInit = {}) {
  const token = getAccountToken()
  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  return parseResponse<T>(response)
}

export async function getFeedbackEligibilities(options: {
  orderId?: string | number
  page?: number
  limit?: number
} = {}) {
  const params = new URLSearchParams()
  if (options.orderId) params.set('order', String(options.orderId))
  if (options.page) params.set('page', String(options.page))
  if (options.limit) params.set('limit', String(options.limit))
  const query = params.size ? `?${params.toString()}` : ''
  return accountFeedbackRequest<{
    success: boolean
    eligibilities: FeedbackEligibility[]
    pagination: Pagination
  }>(`/api/account/feedback/eligibilities${query}`)
}

export async function getGivenFeedback(page = 1) {
  return accountFeedbackRequest<{
    success: boolean
    feedback: MarketplaceFeedback[]
    pagination: Pagination
  }>(`/api/account/feedback/given?page=${page}&limit=20`)
}

export async function getReceivedFeedback(page = 1) {
  return accountFeedbackRequest<{
    success: boolean
    summary: FeedbackSummary
    feedback: MarketplaceFeedback[]
    pagination: Pagination
  }>(`/api/account/feedback/received?page=${page}&limit=20`)
}

export async function submitMarketplaceFeedback(payload: {
  eligibilityId: string
  rating: number
  title?: string
  comment?: string
  tags?: string[]
  dimensions?: Record<string, number>
  media?: Array<{
    type: 'image' | 'video'
    url: string
    thumbnailUrl?: string
    mimeType?: string
    byteSize?: number
  }>
}) {
  return accountFeedbackRequest<{
    success: boolean
    feedback: MarketplaceFeedback
    moderation: { status: string; message: string }
  }>('/api/account/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function prepareFeedbackImage(file: File) {
  if (
    !file.type.startsWith('image/') ||
    file.size <= 1_200_000 ||
    typeof createImageBitmap !== 'function'
  ) return file

  const bitmap = await createImageBitmap(file)
  const maximum = 1800
  const scale = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
  return blob
    ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
    : file
}

export async function uploadFeedbackMedia(files: File[]) {
  if (files.length > 5) throw new Error('Add no more than 5 photos or videos.')
  if (files.filter((file) => file.type.startsWith('video/')).length > 1) {
    throw new Error('Add no more than one short video.')
  }

  const prepared = await Promise.all(files.map(prepareFeedbackImage))
  const formData = new FormData()
  prepared.forEach((file) => formData.append('photos', file))
  const response = await fetch(`${PAYMENTS_API_URL}/api/account/feedback/media`, {
    method: 'POST',
    headers: {
      ...(getAccountToken() ? { Authorization: `Bearer ${getAccountToken()}` } : {}),
    },
    body: formData,
  })
  return parseResponse<{
    success: boolean
    media: Array<{
      type: 'image' | 'video'
      url: string
      mimeType: string
      byteSize: number
      filename: string
    }>
  }>(response)
}

export async function getPublicFeedback(
  targetType: 'products' | 'sellers' | 'members',
  targetKey: string | number,
  page = 1
) {
  return parseResponse<{
    success: boolean
    summary: FeedbackSummary
    feedback: MarketplaceFeedback[]
    pagination: Pagination
  }>(
    await fetch(
      `${PAYMENTS_API_URL}/api/public/${targetType}/${encodeURIComponent(String(targetKey))}/feedback?page=${page}&limit=20`
    )
  )
}
