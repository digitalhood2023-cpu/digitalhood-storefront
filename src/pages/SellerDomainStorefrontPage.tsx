import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Grid2X2,
  LayoutList,
  Loader2,
  LockKeyhole,
  PackageCheck,
  Search,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react'

import SEO from '@/components/SEO'
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
  const [resolution, setResolution] = useState<SellerStorefrontResolution | null>(null)
  const [store, setStore] = useState<PublicSellerStore | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [storeCategory, setStoreCategory] = useState('')
  const [sort, setSort] = useState('featured')
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
          24
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
  }, [hostname])

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
    () => ({ q: query.trim(), category, storeCategory, sort }),
    [query, category, storeCategory, sort]
  )

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
      if (requestId === filterRequestIdRef.current) setStore(nextStore)
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

  async function changeMarketplaceCategory(nextCategory: string) {
    setCategory(nextCategory)
    await refreshStore(
      { ...filters, category: nextCategory },
      'Unable to filter this store.'
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
    await refreshStore(filters, 'Unable to search this store.')
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

        <section className="mt-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
          {store.storeCategories.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2" aria-label="Store categories">
              <button
                type="button"
                onClick={() => void chooseStoreCategory('')}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                  !storeCategory
                    ? 'bg-[#26248c] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All <span className="ml-1 opacity-70">{store.stats.productsLive}</span>
              </button>
              {store.storeCategories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void chooseStoreCategory(item.id)}
                  title={item.description}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                    storeCategory === item.id
                      ? 'bg-[#26248c] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {item.name} <span className="ml-1 opacity-70">{item.productCount}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={applyFilters}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5 sm:grid-cols-[minmax(260px,1fr)_220px_170px_auto] sm:gap-2"
          >
            <label className="relative col-span-full min-w-0 sm:col-span-1">
              <span className="sr-only">Search this store</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${seller.storeName}`}
                className="h-9 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-10 text-xs font-semibold outline-none transition focus:border-[#26248c] focus:bg-white"
              />
              <button
                type="submit"
                disabled={isFiltering}
                className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#26248c] text-white disabled:opacity-60"
                aria-label="Search store"
              >
                {isFiltering ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="h-3.5 w-3.5" />
                )}
              </button>
            </label>

            <label className="min-w-0">
              <span className="sr-only">Marketplace category</span>
              <select
                value={category}
                onChange={(event) => void changeMarketplaceCategory(event.target.value)}
                className="h-9 w-full min-w-0 truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-black text-[#26248c] outline-none sm:px-3 sm:text-xs"
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
          </form>
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
