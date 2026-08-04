const API_BASE_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'

export type PublicSellerProduct = {
  id: string | number
  name: string
  slug?: string
  type?: string
  price: number
  regularPrice?: number
  salePrice?: number
  image?: string
  images?: string[]
  stockStatus?: string
  stockQuantity?: number | null
  stockLabel?: string
  stockTone?: 'success' | 'warning' | 'danger' | 'muted'
  canAddToCart?: boolean
  totalSales?: number
  averageRating?: number
  ratingCount?: number
  reviewCount?: number
  categories?: Array<{ id: number | string; name: string; slug?: string }>
}

export type PublicSellerStore = {
  seller: {
    id: string | number
    key: string
    storeName: string
    tagline?: string
    description?: string
    profilePhotoUrl?: string
    coverPhotoUrl?: string
    accountType?: string
    verified?: boolean
    joinedAt?: string
    yearsOnDigitalHood?: number
  }
  stats: {
    productsLive: number
    itemsSold: number
    ratingAverage: number | null
    ratingCount: number
    feedback: {
      positive: number
      neutral: number
      negative: number
      total: number
    }
  }
  products: PublicSellerProduct[]
  count: number
}

export async function fetchPublicSellerStore(sellerKey: string): Promise<PublicSellerStore> {
  const response = await fetch(
    `${API_BASE_URL}/api/public/sellers/${encodeURIComponent(sellerKey)}`
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data?.error || 'Unable to load seller store.')
  }

  return data
}

export type PublicStoreDirectoryFacet = {
  value: string
  count: number
}

export type PublicStoreDirectoryCard = {
  key: string
  url: string
  storeName: string
  tagline?: string
  description?: string
  profilePhotoUrl?: string
  coverPhotoUrl?: string
  accountType?: string
  verified?: boolean
  city?: string
  province?: string
  locationLabel?: string
  categories: string[]
  joinedAt?: string
  yearsOnDigitalHood?: number
  stats: {
    productsLive: number
    itemsSold: number
    ratingAverage: number | null
    ratingCount: number
  }
}

export type PublicStoreDirectoryResponse = {
  success: boolean
  stores: PublicStoreDirectoryCard[]
  total: number
  totalPages: number
  page: number
  perPage: number
  facets: {
    categories: PublicStoreDirectoryFacet[]
    locations: PublicStoreDirectoryFacet[]
    accountTypes: PublicStoreDirectoryFacet[]
  }
}

export type PublicStoreDirectoryQuery = {
  q?: string
  category?: string
  location?: string
  accountType?: string
  sort?: string
  page?: number
  perPage?: number
}

export async function fetchPublicSellerDirectory(
  query: PublicStoreDirectoryQuery = {}
): Promise<PublicStoreDirectoryResponse> {
  const params = new URLSearchParams()

  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.category) params.set('category', query.category)
  if (query.location) params.set('location', query.location)
  if (query.accountType) {
    params.set('account_type', query.accountType)
  }
  if (query.sort) params.set('sort', query.sort)
  if (query.page) params.set('page', String(query.page))
  if (query.perPage) {
    params.set('per_page', String(query.perPage))
  }

  const response = await fetch(
    `${API_BASE_URL}/api/public/sellers?${params.toString()}`
  )

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data?.error || 'Unable to load marketplace shops.'
    )
  }

  return data
}
