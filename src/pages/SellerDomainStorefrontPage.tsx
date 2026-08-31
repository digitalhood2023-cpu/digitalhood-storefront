import { type FormEvent, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Loader2,
  LockKeyhole,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
} from 'lucide-react'

import SEO from '@/components/SEO'
import {
  fetchPublicSellerStore,
  type PublicSellerProduct,
  type PublicSellerStore,
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

function formatPrice(value: unknown) {
  const amount = Number(value || 0)
  return `K${(Number.isFinite(amount) ? amount : 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: PublicSellerProduct) {
  return getMarketplaceUrl(
    `/product/${encodeURIComponent(product.slug || String(product.id))}`
  )
}

function DomainLoader() {
  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
      <div className="rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-[#26248c]" />
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
  const [isLoading, setIsLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

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
  const filters = useMemo(
    () => ({ q: query.trim(), category, sort: 'featured' }),
    [query, category]
  )

  async function applyFilters(event: FormEvent) {
    event.preventDefault()
    if (!resolution) return
    setIsFiltering(true)
    setError('')

    try {
      setStore(
        await fetchPublicSellerStore(resolution.seller.key, 1, 24, filters)
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to search this store.'
      )
    } finally {
      setIsFiltering(false)
    }
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
        <div className="max-w-md rounded-3xl bg-white p-7 text-center shadow-sm ring-1 ring-slate-200">
          <Store className="mx-auto h-11 w-11 text-[#26248c]" />
          <h1 className="mt-4 text-2xl font-black text-[#26248c]">Store unavailable</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{error}</p>
          <a
            href={getMarketplaceUrl('/shops')}
            className="mt-5 inline-flex items-center rounded-full bg-[#26248c] px-5 py-3 text-sm font-black text-white"
          >
            Browse marketplace <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    )
  }

  if (!resolution || !store || !seller) return <DomainLoader />

  return (
    <div className="min-h-[100svh] bg-slate-50 text-slate-900">
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

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1500px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
          <a href={getMarketplaceUrl('/')} className="flex min-w-0 items-center gap-2">
            <img src="/logo.jpg" alt="DigitalHood" className="h-9 w-9 rounded-xl object-contain" />
            <span className="hidden text-sm font-black text-[#26248c] sm:inline">
              DigitalHood Marketplace
            </span>
          </a>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-700 sm:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified marketplace store
            </span>
            <a
              href={getMarketplaceUrl('/account')}
              className="rounded-full bg-[#26248c] px-4 py-2 text-xs font-black text-white"
            >
              My account
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-3 py-3 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-2xl bg-[#17155f] text-white shadow-lg">
          <div
            className="relative min-h-[170px] p-4 sm:p-6"
            style={{
              backgroundImage: seller.coverPhotoUrl
                ? `linear-gradient(90deg, rgba(23,21,95,.96), rgba(23,21,95,.58)), url(${seller.coverPhotoUrl})`
                : 'linear-gradient(135deg, #17155f 0%, #302da0 60%, #a46b17 150%)',
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/30 bg-white/10">
                  {seller.profilePhotoUrl ? (
                    <img
                      src={seller.profilePhotoUrl}
                      alt={seller.storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store className="h-9 w-9 text-[#ffb54a]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-black sm:text-3xl">{seller.storeName}</h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ffb54a] px-2 py-1 text-[10px] font-black text-[#17155f]">
                      <BadgeCheck className="h-3 w-3" /> Approved
                    </span>
                  </div>
                  <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-white/70 sm:text-sm">
                    {seller.tagline || seller.description || 'An approved seller on DigitalHood Marketplace Zambia.'}
                  </p>
                  <p className="mt-2 truncate text-[10px] font-black uppercase tracking-[0.14em] text-[#ffcf87]">
                    {resolution.domain.hostname}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 divide-x divide-white/10 rounded-xl bg-white/10 ring-1 ring-white/10 sm:min-w-[360px]">
                {[
                  ['Years', years],
                  ['Sold', store.stats.itemsSold],
                  ['Products', store.stats.productsLive],
                  ['Rating', store.stats.ratingAverage ? store.stats.ratingAverage.toFixed(1) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="px-2 py-3 text-center">
                    <p className="text-sm font-black">{value}</p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-wide text-white/50">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <LockKeyhole className="h-4 w-4 shrink-0 text-emerald-600" />
            Accounts, messaging and payments remain protected by DigitalHood Marketplace.
          </div>
          <a href={marketplaceStoresUrl} className="inline-flex items-center text-xs font-black text-[#26248c]">
            Browse all marketplace stores <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </a>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-black text-[#26248c]">About this store</h2>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                {seller.description || 'This seller is approved to trade on DigitalHood Marketplace.'}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Buyer trust</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-2xl font-black text-[#26248c]">
                  {store.stats.ratingAverage?.toFixed(1) || '—'}
                </span>
                <span className="flex items-center gap-1 text-xs font-black text-[#a46b17]">
                  <Star className="h-4 w-4 fill-current" /> {store.stats.ratingCount}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-emerald-700">
                {positive === null ? 'New seller feedback profile' : `${positive}% positive feedback`}
              </p>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <form onSubmit={applyFilters} className="flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Search this store</span>
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${seller.storeName}`}
                    className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-[#26248c]"
                  />
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-10 rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-black text-[#26248c] outline-none"
                >
                  <option value="">All categories</option>
                  {store.facets.categories.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.name} ({item.count})</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={isFiltering}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#26248c] px-5 text-xs font-black text-white disabled:opacity-60"
                >
                  {isFiltering ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search store'}
                </button>
              </form>
            </div>

            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-[#26248c]">Products by {seller.storeName}</h2>
                <p className="text-xs font-semibold text-slate-500">{products.length} of {store.count} live products</p>
              </div>
              <a href={getMarketplaceUrl('/shop')} className="hidden text-xs font-black text-[#26248c] sm:inline-flex">
                Browse all DigitalHood <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>

            {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700">{error}</p>}

            {products.length ? (
              <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <a
                    key={product.id}
                    href={getProductUrl(product)}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="aspect-square overflow-hidden bg-slate-100">
                      <img
                        src={getFastProductImage(product, 'card')}
                        srcSet={getFastProductSrcSet(product)}
                        sizes={getProductImageSizes('card')}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div className="p-2.5">
                      <p className="line-clamp-2 min-h-9 text-xs font-black leading-[1.15rem] text-slate-800">{product.name}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-[#26248c]">{formatPrice(product.price)}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#ff9f1c]" />
                      </div>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-emerald-600">
                        {product.stockLabel || 'Available'}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-white p-8 text-center ring-1 ring-slate-200">
                <ShoppingBag className="mx-auto h-9 w-9 text-[#26248c]" />
                <p className="mt-3 text-sm font-black text-[#26248c]">No matching products</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Try a different store search.</p>
              </div>
            )}

            {hasMore && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                  className="inline-flex items-center rounded-full bg-[#26248c] px-5 py-3 text-xs font-black text-white disabled:opacity-60"
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
          </div>
        </section>
      </main>

      <footer className="mt-8 bg-[#17155f] text-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#ffb54a]" />
            <div>
              <p className="text-sm font-black">Protected by DigitalHood</p>
              <p className="text-[10px] font-semibold text-white/55">Marketplace policies, secure checkout and verified feedback apply.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] font-bold text-white/70">
            <a href={getMarketplaceUrl('/marketplace-terms')}>Marketplace terms</a>
            <a href={getMarketplaceUrl('/support')}>Support</a>
            <a href={getMarketplaceUrl('/shops')}>All stores</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
