const API_BASE_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'

const API_ORIGIN =
  API_BASE_URL.replace(
    /\/+$/,
    ''
  )

const PUBLIC_SELLER_CACHE_TTL_MS =
  5 * 60 * 1000

type TimedCacheEntry<T> = {
  expiresAt: number
  value: T
}

const publicSellerStoreCache =
  new Map<
    string,
    TimedCacheEntry<PublicSellerStore>
  >()

const publicSellerStoreRequests =
  new Map<
    string,
    Promise<PublicSellerStore>
  >()

const publicSellerDirectoryCache =
  new Map<
    string,
    TimedCacheEntry<PublicStoreDirectoryResponse>
  >()

const publicSellerDirectoryRequests =
  new Map<
    string,
    Promise<PublicStoreDirectoryResponse>
  >()

function getTimedCacheValue<T>(
  cache: Map<
    string,
    TimedCacheEntry<T>
  >,
  key: string
) {
  const entry =
    cache.get(key)

  if (
    !entry ||
    entry.expiresAt <= Date.now()
  ) {
    cache.delete(key)
    return null
  }

  return entry.value
}

function setTimedCacheValue<T>(
  cache: Map<
    string,
    TimedCacheEntry<T>
  >,
  key: string,
  value: T
) {
  cache.set(
    key,
    {
      expiresAt:
        Date.now() +
        PUBLIC_SELLER_CACHE_TTL_MS,
      value,
    }
  )

  return value
}

export function resolvePublicSellerAssetUrl(
  value?: string
) {
  const normalized =
    String(value || '').trim()

  if (!normalized) {
    return ''
  }

  if (
    /^(?:https?:|data:|blob:)/i.test(
      normalized
    )
  ) {
    return normalized
  }

  if (
    normalized.startsWith(
      '/api/public/sellers/'
    ) ||
    normalized.startsWith(
      '/uploads/'
    )
  ) {
    return `${API_ORIGIN}${normalized}`
  }

  if (
    normalized.startsWith('/')
  ) {
    return normalized
  }

  return `${API_ORIGIN}/${normalized.replace(
    /^\/+/, ''
  )}`
}

function normalizeSellerBranding<
  T extends {
    profilePhotoUrl?: string
    coverPhotoUrl?: string
  },
>(
  seller: T
): T {
  return {
    ...seller,
    profilePhotoUrl:
      resolvePublicSellerAssetUrl(
        seller.profilePhotoUrl
      ),
    coverPhotoUrl:
      resolvePublicSellerAssetUrl(
        seller.coverPhotoUrl
      ),
  }
}

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

export type PublicSellerStoreFilters = {
  q?: string
  category?: string
  availability?: string
  minPrice?: string | number
  maxPrice?: string | number
  sort?: string
}

export type PublicSellerStoreFacetCategory = {
  name: string
  slug: string
  count: number
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
  page: number
  perPage: number
  totalPages: number
  facets: {
    categories: PublicSellerStoreFacetCategory[]
    availability: {
      inStock: number
      onSale: number
    }
    price: {
      min: number
      max: number
    }
  }
  appliedFilters: {
    q: string
    category: string
    availability: string
    minPrice: number | null
    maxPrice: number | null
    sort: string
  }
}

function normalizePublicSellerStore(
  data: any
): PublicSellerStore {
  const feedback =
    data?.stats?.feedback &&
    typeof data.stats.feedback ===
      'object'
      ? data.stats.feedback
      : {}

  return {
    ...data,
    seller:
      data?.seller
        ? normalizeSellerBranding(
            data.seller
          )
        : data?.seller,
    stats: {
      productsLive:
        Number(
          data?.stats?.productsLive ||
            0
        ) || 0,
      itemsSold:
        Number(
          data?.stats?.itemsSold ||
            0
        ) || 0,
      ratingAverage:
        data?.stats?.ratingAverage ===
          null ||
        data?.stats?.ratingAverage ===
          undefined
          ? null
          : Number(
              data.stats
                .ratingAverage
            ) || 0,
      ratingCount:
        Number(
          data?.stats?.ratingCount ||
            0
        ) || 0,
      feedback: {
        positive:
          Number(
            feedback.positive || 0
          ) || 0,
        neutral:
          Number(
            feedback.neutral || 0
          ) || 0,
        negative:
          Number(
            feedback.negative || 0
          ) || 0,
        total:
          Number(
            feedback.total || 0
          ) || 0,
      },
    },
    products:
      Array.isArray(data?.products)
        ? data.products
        : [],
    count:
      Number(data?.count || 0) || 0,
    page:
      Math.max(
        1,
        Number(data?.page || 1) || 1
      ),
    perPage:
      Math.max(
        1,
        Number(data?.perPage || 24) ||
          24
      ),
    totalPages:
      Math.max(
        1,
        Number(
          data?.totalPages || 1
        ) || 1
      ),
    facets: {
      categories:
        Array.isArray(
          data?.facets?.categories
        )
          ? data.facets.categories
              .map((category: any) => ({
                name:
                  String(
                    category?.name || ''
                  ).trim(),
                slug:
                  String(
                    category?.slug || ''
                  ).trim(),
                count:
                  Math.max(
                    0,
                    Number(
                      category?.count || 0
                    ) || 0
                  ),
              }))
              .filter(
                (
                  category: PublicSellerStoreFacetCategory
                ) =>
                  category.name &&
                  category.slug
              )
          : [],
      availability: {
        inStock:
          Math.max(
            0,
            Number(
              data?.facets
                ?.availability
                ?.inStock || 0
            ) || 0
          ),
        onSale:
          Math.max(
            0,
            Number(
              data?.facets
                ?.availability
                ?.onSale || 0
            ) || 0
          ),
      },
      price: {
        min:
          Math.max(
            0,
            Number(
              data?.facets?.price
                ?.min || 0
            ) || 0
          ),
        max:
          Math.max(
            0,
            Number(
              data?.facets?.price
                ?.max || 0
            ) || 0
          ),
      },
    },
    appliedFilters: {
      q:
        String(
          data?.appliedFilters?.q ||
            ''
        ),
      category:
        String(
          data?.appliedFilters
            ?.category || ''
        ),
      availability:
        String(
          data?.appliedFilters
            ?.availability || ''
        ),
      minPrice:
        data?.appliedFilters
          ?.minPrice === null ||
        data?.appliedFilters
          ?.minPrice === undefined
          ? null
          : Number(
              data.appliedFilters
                .minPrice
            ),
      maxPrice:
        data?.appliedFilters
          ?.maxPrice === null ||
        data?.appliedFilters
          ?.maxPrice === undefined
          ? null
          : Number(
              data.appliedFilters
                .maxPrice
            ),
      sort:
        String(
          data?.appliedFilters
            ?.sort || 'featured'
        ),
    },
  }
}

export async function fetchPublicSellerStore(
  sellerKey: string,
  page = 1,
  perPage = 24,
  filters: PublicSellerStoreFilters = {}
): Promise<PublicSellerStore> {
  const normalizedKey =
    String(sellerKey || '')
      .trim()
      .toLowerCase()

  const normalizedPage =
    Math.max(
      1,
      Number(page || 1) || 1
    )

  const normalizedPerPage =
    Math.max(
      1,
      Math.min(
        96,
        Number(perPage || 24) || 24
      )
    )

  const normalizedFilters = {
    q:
      String(filters.q || '')
        .trim(),
    category:
      String(
        filters.category || ''
      ).trim(),
    availability:
      String(
        filters.availability || ''
      ).trim(),
    minPrice:
      String(
        filters.minPrice ?? ''
      ).trim(),
    maxPrice:
      String(
        filters.maxPrice ?? ''
      ).trim(),
    sort:
      String(
        filters.sort || 'featured'
      ).trim(),
  }

  const query =
    new URLSearchParams({
      page:
        String(normalizedPage),
      per_page:
        String(normalizedPerPage),
    })

  if (normalizedFilters.q) {
    query.set(
      'q',
      normalizedFilters.q
    )
  }

  if (
    normalizedFilters.category
  ) {
    query.set(
      'category',
      normalizedFilters.category
    )
  }

  if (
    normalizedFilters.availability
  ) {
    query.set(
      'availability',
      normalizedFilters.availability
    )
  }

  if (normalizedFilters.minPrice) {
    query.set(
      'min_price',
      normalizedFilters.minPrice
    )
  }

  if (normalizedFilters.maxPrice) {
    query.set(
      'max_price',
      normalizedFilters.maxPrice
    )
  }

  if (
    normalizedFilters.sort &&
    normalizedFilters.sort !==
      'featured'
  ) {
    query.set(
      'sort',
      normalizedFilters.sort
    )
  }

  const cacheKey = [
    normalizedKey,
    normalizedPage,
    normalizedPerPage,
    normalizedFilters.q
      .toLowerCase(),
    normalizedFilters.category
      .toLowerCase(),
    normalizedFilters.availability
      .toLowerCase(),
    normalizedFilters.minPrice,
    normalizedFilters.maxPrice,
    normalizedFilters.sort
      .toLowerCase(),
  ].join('|')

  const cached =
    getTimedCacheValue(
      publicSellerStoreCache,
      cacheKey
    )

  if (cached) {
    return cached
  }

  const existingRequest =
    publicSellerStoreRequests.get(
      cacheKey
    )

  if (existingRequest) {
    return existingRequest
  }

  const request = fetch(
    `${API_BASE_URL}/api/public/sellers/${encodeURIComponent(
      sellerKey
    )}?${query.toString()}`
  )
    .then(async (response) => {
      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load seller store.'
        )
      }

      return setTimedCacheValue(
        publicSellerStoreCache,
        cacheKey,
        normalizePublicSellerStore(
          data
        )
      )
    })
    .finally(() => {
      publicSellerStoreRequests.delete(
        cacheKey
      )
    })

  publicSellerStoreRequests.set(
    cacheKey,
    request
  )

  return request
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

  const cacheKey =
    params.toString()

  const cached =
    getTimedCacheValue(
      publicSellerDirectoryCache,
      cacheKey
    )

  if (cached) {
    return cached
  }

  const existingRequest =
    publicSellerDirectoryRequests.get(
      cacheKey
    )

  if (existingRequest) {
    return existingRequest
  }

  const request = fetch(
    `${API_BASE_URL}/api/public/sellers?${cacheKey}`
  )
    .then(async (response) => {
      const data =
        await response
          .json()
          .catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data?.error ||
            'Unable to load marketplace shops.'
        )
      }

      return setTimedCacheValue(
        publicSellerDirectoryCache,
        cacheKey,
        {
          ...data,
          stores:
            Array.isArray(
              data?.stores
            )
              ? data.stores.map(
                  (
                    store: PublicStoreDirectoryCard
                  ) =>
                    normalizeSellerBranding(
                      store
                    )
                )
              : [],
        }
      )
    })
    .finally(() => {
      publicSellerDirectoryRequests.delete(
        cacheKey
      )
    })

  publicSellerDirectoryRequests.set(
    cacheKey,
    request
  )

  return request
}
