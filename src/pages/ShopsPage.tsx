import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { FormEvent } from 'react'
import {
  Link,
  useSearchParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Loader2,
  Menu,
  MapPin,
  PackageCheck,
  Search,
  Star,
  Store,
  X,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  fetchPublicSellerDirectory,
  fetchPublicSellerStore,
  type PublicStoreDirectoryCard,
  type PublicStoreDirectoryResponse,
} from '@/api/publicSellers'

const EMPTY_DIRECTORY: PublicStoreDirectoryResponse = {
  success: true,
  stores: [],
  total: 0,
  totalPages: 1,
  page: 1,
  perPage: 12,
  facets: {
    categories: [],
    locations: [],
    accountTypes: [],
  },
}

function formatAccountType(
  value?: string
) {
  if (!value) {
    return 'Marketplace seller'
  }

  return value
    .replace(/[-_]+/g, ' ')
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    )
}

function StoreCover({
  src,
  storeName,
}: {
  src?: string
  storeName: string
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  return (
    <div className="relative h-20 overflow-hidden bg-gradient-to-br from-dh-primary via-[#3430a8] to-[#ffb54a] sm:h-24">
      {src && !imageFailed && (
        <img
          src={src}
          alt={`${storeName} cover`}
          loading="lazy"
          decoding="async"
          onError={() =>
            setImageFailed(true)
          }
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-r from-dh-primary/75 via-dh-primary/25 to-transparent" />
    </div>
  )
}

function StoreProfilePhoto({
  src,
  storeName,
}: {
  src?: string
  storeName: string
}) {
  const [
    imageFailed,
    setImageFailed,
  ] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [src])

  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border-[3px] border-white bg-white shadow-md sm:h-16 sm:w-16">
      <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
        <Store className="h-6 w-6 text-dh-primary sm:h-7 sm:w-7" />
      </div>

      {src && !imageFailed && (
        <img
          src={src}
          alt={`${storeName} profile`}
          loading="lazy"
          decoding="async"
          onError={() =>
            setImageFailed(true)
          }
          className="relative h-full w-full object-cover"
        />
      )}
    </div>
  )
}

function StoreCard({
  store,
}: {
  store: PublicStoreDirectoryCard
}) {
  const hasRating =
    Boolean(
      store.stats.ratingAverage
    ) &&
    store.stats.ratingCount > 0

  const ratingText =
    hasRating
      ? `${store.stats.ratingAverage?.toFixed(
          1
        )} (${store.stats.ratingCount.toLocaleString(
          'en-ZM'
        )})`
      : 'New'

  const summary =
    store.tagline ||
    store.description ||
    'Approved seller on DigitalHood Marketplace.'

  const prefetchStore = () => {
    void fetchPublicSellerStore(
      store.key,
      1,
      24
    ).catch(() => undefined)
  }

  return (
    <Link
      to={
        store.url ||
        `/seller/${store.key}`
      }
      onMouseEnter={prefetchStore}
      onFocus={prefetchStore}
      onTouchStart={prefetchStore}
      className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-dh-secondary/70 hover:shadow-lg"
    >
      <div className="relative">
        <StoreCover
          src={store.coverPhotoUrl}
          storeName={
            store.storeName
          }
        />

        {store.verified && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-green-700 shadow-sm backdrop-blur">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </span>
        )}
      </div>

      <div className="px-3 pb-3 pt-3">
        <div className="flex min-w-0 items-center gap-3">
          <StoreProfilePhoto
            src={
              store.profilePhotoUrl
            }
            storeName={
              store.storeName
            }
          />

          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 min-h-10 break-words font-display text-base font-black leading-5 text-gray-950 sm:text-lg sm:leading-6">
              {store.storeName}
            </h2>

            <p className="mt-1 truncate text-[10px] font-black uppercase tracking-[0.08em] text-gray-400">
              {formatAccountType(
                store.accountType
              )}
            </p>
          </div>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dh-primary/5 text-dh-primary transition group-hover:bg-dh-primary group-hover:text-white">
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {store.locationLabel && (
          <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-gray-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-dh-secondary" />
            <span className="truncate">
              {store.locationLabel}
            </span>
          </p>
        )}

        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-gray-500">
          {summary}
        </p>

        <div className="mt-3 grid grid-cols-3 divide-x divide-gray-200 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
          <div className="px-2 py-2 text-center">
            <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
              Products
            </p>

            <p className="mt-0.5 truncate font-display text-sm font-black text-dh-primary">
              {store.stats.productsLive.toLocaleString(
                'en-ZM'
              )}
            </p>
          </div>

          <div className="px-2 py-2 text-center">
            <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
              Sold
            </p>

            <p className="mt-0.5 truncate font-display text-sm font-black text-dh-primary">
              {store.stats.itemsSold.toLocaleString(
                'en-ZM'
              )}
            </p>
          </div>

          <div className="px-1.5 py-2 text-center">
            <p className="text-[9px] font-black uppercase tracking-wide text-gray-400">
              Rating
            </p>

            <p className="mt-0.5 flex items-center justify-center gap-1 truncate text-xs font-black text-dh-primary">
              <Star className="h-3.5 w-3.5 shrink-0 fill-dh-secondary text-dh-secondary" />
              <span className="truncate">
                {ratingText}
              </span>
            </p>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ShopsPage() {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams()

  const [
    directory,
    setDirectory,
  ] =
    useState<PublicStoreDirectoryResponse>(
      EMPTY_DIRECTORY
    )

  const [
    searchInput,
    setSearchInput,
  ] = useState(
    searchParams.get('q') || ''
  )

  const [isLoading, setIsLoading] =
    useState(true)

  const [loadError, setLoadError] =
    useState('')

  const [
    isFilterDrawerOpen,
    setIsFilterDrawerOpen,
  ] = useState(false)

  useEffect(() => {
    if (!isFilterDrawerOpen) {
      return
    }

    const previousOverflow =
      document.body.style.overflow

    const closeOnEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key === 'Escape') {
        setIsFilterDrawerOpen(false)
      }
    }

    document.body.style.overflow =
      'hidden'

    window.addEventListener(
      'keydown',
      closeOnEscape
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        'keydown',
        closeOnEscape
      )
    }
  }, [isFilterDrawerOpen])

  const query =
    searchParams.get('q') || ''

  const category =
    searchParams.get('category') || ''

  const location =
    searchParams.get('location') || ''

  const accountType =
    searchParams.get(
      'account_type'
    ) || ''

  const sort =
    searchParams.get('sort') ||
    'featured'

  const page = Math.max(
    1,
    Number(
      searchParams.get('page') || 1
    )
  )

  useEffect(() => {
    let cancelled = false

    setIsLoading(true)
    setLoadError('')

    fetchPublicSellerDirectory({
      q: query,
      category,
      location,
      accountType,
      sort,
      page,
      perPage: 12,
    })
      .then((response) => {
        if (!cancelled) {
          setDirectory(response)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load marketplace shops.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    query,
    category,
    location,
    accountType,
    sort,
    page,
  ])

  const activeFilterCount =
    useMemo(
      () =>
        [
          query,
          category,
          location,
          accountType,
        ].filter(Boolean).length,
      [
        query,
        category,
        location,
        accountType,
      ]
    )

  function updateParam(
    name: string,
    value: string
  ) {
    const next =
      new URLSearchParams(
        searchParams
      )

    if (value) {
      next.set(name, value)
    } else {
      next.delete(name)
    }

    next.delete('page')
    setSearchParams(next)
  }

  function submitSearch(
    event: FormEvent
  ) {
    event.preventDefault()
    updateParam(
      'q',
      searchInput.trim()
    )
    setIsFilterDrawerOpen(false)
  }

  function setPage(
    nextPage: number
  ) {
    const next =
      new URLSearchParams(
        searchParams
      )

    next.set(
      'page',
      String(nextPage)
    )

    setSearchParams(next)
  }

  function clearFilters() {
    setSearchInput('')
    setSearchParams(
      new URLSearchParams()
    )
    setIsFilterDrawerOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Marketplace Shops & Verified Sellers | DigitalHood Zambia"
        description="Search and browse verified technology shops and sellers on DigitalHood Marketplace Zambia."
        path="/shops"
      />

      <Header />

      <main className="pb-12 pt-5">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-5 flex items-center gap-2 text-sm text-gray-500">
            <Link
              to="/"
              className="hover:text-dh-primary"
            >
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-bold text-dh-primary">
              Shops
            </span>
          </nav>

          <section className="mt-5 lg:hidden">
            <Button
              type="button"
              variant="outline"
              aria-expanded={
                isFilterDrawerOpen
              }
              aria-controls="shop-filter-drawer"
              onClick={() =>
                setIsFilterDrawerOpen(
                  true
                )
              }
              className="h-auto w-full justify-between rounded-2xl border-gray-200 bg-white px-4 py-3.5 text-left shadow-sm hover:bg-white"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-dh-primary text-white">
                  <Menu className="h-5 w-5" />
                </span>

                <span className="min-w-0">
                  <span className="block font-display text-sm font-black text-dh-primary">
                    Filters & search
                  </span>

                  <span className="mt-0.5 block truncate text-xs font-medium text-gray-500">
                    Specialty, location and
                    seller type
                  </span>
                </span>
              </span>

              <span className="ml-3 shrink-0 rounded-full bg-dh-primary/10 px-3 py-1 text-xs font-black text-dh-primary">
                {activeFilterCount > 0
                  ? activeFilterCount
                  : 'Open'}
              </span>
            </Button>
          </section>

          <div
            id="shop-filter-drawer"
            className={
              isFilterDrawerOpen
                ? 'fixed inset-0 z-[200] lg:static lg:z-auto lg:block'
                : 'hidden lg:block'
            }
          >
            <button
              type="button"
              aria-label="Close shop filters"
              onClick={() =>
                setIsFilterDrawerOpen(
                  false
                )
              }
              className="absolute inset-0 bg-black/50 backdrop-blur-[1px] lg:hidden"
            />

            <section
              role={
                isFilterDrawerOpen
                  ? 'dialog'
                  : undefined
              }
              aria-modal={
                isFilterDrawerOpen
                  ? true
                  : undefined
              }
              aria-labelledby="shop-filter-title"
              className="absolute inset-y-0 right-0 z-10 w-[min(92vw,420px)] overflow-y-auto bg-white p-5 shadow-2xl lg:static lg:z-auto lg:mt-5 lg:w-auto lg:overflow-visible lg:rounded-3xl lg:shadow-sm"
            >
              <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4 lg:hidden">
                <div>
                  <h2
                    id="shop-filter-title"
                    className="font-display text-xl font-black text-dh-primary"
                  >
                    Find a shop
                  </h2>

                  <p className="mt-1 text-xs font-medium text-gray-500">
                    Refine marketplace
                    results.
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Close filters"
                  onClick={() =>
                    setIsFilterDrawerOpen(
                      false
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            <form
              onSubmit={submitSearch}
              className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(150px,0.7fr))_auto] lg:gap-3"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                <Input
                  value={searchInput}
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value
                    )
                  }
                  placeholder="Search shops, specialties or locations..."
                  className="h-12 rounded-xl pl-12 lg:rounded-full"
                />
              </div>

              <select
                value={category}
                onChange={(event) =>
                  updateParam(
                    'category',
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-input bg-white px-4 text-sm lg:rounded-full"
              >
                <option value="">
                  All specialties
                </option>

                {directory.facets.categories.map(
                  (facet) => (
                    <option
                      key={facet.value}
                      value={facet.value}
                    >
                      {facet.value} (
                      {facet.count})
                    </option>
                  )
                )}
              </select>

              <select
                value={location}
                onChange={(event) =>
                  updateParam(
                    'location',
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-input bg-white px-4 text-sm lg:rounded-full"
              >
                <option value="">
                  All locations
                </option>

                {directory.facets.locations.map(
                  (facet) => (
                    <option
                      key={facet.value}
                      value={facet.value}
                    >
                      {facet.value} (
                      {facet.count})
                    </option>
                  )
                )}
              </select>

              <select
                value={accountType}
                onChange={(event) =>
                  updateParam(
                    'account_type',
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-input bg-white px-4 text-sm lg:rounded-full"
              >
                <option value="">
                  All seller types
                </option>

                {directory.facets.accountTypes.map(
                  (facet) => (
                    <option
                      key={facet.value}
                      value={facet.value}
                    >
                      {formatAccountType(
                        facet.value
                      )}{' '}
                      ({facet.count})
                    </option>
                  )
                )}
              </select>

              <select
                value={sort}
                onChange={(event) =>
                  updateParam(
                    'sort',
                    event.target.value
                  )
                }
                className="h-12 w-full rounded-xl border border-input bg-white px-4 text-sm lg:rounded-full"
              >
                <option value="featured">
                  Featured
                </option>
                <option value="name-asc">
                  Store name
                </option>
                <option value="products-desc">
                  Most products
                </option>
                <option value="rating-desc">
                  Highest rated
                </option>
                <option value="newest">
                  Newest shops
                </option>
              </select>

              <Button
                type="submit"
                className="h-12 rounded-xl bg-dh-primary px-6 text-white hover:bg-dh-secondary hover:text-black lg:rounded-full"
              >
                <span className="lg:hidden">
                  Apply filters
                </span>

                <span className="hidden lg:inline">
                  Search
                </span>
              </Button>
            </form>

            {activeFilterCount > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-gray-500">
                  {activeFilterCount}{' '}
                  active store filter
                  {activeFilterCount === 1
                    ? ''
                    : 's'}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  className="rounded-full"
                >
                  Clear filters
                </Button>
              </div>
            )}
            </section>
          </div>

          <section className="mt-6">
            {isLoading ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-3xl bg-white shadow-sm">
                <div className="text-center">
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-dh-primary" />
                  <p className="mt-3 text-sm font-bold text-gray-500">
                    Loading marketplace shops...
                  </p>
                </div>
              </div>
            ) : loadError ? (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-900">
                <Store className="mx-auto h-12 w-12" />
                <h2 className="mt-4 text-xl font-black">
                  Shops could not load
                </h2>
                <p className="mt-2 text-sm">
                  {loadError}
                </p>
              </div>
            ) : directory.stores.length >
              0 ? (
              <>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-2xl font-black text-dh-primary">
                      Marketplace shops
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Showing{' '}
                      {
                        directory.stores
                          .length
                      }{' '}
                      of{' '}
                      {directory.total.toLocaleString(
                        'en-ZM'
                      )}{' '}
                      shops
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 text-sm font-bold text-gray-500">
                    <PackageCheck className="h-4 w-4 text-dh-secondary" />
                    Approved DigitalHood
                    storefronts
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {directory.stores.map(
                    (store) => (
                      <StoreCard
                        key={store.key}
                        store={store}
                      />
                    )
                  )}
                </div>

                {directory.totalPages >
                  1 && (
                  <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        directory.page <= 1
                      }
                      onClick={() =>
                        setPage(
                          directory.page - 1
                        )
                      }
                      className="rounded-full"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>

                    <span className="rounded-full bg-white px-5 py-3 text-sm font-black text-dh-primary shadow-sm">
                      Page {directory.page}{' '}
                      of{' '}
                      {
                        directory.totalPages
                      }
                    </span>

                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        directory.page >=
                        directory.totalPages
                      }
                      onClick={() =>
                        setPage(
                          directory.page + 1
                        )
                      }
                      className="rounded-full"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <Store className="mx-auto h-14 w-14 text-dh-primary" />

                <h2 className="mt-4 font-display text-2xl font-black text-dh-primary">
                  No shops match these
                  filters
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-sm text-gray-500">
                  Try another store name,
                  specialty, seller type or
                  location.
                </p>

                <Button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-full bg-dh-primary"
                >
                  Show all shops
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
