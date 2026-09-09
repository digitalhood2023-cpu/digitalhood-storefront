import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Filter,
  Folder,
  Grid2X2,
  LayoutList,
  Loader2,
  LockKeyhole,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react'

import SEO from '@/components/SEO'
import SellerStoreSearchAutocomplete from '@/components/search/SellerStoreSearchAutocomplete'
import {
  SellerDomainCommerceFooter,
  SellerDomainCommerceHeader,
} from '@/components/seller/SellerDomainCommerceChrome'
import {
  fetchPublicSellerStore,
  type PublicSellerProduct,
  type PublicSellerStore,
  type PublicSellerStoreFilters,
} from '@/api/publicSellers'
import {
  resolveSellerStorefrontHostname,
  type SellerStorefrontResolution,
} from '@/api/storefrontDomains'
import { getMarketplaceUrl, isSafeSellerDomainUrl } from '@/lib/sellerDomains'
import {
  getFastProductImage,
  getFastProductSrcSet,
  getProductImageSizes,
} from '@/lib/productImages'
import { SELLER_ORDER_COMPLETE_NOTICE } from '@/pages/SellerOrderCompletePage'

type StoreViewMode = 'grid' | 'list'

const STORE_VIEW_KEY = 'digitalhood-seller-store-view-v1'

function readInitialStoreFilters(): PublicSellerStoreFilters {
  if (typeof window === 'undefined') return { sort: 'featured' }

  const params = new URLSearchParams(window.location.search)
  const requestedSort = params.get('sort') || 'featured'
  const allowedSorts = new Set([
    'featured',
    'popular',
    'rating',
    'price_asc',
    'price_desc',
    'name_asc',
  ])

  return {
    q: (params.get('q') || '').slice(0, 80),
    category: (params.get('category') || '').slice(0, 120),
    storeCategory: (params.get('store_category') || '').slice(0, 120),
    availability: (params.get('availability') || '').slice(0, 30),
    minPrice: (params.get('min_price') || '').slice(0, 20),
    maxPrice: (params.get('max_price') || '').slice(0, 20),
    sort: allowedSorts.has(requestedSort) ? requestedSort : 'featured',
  }
}

function syncStoreFiltersToUrl(filters: PublicSellerStoreFilters) {
  if (typeof window === 'undefined') return

  const params = new URLSearchParams()
  const entries = [
    ['q', filters.q],
    ['category', filters.category],
    ['store_category', filters.storeCategory],
    ['availability', filters.availability],
    ['min_price', filters.minPrice],
    ['max_price', filters.maxPrice],
    ['sort', filters.sort === 'featured' ? '' : filters.sort],
  ] as const

  for (const [key, value] of entries) {
    const normalizedValue = String(value ?? '').trim()
    if (normalizedValue) params.set(key, normalizedValue)
  }

  const query = params.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${query ? `?${query}` : ''}`
  )
}

function formatPrice(value: unknown) {
  const amount = Number(value || 0)
  return `K${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: PublicSellerProduct) {
  return `/product/${encodeURIComponent(product.slug || String(product.id))}`
}

function DomainLoader() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#26248c]" />
        <p className="mt-3 text-sm font-black text-[#26248c]">Opening verified store…</p>
      </div>
    </div>
  )
}

export default function SellerDomainStorefrontPage({ hostname }: { hostname: string }) {
  const [initialFilters] = useState(readInitialStoreFilters)
  const [resolution, setResolution] = useState<SellerStorefrontResolution | null>(null)
  const [store, setStore] = useState<PublicSellerStore | null>(null)
  const [error, setError] = useState('')
  const [searchDraft, setSearchDraft] = useState(String(initialFilters.q || ''))
  const [query, setQuery] = useState(String(initialFilters.q || ''))
  const [category, setCategory] = useState(String(initialFilters.category || ''))
  const [storeCategory, setStoreCategory] = useState(String(initialFilters.storeCategory || ''))
  const [availability, setAvailability] = useState(String(initialFilters.availability || ''))
  const [minPrice, setMinPrice] = useState(String(initialFilters.minPrice || ''))
  const [maxPrice, setMaxPrice] = useState(String(initialFilters.maxPrice || ''))
  const [sort, setSort] = useState(String(initialFilters.sort || 'featured'))
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [viewMode, setViewMode] = useState<StoreViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    try {
      return window.localStorage.getItem(STORE_VIEW_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [showOrderComplete, setShowOrderComplete] = useState(false)
  const filterRequestIdRef = useRef(0)

  useEffect(() => {
    let shouldShowNotice = false
    try {
      if (window.sessionStorage.getItem(SELLER_ORDER_COMPLETE_NOTICE) === '1') {
        window.sessionStorage.removeItem(SELLER_ORDER_COMPLETE_NOTICE)
        shouldShowNotice = true
      }
    } catch {
      // The store remains usable when session storage is unavailable.
    }

    if (!shouldShowNotice) return
    const noticeTimer = window.setTimeout(() => setShowOrderComplete(true), 0)
    return () => window.clearTimeout(noticeTimer)
  }, [])

  useEffect(() => {
    let active = true

    resolveSellerStorefrontHostname(hostname)
      .then(async (nextResolution) => {
        if (!active) return

        if (
          nextResolution.redirect &&
          isSafeSellerDomainUrl(nextResolution.domain.canonicalUrl)
        ) {
          const destination = new URL(nextResolution.domain.canonicalUrl)
          destination.search = window.location.search
          window.location.replace(destination.toString())
          return
        }

        setResolution(nextResolution)
        const nextStore = await fetchPublicSellerStore(
          nextResolution.seller.key,
          1,
          24,
          initialFilters
        )
        if (active) setStore(nextStore)
      })
      .catch((requestError) => {
        if (!active) return
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'This marketplace store is not available.'
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [hostname, initialFilters])

  const products = store?.products || []
  const seller = store?.seller
  const hasMore = Boolean(
    store && store.page < store.totalPages && products.length < store.count
  )
  const years = Math.max(0, Math.floor(Number(seller?.yearsOnDigitalHood || 0)))
  const positive = store?.stats.feedback.total
    ? Math.round(
        (Number(store.stats.feedback.positive || 0) /
          Number(store.stats.feedback.total || 1)) * 100
      )
    : null
  const canonicalUrl = resolution?.domain.canonicalUrl || `https://${hostname}`
  const marketplaceStoresUrl = getMarketplaceUrl('/shops')
  const filters = useMemo<PublicSellerStoreFilters>(
    () => ({
      q: query.trim(),
      category,
      storeCategory,
      availability,
      minPrice,
      maxPrice,
      sort,
    }),
    [query, category, storeCategory, availability, minPrice, maxPrice, sort]
  )
  const activeFilterCount = [category, availability, minPrice, maxPrice].filter(Boolean).length

  async function refreshStore(
    nextFilters: PublicSellerStoreFilters,
    fallbackMessage: string
  ) {
    if (!resolution) return
    const requestId = ++filterRequestIdRef.current
    setIsFiltering(true)
    setError('')

    try {
      const nextStore = await fetchPublicSellerStore(
        resolution.seller.key,
        1,
        24,
        nextFilters
      )
      if (requestId === filterRequestIdRef.current) {
        setStore(nextStore)
        syncStoreFiltersToUrl(nextFilters)
      }
    } catch (requestError) {
      if (requestId !== filterRequestIdRef.current) return
      setError(requestError instanceof Error ? requestError.message : fallbackMessage)
    } finally {
      if (requestId === filterRequestIdRef.current) setIsFiltering(false)
    }
  }

  function changeViewMode(nextViewMode: StoreViewMode) {
    setViewMode(nextViewMode)
    try {
      window.localStorage.setItem(STORE_VIEW_KEY, nextViewMode)
    } catch {
      // The chosen view still applies for this visit when storage is unavailable.
    }
  }

  async function chooseStoreCategory(categoryId: string) {
    setStoreCategory(categoryId)
    await refreshStore(
      { ...filters, storeCategory: categoryId },
      'Unable to open this store category.'
    )
  }

  async function applySearch(nextQuery: string) {
    setSearchDraft(nextQuery)
    setQuery(nextQuery)
    await refreshStore(
      { ...filters, q: nextQuery.trim() },
      'Unable to search this store.'
    )
  }

  async function applySuggestedCategory(nextCategory: string, nextQuery: string) {
    setSearchDraft(nextQuery)
    setQuery(nextQuery)
    setCategory(nextCategory)
    await refreshStore(
      { ...filters, q: nextQuery.trim(), category: nextCategory },
      'Unable to open this suggested category.'
    )
  }

  async function changeSort(nextSort: string) {
    setSort(nextSort)
    await refreshStore(
      { ...filters, sort: nextSort },
      'Unable to sort this store.'
    )
  }

  async function applyFilters(event: FormEvent) {
    event.preventDefault()

    const minimum = minPrice ? Number(minPrice) : null
    const maximum = maxPrice ? Number(maxPrice) : null
    if (
      minimum !== null &&
      maximum !== null &&
      Number.isFinite(minimum) &&
      Number.isFinite(maximum) &&
      minimum > maximum
    ) {
      setError('Minimum price must be lower than maximum price.')
      return
    }

    setIsFilterPanelOpen(false)
    await refreshStore(filters, 'Unable to search this store.')
  }

  async function resetFilters() {
    setCategory('')
    setAvailability('')
    setMinPrice('')
    setMaxPrice('')
    setIsFilterPanelOpen(false)
    await refreshStore(
      {
        ...filters,
        category: '',
        availability: '',
        minPrice: '',
        maxPrice: '',
      },
      'Unable to reset store filters.'
    )
  }

  async function loadMore() {
    if (!resolution || !store || !hasMore || isLoadingMore) return
    setIsLoadingMore(true)

    try {
      const nextPage = await fetchPublicSellerStore(
        resolution.seller.key,
        store.page + 1,
        store.perPage,
        filters
      )
      setStore((current) => {
        if (!current) return nextPage
        const known = new Set(current.products.map((item) => String(item.id)))
        return {
          ...current,
          ...nextPage,
          products: current.products.concat(
            nextPage.products.filter((item) => !known.has(String(item.id)))
          ),
        }
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load more products.'
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  if (isLoading) return <DomainLoader />

  if (error && !store) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
        <SEO
          title="Store unavailable"
          description="This DigitalHood seller storefront is not currently available."
          path={canonicalUrl}
          noindex
        />
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
          <Store className="mx-auto h-10 w-10 text-[#26248c]" />
          <h1 className="mt-3 text-xl font-black text-[#26248c]">Store unavailable</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{error}</p>
          <a
            href={marketplaceStoresUrl}
            className="mt-4 inline-flex items-center rounded-full bg-[#26248c] px-5 py-2.5 text-sm font-black text-white"
          >
            Browse marketplace <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  if (!resolution || !store || !seller) return <DomainLoader />

  return (
    <div className="flex min-h-[100svh] flex-col bg-slate-50 text-slate-900">
      <SEO
        title={seller.storeName}
        description={
          seller.tagline ||
          seller.description ||
          `Shop ${seller.storeName} on DigitalHood Marketplace Zambia.`
        }
        path={canonicalUrl}
        image={seller.profilePhotoUrl}
      />

      <SellerDomainCommerceHeader
        storeName={seller.storeName}
        profilePhotoUrl={seller.profilePhotoUrl}
        marketplaceBrand
      />

      <main className="mx-auto w-full max-w-[1500px] flex-1 px-2.5 py-2.5 sm:px-6 lg:px-8">
        {showOrderComplete && (
          <section className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
            <div className="flex items-center gap-2 text-xs font-black sm:text-sm">
              <PackageCheck className="h-4 w-4 shrink-0" />
              Order confirmed. DigitalHood is preparing your order updates.
            </div>
            <button
              type="button"
              onClick={() => setShowOrderComplete(false)}
              className="text-lg leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          </section>
        )}

        <section
          className="relative overflow-hidden rounded-2xl bg-[#17155f] text-white shadow-sm"
          style={{
            backgroundImage: seller.coverPhotoUrl
              ? `linear-gradient(90deg, rgba(23,21,95,.97), rgba(38,36,140,.76)), url(${seller.coverPhotoUrl})`
              : 'linear-gradient(130deg, #17155f 0%, #302da0 68%, #694979 130%)',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <div className="p-3 sm:p-4">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/25 bg-white/10 sm:h-16 sm:w-16">
                  {seller.profilePhotoUrl ? (
                    <img
                      src={seller.profilePhotoUrl}
                      alt={seller.storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-7 w-7 text-[#ffb54a]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <h1 className="max-w-full truncate text-xl font-black leading-tight sm:text-2xl">
                      {seller.storeName}
                    </h1>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#ffb54a] px-2 py-1 text-[9px] font-black text-[#17155f]">
                      <BadgeCheck className="h-3 w-3" /> Approved
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 max-w-2xl text-[11px] font-semibold text-white/70 sm:text-xs">
                    {seller.tagline || seller.description || 'Approved DigitalHood marketplace seller.'}
                  </p>
                  <p className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.12em] text-[#ffcf87]">
                    {resolution.domain.hostname}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 sm:w-[350px] sm:shrink-0">
                {[
                  ['Years', years],
                  ['Sold', store.stats.itemsSold],
                  ['Products', store.stats.productsLive],
                  ['Rating', store.stats.ratingAverage ? store.stats.ratingAverage.toFixed(1) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="px-1.5 py-1.5 text-center sm:py-2">
                    <p className="text-xs font-black sm:text-sm">{value}</p>
                    <p className="mt-0.5 text-[7px] font-black uppercase tracking-wide text-white/50 sm:text-[8px]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <details className="group mt-2 rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold text-slate-600 [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2">
              <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="sm:hidden">Protected checkout</span>
              <span className="hidden truncate sm:inline">
                Accounts, messaging and payments remain protected by DigitalHood Marketplace.
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 font-black text-[#a46b17]">
                <Star className="h-3.5 w-3.5 fill-current" />
                {store.stats.ratingAverage?.toFixed(1) || 'New'}
                <span className="font-bold text-slate-400">({store.stats.ratingCount})</span>
              </span>
              <span className="text-[#26248c] group-open:hidden">Details +</span>
              <span className="hidden text-[#26248c] group-open:inline">Close −</span>
            </span>
          </summary>
          <div className="grid gap-2 border-t border-slate-100 px-3 py-2.5 text-[11px] font-semibold leading-5 text-slate-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p>
              {seller.description || 'This seller is approved to trade on DigitalHood Marketplace.'}{' '}
              <span className="font-black text-emerald-700">
                {positive === null ? 'Feedback profile is new.' : `${positive}% positive feedback.`}
              </span>
            </p>
            <a
              href={marketplaceStoresUrl}
              className="inline-flex items-center font-black text-[#26248c]"
            >
              All marketplace stores <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </div>
        </details>

        {store.storeCategories.length > 0 && (
          <nav
            className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Store categories"
          >
            <button
              type="button"
              onClick={() => void chooseStoreCategory('')}
              className={`flex h-14 w-[116px] shrink-0 snap-start items-center gap-2 rounded-xl px-2.5 text-left shadow-sm ring-1 transition ${
                !storeCategory
                  ? 'bg-[#26248c] text-white ring-[#26248c]'
                  : 'bg-white text-slate-700 ring-slate-200 hover:ring-[#26248c]/40'
              }`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${!storeCategory ? 'bg-white/15' : 'bg-[#26248c]/8 text-[#26248c]'}`}>
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black">All products</span>
                <span className={`block text-[9px] font-bold ${!storeCategory ? 'text-white/60' : 'text-slate-400'}`}>
                  {store.stats.productsLive} items
                </span>
              </span>
            </button>
            {store.storeCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void chooseStoreCategory(item.id)}
                title={item.description}
                className={`flex h-14 w-[132px] shrink-0 snap-start items-center gap-2 rounded-xl px-2.5 text-left shadow-sm ring-1 transition ${
                  storeCategory === item.id
                    ? 'bg-[#26248c] text-white ring-[#26248c]'
                    : 'bg-white text-slate-700 ring-slate-200 hover:ring-[#26248c]/40'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${storeCategory === item.id ? 'bg-white/15' : 'bg-[#ffb54a]/20 text-[#a46b17]'}`}>
                  <Folder className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-black">{item.name}</span>
                  <span className={`block text-[9px] font-bold ${storeCategory === item.id ? 'text-white/60' : 'text-slate-400'}`}>
                    {item.productCount} items
                  </span>
                </span>
              </button>
            ))}
            <a
              href="/categories"
              className="flex h-14 w-[116px] shrink-0 snap-start items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#26248c]/35 bg-[#26248c]/5 px-3 text-[11px] font-black text-[#26248c]"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </nav>
        )}

        <section className="mt-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          <SellerStoreSearchAutocomplete
            sellerKey={seller.key}
            storeName={seller.storeName}
            value={searchDraft}
            onValueChange={setSearchDraft}
            onSearch={(nextQuery) => void applySearch(nextQuery)}
            onCategorySelect={(selectedCategory, nextQuery) =>
              void applySuggestedCategory(selectedCategory.slug, nextQuery)
            }
            popularCategories={store.facets.categories}
            isSearching={isFiltering}
          />

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen((current) => !current)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-black transition ${
                isFilterPanelOpen || activeFilterCount
                  ? 'bg-[#26248c] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              aria-expanded={isFilterPanelOpen}
              aria-controls="seller-store-filters"
            >
              <Filter className="h-3.5 w-3.5" /> Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ffb54a] px-1 text-[9px] text-[#17155f]">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <label className="min-w-0 flex-1 sm:max-w-[190px]">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => void changeSort(event.target.value)}
                className="h-9 w-full min-w-0 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-[#26248c] outline-none sm:px-3 sm:text-xs"
              >
                <option value="featured">Featured</option>
                <option value="popular">Popular</option>
                <option value="rating">Best rated</option>
                <option value="price_asc">Price: low</option>
                <option value="price_desc">Price: high</option>
                <option value="name_asc">A–Z</option>
              </select>
            </label>

            <div className="flex h-9 shrink-0 items-center rounded-full bg-slate-100 p-1" aria-label="Product view">
              <button
                type="button"
                onClick={() => changeViewMode('grid')}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
                  viewMode === 'grid' ? 'bg-white text-[#26248c] shadow-sm' : 'text-slate-400'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <Grid2X2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => changeViewMode('list')}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
                  viewMode === 'list' ? 'bg-white text-[#26248c] shadow-sm' : 'text-slate-400'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isFilterPanelOpen && (
            <form
              id="seller-store-filters"
              onSubmit={applyFilters}
              className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 sm:grid-cols-[minmax(180px,1fr)_150px_130px_130px_auto]"
            >
              <label className="col-span-2 min-w-0 sm:col-span-1">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#26248c]"
                >
                  <option value="">All categories</option>
                  {store.facets.categories.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name} ({item.count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">Availability</span>
                <select
                  value={availability}
                  onChange={(event) => setAvailability(event.target.value)}
                  className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#26248c]"
                >
                  <option value="">Any</option>
                  <option value="in_stock">In stock</option>
                  <option value="on_sale">On sale</option>
                </select>
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">Minimum price</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                  placeholder={store.facets.price.min ? `K${Math.floor(store.facets.price.min)}` : 'Min K'}
                  className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#26248c]"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">Maximum price</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                  placeholder={store.facets.price.max ? `K${Math.ceil(store.facets.price.max)}` : 'Max K'}
                  className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-bold text-slate-700 outline-none focus:border-[#26248c]"
                />
              </label>

              <div className="col-span-2 flex items-end justify-end gap-2 sm:col-span-1">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={() => void resetFilters()}
                    className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[10px] font-black text-slate-500 hover:bg-slate-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isFiltering}
                  className="inline-flex h-9 items-center rounded-full bg-[#26248c] px-4 text-[11px] font-black text-white disabled:opacity-60"
                >
                  {isFiltering ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply filters'}
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="mt-2 flex items-center justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-[#26248c] sm:text-base">
              Products by {seller.storeName}
            </h2>
            <p className="text-[10px] font-semibold text-slate-500 sm:text-xs">
              {products.length} shown · {store.count} live products
            </p>
          </div>
          {isFiltering && (
            <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-black text-[#26248c]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating
            </span>
          )}
        </div>

        {error && (
          <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-700">{error}</p>
        )}

        {products.length ? (
          <div
            className={
              viewMode === 'grid'
                ? 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                : 'mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3'
            }
          >
            {products.map((product, index) => (
              <a
                key={product.id}
                href={getProductUrl(product)}
                className={`group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md ${
                  viewMode === 'list' ? 'flex min-h-24' : ''
                }`}
              >
                <div
                  className={
                    viewMode === 'grid'
                      ? 'aspect-[4/3] overflow-hidden bg-slate-100'
                      : 'aspect-square w-24 shrink-0 overflow-hidden bg-slate-100 sm:w-28'
                  }
                >
                  <img
                    src={getFastProductImage(product, 'card')}
                    srcSet={getFastProductSrcSet(product)}
                    sizes={getProductImageSizes('card')}
                    alt={product.name}
                    loading={index < 4 ? 'eager' : 'lazy'}
                    fetchPriority={index < 2 ? 'high' : 'auto'}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.025]"
                  />
                </div>
                <div className={`min-w-0 p-2 ${viewMode === 'list' ? 'flex flex-1 flex-col justify-center' : ''}`}>
                  <p className="line-clamp-2 min-h-8 text-[11px] font-black leading-4 text-slate-800 sm:text-xs">
                    {product.name}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-black text-[#26248c]">
                      {formatPrice(product.price)}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#ff9f1c]" />
                  </div>
                  <p className="mt-0.5 truncate text-[8px] font-black uppercase tracking-wide text-emerald-600 sm:text-[9px]">
                    {product.stockLabel || 'Available'}
                  </p>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-2 rounded-xl bg-white p-7 text-center ring-1 ring-slate-200">
            <ShoppingBag className="mx-auto h-8 w-8 text-[#26248c]" />
            <p className="mt-2 text-sm font-black text-[#26248c]">No matching products</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Try another search or category.</p>
          </div>
        )}

        {hasMore && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="inline-flex h-10 items-center rounded-full bg-[#26248c] px-5 text-xs font-black text-white disabled:opacity-60"
            >
              {isLoadingMore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="mr-2 h-4 w-4" />
              )}
              Load more products
            </button>
          </div>
        )}
      </main>

      <SellerDomainCommerceFooter storeName={seller.storeName} />
    </div>
  )
}
