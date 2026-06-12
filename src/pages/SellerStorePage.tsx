import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Heart,
  Loader2,
  Mail,
  PackageCheck,
  Phone,
  ShoppingCart,
  Star,
  Store,
  ThumbsDown,
  ThumbsUp,
  MinusCircle,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/store/cartStore'
import { useWishlist } from '@/context/WishlistContext'
import {
  fetchPublicSellerStore,
  type PublicSellerProduct,
  type PublicSellerStore,
} from '@/api/publicSellers'

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
  const [addedProductId, setAddedProductId] = useState<string | number | null>(null)
  const addItem = useCartStore((state) => state.addItem)
  const { toggleWishlist, isInWishlist } = useWishlist()

  useEffect(() => {
    if (!sellerKey) return

    setIsLoading(true)
    setError('')

    fetchPublicSellerStore(sellerKey)
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
  const featuredProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const scoreA = safeNumber(a.totalSales) + safeNumber(a.averageRating)
        const scoreB = safeNumber(b.totalSales) + safeNumber(b.averageRating)
        return scoreB - scoreA
      }),
    [products]
  )

  function handleAddToCart(product: PublicSellerProduct) {
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
        image: product.image || product.images?.[0] || '/logo.jpg',
        stock_status: product.stockStatus,
        stock_quantity: product.stockQuantity,
        stock_label: product.stockLabel,
        stock_tone: product.stockTone,
        can_add_to_cart: product.canAddToCart,
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
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-dh-primary" />
              <p className="mt-3 text-sm font-semibold text-gray-500">
                Loading seller store...
              </p>
            </div>
          </section>
        ) : error || !store || !seller ? (
          <section className="container mx-auto px-4 py-16">
            <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
              <Store className="mx-auto h-12 w-12 text-dh-primary" />
              <h1 className="mt-4 font-display text-3xl font-bold text-dh-primary">
                Seller store not found
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-gray-500">
                {error || 'This seller store is not available right now.'}
              </p>
              <Link
                to="/shop"
                className="mt-6 inline-flex items-center rounded-full bg-dh-primary px-5 py-3 text-sm font-bold text-white hover:bg-dh-secondary"
              >
                Back to shop
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section
              className="relative overflow-hidden bg-dh-primary text-white"
              style={{
                backgroundImage: seller.coverPhotoUrl
                  ? `linear-gradient(90deg, rgba(38,36,140,0.94), rgba(38,36,140,0.62)), url(${seller.coverPhotoUrl})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16 xl:px-12">
                <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                  <div>
                    <Badge className="mb-5 bg-[#ffb54a] text-black hover:bg-[#ffb54a]">
                      Verified DigitalHood seller
                    </Badge>

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-white/20 bg-white/10">
                        {seller.profilePhotoUrl ? (
                          <img
                            src={seller.profilePhotoUrl}
                            alt={seller.storeName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="h-12 w-12 text-[#ffb54a]" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
                            {seller.storeName}
                          </h1>
                          {seller.verified && (
                            <BadgeCheck className="h-7 w-7 text-[#ffb54a]" />
                          )}
                        </div>

                        {seller.tagline && (
                          <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-white/80">
                            {seller.tagline}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[2rem] bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ffb54a]">
                      Store trust
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[
                        ['Years', formatYears(seller.yearsOnDigitalHood)],
                        ['Items sold', store.stats.itemsSold.toLocaleString('en-ZM')],
                        ['Products', store.stats.productsLive.toLocaleString('en-ZM')],
                        ['Rating', getRatingLabel(store)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl bg-white/10 p-4">
                          <p className="text-[11px] font-bold uppercase text-white/60">{label}</p>
                          <p className="mt-1 font-display text-xl font-black">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="container mx-auto -mt-6 px-4 sm:px-6 lg:px-8 xl:px-12">
              <div className="grid gap-4 rounded-[2rem] bg-white p-4 shadow-sm md:grid-cols-4">
                <div className="rounded-3xl bg-gray-50 p-5">
                  <Star className="h-5 w-5 text-[#ffb54a]" />
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-gray-400">
                    Rating
                  </p>
                  <p className="mt-1 font-display text-2xl font-black text-dh-primary">
                    {getRatingLabel(store)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    {getRatingSubtext(store)}
                  </p>
                </div>

                <div className="rounded-3xl bg-green-50 p-5">
                  <ThumbsUp className="h-5 w-5 text-green-700" />
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-green-700/70">
                    Positive
                  </p>
                  <p className="mt-1 font-display text-2xl font-black text-green-800">
                    {store.stats.feedback.positive.toLocaleString('en-ZM')}
                  </p>
                </div>

                <div className="rounded-3xl bg-amber-50 p-5">
                  <MinusCircle className="h-5 w-5 text-amber-700" />
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-amber-700/70">
                    Neutral
                  </p>
                  <p className="mt-1 font-display text-2xl font-black text-amber-800">
                    {store.stats.feedback.neutral.toLocaleString('en-ZM')}
                  </p>
                </div>

                <div className="rounded-3xl bg-red-50 p-5">
                  <ThumbsDown className="h-5 w-5 text-red-700" />
                  <p className="mt-3 text-xs font-black uppercase tracking-wide text-red-700/70">
                    Negative
                  </p>
                  <p className="mt-1 font-display text-2xl font-black text-red-800">
                    {store.stats.feedback.negative.toLocaleString('en-ZM')}
                  </p>
                </div>
              </div>
            </section>

            <section className="container mx-auto grid gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8 xl:px-12">
              <aside className="space-y-4">
                <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <h2 className="font-display text-2xl font-black text-dh-primary">
                    About this store
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-gray-600">
                    {seller.description ||
                      'This seller is approved to sell on DigitalHood Marketplace.'}
                  </p>
                </div>

                {(seller.supportPhone || seller.supportEmail) && (
                  <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                    <h2 className="font-display text-xl font-black text-dh-primary">
                      Store support
                    </h2>
                    <div className="mt-4 space-y-3">
                      {seller.supportPhone && (
                        <a
                          href={`tel:${seller.supportPhone}`}
                          className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 text-sm font-bold text-dh-primary"
                        >
                          <Phone className="h-4 w-4" />
                          {seller.supportPhone}
                        </a>
                      )}

                      {seller.supportEmail && (
                        <a
                          href={`mailto:${seller.supportEmail}`}
                          className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 text-sm font-bold text-dh-primary"
                        >
                          <Mail className="h-4 w-4" />
                          {seller.supportEmail}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </aside>

              <section>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-3xl font-black text-dh-primary">
                      Products by {seller.storeName}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {products.length
                        ? `${products.length.toLocaleString('en-ZM')} live product${
                            products.length === 1 ? '' : 's'
                          } from this seller.`
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

                {featuredProducts.length === 0 ? (
                  <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm">
                    <PackageCheck className="mx-auto h-12 w-12 text-dh-primary" />
                    <h3 className="mt-4 font-display text-2xl font-black text-dh-primary">
                      No live products yet
                    </h3>
                    <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
                      Products will appear here once this seller has live marketplace items.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {featuredProducts.map((product) => {
                      const image = product.image || product.images?.[0] || '/logo.jpg'
                      const productUrl = getProductUrl(product)
                      const canAdd =
                        product.canAddToCart !== false &&
                        product.stockStatus !== 'outofstock' &&
                        product.type !== 'variable'

                      return (
                        <article
                          key={product.id}
                          className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                        >
                          <div className="relative aspect-square overflow-hidden bg-gray-100">
                            <Link to={productUrl}>
                              <img
                                src={image}
                                alt={product.name}
                                onError={(event) => {
                                  event.currentTarget.src = '/logo.jpg'
                                }}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleWishlist(product as any)}
                              className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${
                                isInWishlist(String(product.id))
                                  ? 'bg-red-500 text-white'
                                  : 'bg-white text-gray-600'
                              }`}
                              aria-label="Toggle wishlist"
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  isInWishlist(String(product.id)) ? 'fill-current' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <div className="p-4">
                            <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
                              <Star className="h-3.5 w-3.5 fill-[#ffb54a] text-[#ffb54a]" />
                              <span>
                                {safeNumber(product.averageRating).toFixed(1)}
                              </span>
                              <span>
                                ({safeNumber(product.ratingCount)})
                              </span>
                            </div>

                            <Link to={productUrl}>
                              <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-dh-primary hover:text-[#ffb54a]">
                                {product.name}
                              </h3>
                            </Link>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="font-display text-base font-black text-dh-primary">
                                {formatPrice(product.price)}
                              </span>
                              {safeNumber(product.regularPrice) > safeNumber(product.price) && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatPrice(product.regularPrice)}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="truncate rounded-full bg-gray-50 px-3 py-1 text-[11px] font-bold text-gray-500">
                                {getStockText(product)}
                              </span>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  canAdd
                                    ? handleAddToCart(product)
                                    : (window.location.href = productUrl)
                                }
                                className="rounded-full bg-dh-primary text-xs text-white hover:bg-[#ffb54a] hover:text-dh-primary"
                              >
                                {addedProductId === product.id ? (
                                  'Added'
                                ) : canAdd ? (
                                  <>
                                    <ShoppingCart className="mr-1 h-3.5 w-3.5" />
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
                )}
              </section>
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}
