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
    supportPhone?: string
    supportEmail?: string
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
