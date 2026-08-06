import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Check,
  Filter,
  Heart,
  LifeBuoy,
  Loader2,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Store,
  ThumbsDown,
  ThumbsUp,
  MinusCircle,
  X,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/context/WishlistContext'
import {
  fetchPublicSellerStore,
  type PublicSellerProduct,
  type PublicSellerStore,
} from '@/api/publicSellers'
import { getFastProductImage, getFastProductSrcSet, getProductImageSizes } from '@/lib/productImages'

function safeNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function formatPrice(value: unknown) {
  return `K${safeNumber(value).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductUrl(product: PublicSellerProduct) {
  return `/product/${product.slug || product.id}`
}

function getStockText(product: PublicSellerProduct) {
  if (product.canAddToCart === false || product.stockStatus === 'outofstock') {
    return 'Out of stock'
  }

  return product.stockLabel || 'Available'
}

function formatYears(years?: number) {
  const value = safeNumber(years)

  if (value <= 0) return 'New seller'
  if (value < 1) return 'Under 1 year'
  if (value === 1) return '1 year'

  return `${value.toLocaleString('en-ZM')} years`
}

function getRatingLabel(store: PublicSellerStore) {
  if (!store.stats.ratingAverage || store.stats.ratingCount <= 0) {
    return 'No ratings yet'
  }

  return `${store.stats.ratingAverage.toFixed(1)} / 5`
}

function getRatingSubtext(store: PublicSellerStore) {
  if (!store.stats.ratingAverage || store.stats.ratingCount <= 0) {
    return 'New feedback will appear here'
  }

  return `${store.stats.ratingCount.toLocaleString('en-ZM')} verified rating${
    store.stats.ratingCount === 1 ? '' : 's'
  }`
}

export default function SellerStorePage() {
  const { sellerKey } = useParams<{ sellerKey: string }>()
  const [store, setStore] = useState<PublicSellerStore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)
  const [filterError, setFilterError] = useState('')
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('')
  const [availability, setAvailability] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState('featured')
  const [addedProductId, setAddedProductId] = useState<string | number | null>(null)
  const addItem = useCartStore((state) => state.addItem)
  const { toggleWishlist, isInWishlist } = useWishlist()

  useEffect(() => {
    if (!sellerKey) return

    setIsLoading(true)
    setError('')
    setLoadMoreError('')
    setStore(null)

    fetchPublicSellerStore(
      sellerKey,
      1,
      24
    )
      .then(setStore)
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load seller store.'
        )
      })
      .finally(() => setIsLoading(false))
  }, [sellerKey])

  const seller = store?.seller
  const products = store?.products || []

  const currentFilters = {
    q: searchQuery,
    category,
    availability,
    minPrice,
    maxPrice,
    sort,
  }

  const activeFilterCount = [
    searchQuery,
    category,
    availability,
    minPrice,
    maxPrice,
    sort !== 'featured'
      ? sort
      : '',
  ].filter(Boolean).length

  const hasActiveFilters =
    activeFilterCount > 0

  const selectedCategory =
    store?.facets.categories.find(
      (item) =>
        item.slug === category
    )

  const resultDescription =
    hasActiveFilters
      ? `${store?.count || 0} matching product${
          store?.count === 1
            ? ''
            : 's'
        }`
      : `${store?.count || 0} live product${
          store?.count === 1
            ? ''
            : 's'
        }`

  const hasMoreProducts =
    store
      ? store.page <
          store.totalPages &&
        products.length <
          store.count
      : false
  const visibleProducts = useMemo(
    () => [...products],
    [products]
  )

  async function loadFilteredStore(
    nextFilters = currentFilters
  ) {
    if (!sellerKey) return

    setIsFiltering(true)
    setFilterError('')
    setLoadMoreError('')

    try {
      const nextStore =
        await fetchPublicSellerStore(
          sellerKey,
          1,
          24,
          nextFilters
        )

      setStore(nextStore)
      setIsFilterDrawerOpen(false)
    } catch (requestError) {
      setFilterError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to filter this store.'
      )
    } finally {
      setIsFiltering(false)
    }
  }

  function handleSearchSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const normalizedSearch =
      searchDraft.trim()

    setSearchQuery(
      normalizedSearch
    )

    void loadFilteredStore({
      ...currentFilters,
      q: normalizedSearch,
    })
  }

  function applyFilters() {
    void loadFilteredStore(
      currentFilters
    )
  }

  function handleSortChange(
    nextSort: string
  ) {
    setSort(nextSort)

    void loadFilteredStore({
      ...currentFilters,
      sort: nextSort,
    })
  }

  function clearAllFilters() {
    setSearchDraft('')
    setSearchQuery('')
    setCategory('')
    setAvailability('')
    setMinPrice('')
    setMaxPrice('')
    setSort('featured')

    void loadFilteredStore({
      q: '',
      category: '',
      availability: '',
      minPrice: '',
      maxPrice: '',
      sort: 'featured',
    })
  }

  function removeFilter(
    key:
      | 'search'
      | 'category'
      | 'availability'
      | 'price'
      | 'sort'
  ) {
    const nextFilters = {
      ...currentFilters,
    }

    if (key === 'search') {
      setSearchDraft('')
      setSearchQuery('')
      nextFilters.q = ''
    }

    if (key === 'category') {
      setCategory('')
      nextFilters.category = ''
    }

    if (
      key === 'availability'
    ) {
      setAvailability('')
      nextFilters.availability = ''
    }

    if (key === 'price') {
      setMinPrice('')
      setMaxPrice('')
      nextFilters.minPrice = ''
      nextFilters.maxPrice = ''
    }

    if (key === 'sort') {
      setSort('featured')
      nextFilters.sort =
        'featured'
    }

    void loadFilteredStore(
      nextFilters
    )
  }

  async function handleLoadMore() {
    if (
      !sellerKey ||
      !store ||
      isLoadingMore ||
      !hasMoreProducts
    ) {
      return
    }

    setIsLoadingMore(true)
    setLoadMoreError('')

    try {
      const nextPage =
        await fetchPublicSellerStore(
          sellerKey,
          store.page + 1,
          store.perPage || 24,
          currentFilters
        )

      setStore((currentStore) => {
        if (!currentStore) {
          return nextPage
        }

        const productsById =
          new Map<
            string,
            PublicSellerProduct
          >()

        for (const product of [
          ...currentStore.products,
          ...nextPage.products,
        ]) {
          productsById.set(
            String(product.id),
            product
          )
        }

        return {
          ...currentStore,
          ...nextPage,
          seller:
            nextPage.seller ||
            currentStore.seller,
          stats:
            nextPage.stats ||
            currentStore.stats,
          products:
            Array.from(
              productsById.values()
            ),
          count:
            nextPage.count ||
            currentStore.count,
        }
      })
    } catch (requestError) {
      setLoadMoreError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load more products.'
      )
    } finally {
      setIsLoadingMore(false)
    }
  }

  function handleAddToCart(product: PublicSellerProduct) {
    if (!seller) return
    if (product.type === 'variable') {
      window.location.href = getProductUrl(product)
      return
    }

    if (product.canAddToCart === false || product.stockStatus === 'outofstock') {
      return
    }

    const added = addItem(
      {
        id: Number(product.id),
        productId: Number(product.id),
        name: product.name,
        slug: product.slug,
        type: product.type,
        price: safeNumber(product.price),
        regular_price: safeNumber(product.regularPrice || product.price),
        image: getFastProductImage(product, 'card'),
        stock_status: product.stockStatus,
        stock_quantity: product.stockQuantity,
        stock_label: product.stockLabel,
        stock_tone: product.stockTone,
        can_add_to_cart: product.canAddToCart,
      sellerStoreName: seller.storeName,
      sellerKey: seller.key || sellerKey || '',
      sellerUrl: seller.key ? `/seller/${seller.key}` : sellerKey ? `/seller/${sellerKey}` : '',
      sellerVerified: Boolean(seller.verified),
      sellerCustomerId: seller.id || '',
      sellerAvatarUrl: seller.profilePhotoUrl || '',
      sellerFeedbackText:
        store?.stats?.feedback?.total && store.stats.feedback.total > 0
          ? `${Math.round((Number(store.stats.feedback.positive || 0) / Number(store.stats.feedback.total || 1)) * 100)}% positive`
          : 'New seller',

    },
      1
    )

    if (!added) return

    setAddedProductId(product.id)
    window.setTimeout(() => setAddedProductId(null), 1800)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title={seller?.storeName || 'Seller Store'}
        description={
          seller?.tagline ||
          seller?.description ||
          'Shop verified seller products on DigitalHood Marketplace Zambia.'
        }
        path={sellerKey ? `/seller/${sellerKey}` : '/seller'}
      />

      <Header />

      <main>
        {isLoading ? (
          <section className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-dh-primary" />
              <p className="mt-3 text-sm font-semibold text-gray-500">
                Loading seller store...
              </p>
            </div>
          </section>
        ) : error || !store || !seller ? (
          <section className="mx-auto max-w-[1500px] px-4 py-16 sm:px-6 lg:px-8">
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
              <Store className="mx-auto h-12 w-12 text-dh-primary" />
              <h1 className="mt-4 font-display text-3xl font-bold text-dh-primary">
                Seller store not found
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                {error || 'This seller store is not available right now.'}
              </p>
              <Link
                to="/shops"
                className="mt-6 inline-flex items-center rounded-full bg-dh-primary px-5 py-3 text-sm font-bold text-white hover:bg-dh-secondary"
              >
                Back to shops
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="bg-gray-50 px-4 pt-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="mx-auto max-w-[1500px] overflow-hidden rounded-2xl bg-white shadow-sm">
                <div
                  className="h-24 bg-dh-primary sm:h-32"
                  style={{
                    backgroundImage: seller.coverPhotoUrl
                      ? `linear-gradient(90deg, rgba(38,36,140,0.88), rgba(38,36,140,0.32)), url(${seller.coverPhotoUrl})`
                      : 'linear-gradient(135deg, #26248c, #ffb54a)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                <div className="px-4 pb-4 sm:px-5 lg:px-6">
                  <div className="-mt-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                      <div className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-dh-primary shadow-md sm:h-24 sm:w-24">
                        {seller.profilePhotoUrl ? (
                          <img
                            src={seller.profilePhotoUrl}
                            alt={seller.storeName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-10 w-10 text-[#ffb54a]" />
                        )}
                      </div>

                      <div className="pb-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge className="bg-[#ffb54a] text-black hover:bg-[#ffb54a]">
                            Verified seller
                          </Badge>
                          {seller.verified && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">
                              <BadgeCheck className="h-3.5 w-3.5" />
                              DigitalHood approved
                            </span>
                          )}
                        </div>

                        <h1 className="font-display text-2xl font-black tracking-tight text-dh-primary sm:text-3xl">
                          {seller.storeName}
                        </h1>

                        {seller.tagline && (
                          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-gray-500">
                            {seller.tagline}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[500px]">
                      {[
                        ['Years', formatYears(seller.yearsOnDigitalHood)],
                        ['Sold', store.stats.itemsSold.toLocaleString('en-ZM')],
                        ['Products', store.stats.productsLive.toLocaleString('en-ZM')],
                        ['Rating', getRatingLabel(store)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-gray-50 px-3 py-2.5">
                          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">
                            {label}
                          </p>
                          <p className="mt-1 truncate font-display text-lg font-black text-dh-primary">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto max-w-[1500px] px-4 pt-3 sm:px-6 lg:px-8 xl:px-12">
              <div className="flex flex-col gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffb54a]/15 text-[#b87500]">
                    <Star className="h-5 w-5 fill-[#ffb54a] text-[#ffb54a]" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-dh-primary">
                      {getRatingLabel(store)}
                    </p>
                    <p className="text-xs font-semibold text-gray-500">
                      {getRatingSubtext(store)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:min-w-[420px]">
                  <div className="flex items-center justify-between rounded-2xl bg-green-50 px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-green-700">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Positive
                    </span>
                    <span className="font-display text-sm font-black text-green-800">
                      {(store.stats.feedback?.positive || 0).toLocaleString('en-ZM')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-amber-700">
                      <MinusCircle className="h-3.5 w-3.5" />
                      Neutral
                    </span>
                    <span className="font-display text-sm font-black text-amber-800">
                      {(store.stats.feedback?.neutral || 0).toLocaleString('en-ZM')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-red-50 px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs font-black text-red-700">
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Negative
                    </span>
                    <span className="font-display text-sm font-black text-red-800">
                      {(store.stats.feedback?.negative || 0).toLocaleString('en-ZM')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mx-auto grid max-w-[1500px] gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 xl:px-12">
              <aside className="space-y-4 text-center lg:text-left">
                <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="font-display text-xl font-black text-dh-primary">
                    About this store
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {seller.description ||
                      'This seller is approved to sell on DigitalHood Marketplace.'}
                  </p>
                </div>

              </aside>

              <section className="min-w-0">
                <div className="mb-4 flex flex-col gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                  <div>
                    <h2 className="font-display text-2xl font-black text-dh-primary sm:text-3xl">
                      Products by {seller.storeName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {products.length
                        ? `Showing ${products.length.toLocaleString(
                            'en-ZM'
                          )} of ${store.count.toLocaleString(
                            'en-ZM'
                          )} ${
                            hasActiveFilters
                              ? 'matching'
                              : 'live'
                          } product${
                            store.count === 1
                              ? ''
                              : 's'
                          }.`
                        : hasActiveFilters
                          ? 'No products match the current search and filters.'
                          : 'No live products from this seller yet.'}
                    </p>
                  </div>

                  <Link
                    to="/shop"
                    className="inline-flex items-center rounded-full border border-dh-primary px-4 py-2 text-sm font-bold text-dh-primary hover:bg-dh-primary hover:text-white"
                  >
                    Continue shopping
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>

                <div className="mb-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-gray-100 sm:p-4">
                  <div className="flex items-center gap-2">
                    <form
                      onSubmit={handleSearchSubmit}
                      className="relative min-w-0 flex-1"
                    >
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                      <Input
                        value={searchDraft}
                        onChange={(event) =>
                          setSearchDraft(
                            event.target.value
                          )
                        }
                        placeholder={`Search in ${seller.storeName}`}
                        aria-label={`Search products in ${seller.storeName}`}
                        className="h-10 rounded-full border-gray-200 bg-gray-50 pl-9 pr-10 text-sm font-semibold focus-visible:ring-dh-primary"
                      />

                      {searchDraft && (
                        <button
                          type="button"
                          onClick={() =>
                            setSearchDraft('')
                          }
                          aria-label="Clear search text"
                          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-dh-primary"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </form>

                    <Button
                      type="button"
                      onClick={() =>
                        setIsFilterDrawerOpen(
                          true
                        )
                      }
                      variant="outline"
                      className="relative h-10 shrink-0 rounded-full border-dh-primary/20 px-3 font-black text-dh-primary lg:hidden"
                    >
                      <Filter className="mr-1.5 h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 && (
                        <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffb54a] px-1 text-[10px] font-black text-dh-primary">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>

                    <Button
                      type="submit"
                      form="seller-product-search"
                      className="hidden"
                    >
                      Search
                    </Button>
                  </div>

                  <form
                    id="seller-product-search"
                    onSubmit={handleSearchSubmit}
                    className="hidden"
                  />

                  <div className="mt-3 hidden grid-cols-[minmax(150px,1fr)_minmax(130px,0.7fr)_110px_110px_minmax(145px,0.8fr)_auto] gap-2 lg:grid">
                    <label className="sr-only" htmlFor="seller-category">
                      Product category
                    </label>

                    <select
                      id="seller-category"
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value
                        )
                      }
                      className="h-10 min-w-0 rounded-full border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-dh-primary outline-none focus:border-dh-primary"
                    >
                      <option value="">
                        All categories
                      </option>
                      {store.facets.categories.map(
                        (item) => (
                          <option
                            key={item.slug}
                            value={item.slug}
                          >
                            {item.name} ({item.count})
                          </option>
                        )
                      )}
                    </select>

                    <label className="sr-only" htmlFor="seller-availability">
                      Availability
                    </label>

                    <select
                      id="seller-availability"
                      value={availability}
                      onChange={(event) =>
                        setAvailability(
                          event.target.value
                        )
                      }
                      className="h-10 min-w-0 rounded-full border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-dh-primary outline-none focus:border-dh-primary"
                    >
                      <option value="">
                        All stock
                      </option>
                      <option value="instock">
                        Available ({store.facets.availability.inStock})
                      </option>
                      <option value="on_sale">
                        On sale ({store.facets.availability.onSale})
                      </option>
                    </select>

                    <Input
                      value={minPrice}
                      onChange={(event) =>
                        setMinPrice(
                          event.target.value
                        )
                      }
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Min K"
                      aria-label="Minimum price"
                      className="h-10 rounded-full border-gray-200 bg-gray-50 text-sm font-semibold"
                    />

                    <Input
                      value={maxPrice}
                      onChange={(event) =>
                        setMaxPrice(
                          event.target.value
                        )
                      }
                      type="number"
                      inputMode="decimal"
                      min="0"
                      placeholder="Max K"
                      aria-label="Maximum price"
                      className="h-10 rounded-full border-gray-200 bg-gray-50 text-sm font-semibold"
                    />

                    <label className="sr-only" htmlFor="seller-sort">
                      Sort products
                    </label>

                    <select
                      id="seller-sort"
                      value={sort}
                      onChange={(event) =>
                        handleSortChange(
                          event.target.value
                        )
                      }
                      className="h-10 min-w-0 rounded-full border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-dh-primary outline-none focus:border-dh-primary"
                    >
                      <option value="featured">
                        Featured
                      </option>
                      <option value="popular">
                        Most popular
                      </option>
                      <option value="rating">
                        Best rated
                      </option>
                      <option value="price_asc">
                        Price: low to high
                      </option>
                      <option value="price_desc">
                        Price: high to low
                      </option>
                      <option value="name_asc">
                        Name: A to Z
                      </option>
                    </select>

                    <Button
                      type="button"
                      onClick={applyFilters}
                      disabled={isFiltering}
                      className="h-10 rounded-full bg-dh-primary px-5 font-black text-white hover:bg-[#ffb54a] hover:text-dh-primary"
                    >
                      {isFiltering ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <SlidersHorizontal className="mr-1.5 h-4 w-4" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2 lg:hidden">
                    <p className="truncate text-xs font-semibold text-gray-500">
                      {resultDescription}
                    </p>

                    <select
                      value={sort}
                      onChange={(event) =>
                        handleSortChange(
                          event.target.value
                        )
                      }
                      aria-label="Sort store products"
                      className="h-8 max-w-[145px] rounded-full border border-gray-200 bg-gray-50 px-2 text-xs font-black text-dh-primary outline-none"
                    >
                      <option value="featured">
                        Featured
                      </option>
                      <option value="popular">
                        Popular
                      </option>
                      <option value="rating">
                        Best rated
                      </option>
                      <option value="price_asc">
                        Price low
                      </option>
                      <option value="price_desc">
                        Price high
                      </option>
                      <option value="name_asc">
                        A to Z
                      </option>
                    </select>
                  </div>

                  {(hasActiveFilters ||
                    filterError) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFilter(
                              'search'
                            )
                          }
                          className="inline-flex max-w-full items-center gap-1 rounded-full bg-dh-primary/8 px-3 py-1.5 text-xs font-black text-dh-primary"
                        >
                          Search: “{searchQuery}”
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {category && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFilter(
                              'category'
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-dh-primary/8 px-3 py-1.5 text-xs font-black text-dh-primary"
                        >
                          {selectedCategory?.name ||
                            category}
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {availability && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFilter(
                              'availability'
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700"
                        >
                          {availability ===
                          'on_sale'
                            ? 'On sale'
                            : 'Available'}
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {(minPrice ||
                        maxPrice) && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFilter(
                              'price'
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-[#ffb54a]/15 px-3 py-1.5 text-xs font-black text-[#9a6200]"
                        >
                          K{minPrice || '0'} – K{maxPrice || 'Any'}
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {sort !==
                        'featured' && (
                        <button
                          type="button"
                          onClick={() =>
                            removeFilter(
                              'sort'
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-black text-gray-600"
                        >
                          Sorted
                          <X className="h-3 w-3" />
                        </button>
                      )}

                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={
                            clearAllFilters
                          }
                          className="text-xs font-black text-red-600 hover:text-red-700"
                        >
                          Clear all
                        </button>
                      )}

                      {filterError && (
                        <p
                          role="alert"
                          className="w-full text-xs font-bold text-red-600"
                        >
                          {filterError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Drawer
                  open={isFilterDrawerOpen}
                  onOpenChange={
                    setIsFilterDrawerOpen
                  }
                >
                  <DrawerContent className="max-h-[88vh]">
                    <DrawerHeader className="text-left">
                      <DrawerTitle className="font-display text-xl font-black text-dh-primary">
                        Filter this store
                      </DrawerTitle>
                      <DrawerDescription>
                        Narrow {seller.storeName} products without leaving the store.
                      </DrawerDescription>
                    </DrawerHeader>

                    <div className="overflow-y-auto px-4 pb-2">
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-gray-500">
                            Category
                          </label>

                          <select
                            value={category}
                            onChange={(event) =>
                              setCategory(
                                event.target.value
                              )
                            }
                            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm font-bold text-dh-primary outline-none focus:border-dh-primary"
                          >
                            <option value="">
                              All categories
                            </option>
                            {store.facets.categories.map(
                              (item) => (
                                <option
                                  key={item.slug}
                                  value={item.slug}
                                >
                                  {item.name} ({item.count})
                                </option>
                              )
                            )}
                          </select>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-gray-500">
                            Availability
                          </p>

                          <div className="grid grid-cols-3 gap-2">
                            {[
                              ['', 'All'],
                              ['instock', 'Available'],
                              ['on_sale', 'On sale'],
                            ].map(
                              ([value, label]) => (
                                <button
                                  key={
                                    value ||
                                    'all'
                                  }
                                  type="button"
                                  onClick={() =>
                                    setAvailability(
                                      value
                                    )
                                  }
                                  className={`flex h-10 items-center justify-center rounded-xl border px-2 text-xs font-black ${
                                    availability ===
                                    value
                                      ? 'border-dh-primary bg-dh-primary text-white'
                                      : 'border-gray-200 bg-gray-50 text-gray-600'
                                  }`}
                                >
                                  {availability ===
                                    value && (
                                    <Check className="mr-1 h-3.5 w-3.5" />
                                  )}
                                  {label}
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-black uppercase tracking-wide text-gray-500">
                            Price range
                          </p>

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={minPrice}
                              onChange={(event) =>
                                setMinPrice(
                                  event.target.value
                                )
                              }
                              type="number"
                              inputMode="decimal"
                              min="0"
                              placeholder="Minimum K"
                              className="h-11 rounded-xl bg-gray-50"
                            />

                            <Input
                              value={maxPrice}
                              onChange={(event) =>
                                setMaxPrice(
                                  event.target.value
                                )
                              }
                              type="number"
                              inputMode="decimal"
                              min="0"
                              placeholder="Maximum K"
                              className="h-11 rounded-xl bg-gray-50"
                            />
                          </div>

                          {store.facets.price.max >
                            0 && (
                            <p className="mt-1.5 text-xs font-semibold text-gray-400">
                              Store range: {formatPrice(
                                store.facets.price.min
                              )} – {formatPrice(
                                store.facets.price.max
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <DrawerFooter className="border-t border-gray-100">
                      <Button
                        type="button"
                        onClick={applyFilters}
                        disabled={isFiltering}
                        className="h-11 rounded-full bg-dh-primary font-black text-white"
                      >
                        {isFiltering ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Applying filters...
                          </>
                        ) : (
                          <>
                            <Filter className="mr-2 h-4 w-4" />
                            Show matching products
                          </>
                        )}
                      </Button>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={
                            clearAllFilters
                          }
                          className="rounded-full font-black"
                        >
                          Clear
                        </Button>

                        <DrawerClose asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-full font-black"
                          >
                            Close
                          </Button>
                        </DrawerClose>
                      </div>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                {visibleProducts.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                    <PackageCheck className="mx-auto h-12 w-12 text-dh-primary" />
                    <h3 className="mt-4 font-display text-2xl font-black text-dh-primary">
                      {hasActiveFilters
                        ? 'No matching products'
                        : 'No live products yet'}
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                      {hasActiveFilters
                        ? 'Try another search, category or price range.'
                        : 'Products will appear here once this seller has live marketplace items.'}
                    </p>

                    {hasActiveFilters && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          clearAllFilters
                        }
                        className="mt-5 rounded-full border-dh-primary font-black text-dh-primary"
                      >
                        Clear store filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mx-auto grid max-w-none grid-cols-2 gap-3 sm:grid-cols-3 lg:mx-0 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {visibleProducts.map((product) => {
                      const image = getFastProductImage(product, 'card')
                      const imageSrcSet = getFastProductSrcSet(product)
                      const productUrl = getProductUrl(product)
                      const canAdd =
                        product.canAddToCart !== false &&
                        product.stockStatus !== 'outofstock' &&
                        product.type !== 'variable'

                      return (
                        <article
                          key={product.id}
                          className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                            <Link to={productUrl}>
                              <img
                                src={image}
                                srcSet={imageSrcSet}
                                sizes={getProductImageSizes('card')}
                                alt={product.name}
                                loading="lazy"
                                decoding="async"
                                fetchPriority="low"
                                onError={(event) => {
                                  event.currentTarget.src = '/logo.jpg'
                                }}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </Link>

                            <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-dh-primary shadow-sm">
                              {getStockText(product)}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleWishlist(product as any)}
                              className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${
                                isInWishlist(String(product.id))
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white/95 text-gray-600'
                              }`}
                              aria-label="Toggle wishlist"
                            >
                              <Heart
                                className={`h-3.5 w-3.5 ${
                                  isInWishlist(String(product.id)) ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <div className="p-3 sm:p-3.5">
                            <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3 w-3 fill-[#ffb54a] text-[#ffb54a]" />
                                {safeNumber(product.averageRating).toFixed(1)}
                                <span className="text-gray-400">
                                  ({safeNumber(product.ratingCount)})
                                </span>
                              </span>

                              {safeNumber(product.totalSales) > 0 && (
                                <span className="truncate font-bold text-gray-400">
                                  {safeNumber(product.totalSales).toLocaleString('en-ZM')} sold
                                </span>
                              )}
                            </div>

                            <Link to={productUrl}>
                              <h3 className="line-clamp-2 min-h-[2.25rem] text-[13px] font-black leading-5 text-dh-primary hover:text-[#ffb54a]">
                                {product.name}
                              </h3>
                            </Link>

                            <div className="mt-2 flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-display text-base font-black text-dh-primary">
                                  {formatPrice(product.price)}
                                </p>

                                {safeNumber(product.regularPrice) > safeNumber(product.price) && (
                                  <p className="truncate text-[11px] text-gray-400 line-through">
                                    {formatPrice(product.regularPrice)}
                                  </p>
                                )}
                              </div>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  canAdd
                                    ? handleAddToCart(product)
                                    : (window.location.href = productUrl)
                                }
                                className="h-8 shrink-0 rounded-full bg-dh-primary px-3 text-[11px] font-black text-white hover:bg-[#ffb54a] hover:text-dh-primary"
                              >
                                {addedProductId === product.id ? (
                                  'Added'
                                ) : canAdd ? (
                                  <>
                                    <ShoppingCart className="mr-1 h-3 w-3" />
                                    Add
                                  </>
                                ) : (
                                  'View'
                                )}
                              </Button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                    </div>

                    {(hasMoreProducts ||
                      loadMoreError) && (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        {loadMoreError && (
                          <p
                            role="alert"
                            className="text-center text-sm font-semibold text-red-600"
                          >
                            {loadMoreError}
                          </p>
                        )}

                        {hasMoreProducts && (
                          <Button
                            type="button"
                            onClick={
                              handleLoadMore
                            }
                            disabled={
                              isLoadingMore
                            }
                            className="min-w-[220px] rounded-full bg-dh-primary px-6 py-3 font-black text-white hover:bg-[#ffb54a] hover:text-dh-primary"
                          >
                            {isLoadingMore ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading products...
                              </>
                            ) : (
                              `Load more products (${Math.max(
                                0,
                                store.count -
                                  products.length
                              ).toLocaleString(
                                'en-ZM'
                              )} remaining)`
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </section>

            <section className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6 lg:px-8 xl:px-12">
              <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 text-center sm:text-left">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b87500]">
                      Secure marketplace communication
                    </p>

                    <h2 className="mt-2 font-display text-2xl font-black text-dh-primary">
                      Store support
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                      DigitalHood keeps buyer and seller communication inside the
                      marketplace to protect accounts, orders, payments and case history.
                    </p>
                  </div>

                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      disabled
                      className="flex cursor-not-allowed items-start gap-3 rounded-2xl border border-dh-primary/10 bg-dh-primary/[0.04] p-4 text-left opacity-80"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-dh-primary text-[#ffb54a]">
                        <MessageCircle className="h-5 w-5" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-dh-primary">
                          Contact seller
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          DigitalHood Marketplace Chat is coming soon.
                        </span>
                      </span>
                    </button>

                    <Link
                      to="/orders"
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-dh-primary/20 hover:bg-dh-primary/[0.04]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                        <ShieldCheck className="h-5 w-5" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-dh-primary">
                          Resolve an order issue
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          Open the relevant order and report or track the issue securely.
                        </span>
                      </span>
                    </Link>

                    <Link
                      to="/support"
                      className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left transition hover:border-dh-primary/20 hover:bg-dh-primary/[0.04]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffb54a]/15 text-[#b87500]">
                        <LifeBuoy className="h-5 w-5" />
                      </span>

                      <span>
                        <span className="block text-sm font-black text-dh-primary">
                          Marketplace support
                        </span>

                        <span className="mt-1 block text-xs leading-5 text-gray-500">
                          Get help directly from the DigitalHood Support Center.
                        </span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
