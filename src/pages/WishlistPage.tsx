import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Grid3X3,
  Heart,
  List,
  ShoppingBag,
  ShoppingCart,
  Star,
  Trash2,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import StockBadge from '@/components/StockBadge'
import { Button } from '@/components/ui/button'
import { useWishlist } from '@/context/WishlistContext'
import { useCartStore } from '@/store/cartStore'

type WishlistProduct = {
  id: string | number
  productId?: string | number
  variationId?: string | number
  name: string
  slug?: string
  price?: number | string
  regular_price?: number | string
  image?: string
  images?: {
    src: string
  }[]
  type?: string
  hasOptions?: boolean
  stock_status?: string
  stockStatus?: string
  stock_quantity?: number | null
  stockQuantity?: number | null
  manage_stock?: boolean
  manageStock?: boolean
  stock_label?: string
  stockLabel?: string
  stock_tone?: string
  stockTone?: string
  can_add_to_cart?: boolean
  canAddToCart?: boolean
  rating?: number | string
  averageRating?: number | string
  average_rating?: number | string
  reviews?: number | string
  ratingCount?: number | string
  rating_count?: number | string
  totalSales?: number | string
  total_sales?: number | string
  sold?: number | string
}

function normalizePrice(price: unknown) {
  const value = Number(price)
  return Number.isFinite(value) ? value : 0
}

function formatPrice(price: unknown) {
  return `K${normalizePrice(price).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getProductRating(product: WishlistProduct) {
  return normalizePrice(
    product.rating ||
      product.averageRating ||
      product.average_rating ||
      0
  )
}

function getProductReviews(product: WishlistProduct) {
  return normalizePrice(
    product.reviews ||
      product.ratingCount ||
      product.rating_count ||
      0
  )
}

function getProductSold(product: WishlistProduct) {
  return normalizePrice(
    product.totalSales ||
      product.total_sales ||
      product.sold ||
      0
  )
}

function getRatingText(product: WishlistProduct) {
  const rating = getProductRating(product)
  const reviews = getProductReviews(product)

  if (rating > 0 && reviews > 0) {
    return `${rating.toFixed(1)} (${reviews})`
  }

  if (rating > 0) {
    return rating.toFixed(1)
  }

  return 'New'
}

function getSoldText(product: WishlistProduct) {
  const sold = getProductSold(product)

  if (sold <= 0) return ''

  return `${sold.toLocaleString('en-ZM')} sold`
}

function getProductImage(product: WishlistProduct) {
  return product.images?.[0]?.src || product.image || '/logo.jpg'
}

function getProductSlug(product: WishlistProduct) {
  return product.slug || String(product.id)
}

function canBuyDirectly(product: WishlistProduct) {
  if (product.hasOptions || product.type === 'variable') return false
  if (product.canAddToCart === false || product.can_add_to_cart === false) return false
  if (product.stockStatus === 'outofstock' || product.stock_status === 'outofstock') return false

  return true
}

export default function WishlistPage() {
  const { items, removeFromWishlist, isSyncing, openWishlistDrawer } = useWishlist()
  const addItem = useCartStore((state) => state.addItem)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const wishlistItems = items as unknown as WishlistProduct[]

  const handleAddToCart = (product: WishlistProduct) => {
    if (!canBuyDirectly(product)) return

    addItem(
      {
        id: Number(product.id),
        productId: Number(product.productId || product.id),
        variationId: product.variationId ? Number(product.variationId) : undefined,
        name: product.name,
        slug: product.slug,
        type: product.type,
        price: normalizePrice(product.price),
        regular_price: normalizePrice(product.regular_price || product.price),
        image: getProductImage(product),
        stock_status: product.stockStatus || product.stock_status,
        stock_quantity: product.stockQuantity ?? product.stock_quantity,
        manage_stock: product.manageStock ?? product.manage_stock,
        stock_label: product.stockLabel || product.stock_label,
        stock_tone: product.stockTone || product.stock_tone,
        can_add_to_cart: product.canAddToCart ?? product.can_add_to_cart,
      },
      1
    )
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <SEO
        title="Wishlist | DigitalHood Marketplace"
        description="View your saved DigitalHood Marketplace products."
        path="/wishlist"
      />

      <Header />

      <main className="py-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            to="/shop"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>

          <section className="mb-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <Heart className="h-4 w-4" />
                  Saved products
                </p>

                <h1 className="font-display text-3xl font-bold leading-tight text-dh-primary sm:text-4xl">
                  Your wishlist
                </h1>

                <p className="mt-2 text-sm text-dh-dark-gray">
                  {wishlistItems.length === 0
                    ? 'Products you save will appear here.'
                    : `${wishlistItems.length} saved product${wishlistItems.length === 1 ? '' : 's'}.`}
                  {isSyncing ? ' Syncing...' : ''}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex overflow-hidden rounded-full border border-dh-light-gray">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex h-10 w-11 items-center justify-center transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-dh-primary text-white'
                        : 'bg-white text-dh-primary hover:bg-dh-gray'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`flex h-10 w-11 items-center justify-center transition-colors ${
                      viewMode === 'list'
                        ? 'bg-dh-primary text-white'
                        : 'bg-white text-dh-primary hover:bg-dh-gray'
                    }`}
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={openWishlistDrawer}
                  variant="outline"
                  className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                >
                  Open drawer
                </Button>
              </div>
            </div>
          </section>

          {wishlistItems.length === 0 ? (
            <section className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-dh-gray text-dh-primary">
                <Heart className="h-10 w-10" />
              </div>

              <h2 className="font-display text-2xl font-bold text-dh-primary">
                Your wishlist is empty
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
                Save products you like by tapping the heart icon.
              </p>

              <Link to="/shop">
                <Button className="mt-6 rounded-full bg-dh-primary px-6 text-white hover:bg-dh-secondary">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Start shopping
                </Button>
              </Link>
            </section>
          ) : viewMode === 'grid' ? (
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {wishlistItems.map((product) => {
                const directBuy = canBuyDirectly(product)

                return (
                  <article
                    key={String(product.id)}
                    className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:ring-dh-primary/20 hover:shadow-xl sm:rounded-3xl"
                  >
                    <div className="relative aspect-square bg-dh-gray">
                      <Link to={`/product/${getProductSlug(product)}`}>
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                        />
                      </Link>

                      <div className="absolute left-3 top-3">
                        <StockBadge item={product as any} />
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromWishlist(String(product.id))}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-sm transition hover:bg-red-500 hover:text-white"
                        aria-label={`Remove ${product.name} from wishlist`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-3 sm:p-4">
                      <Link to={`/product/${getProductSlug(product)}`}>
                        <h2 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-dh-primary transition hover:text-dh-secondary sm:min-h-[2.75rem] sm:text-base">
                          {product.name}
                        </h2>
                      </Link>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-dh-dark-gray">
                        <span className="inline-flex items-center gap-1 rounded-full bg-dh-gray px-2.5 py-1 font-semibold text-dh-primary">
                          <Star className="h-3.5 w-3.5 fill-[#ffb54a] text-[#ffb54a]" />
                          {getRatingText(product)}
                        </span>

                        {getSoldText(product) && (
                          <span className="rounded-full bg-dh-gray px-2.5 py-1 font-semibold text-dh-primary">
                            {getSoldText(product)}
                          </span>
                        )}

                        <StockBadge item={product as any} />
                      </div>

                      <p className="mt-3 font-display text-base font-bold text-dh-primary sm:text-xl">
                        {formatPrice(product.price)}
                      </p>

                      <div className="mt-4 grid gap-2">
                        {directBuy ? (
                          <Button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="w-full rounded-full bg-dh-primary text-xs text-white hover:bg-dh-secondary sm:text-sm"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Add to cart
                          </Button>
                        ) : (
                          <Link to={`/product/${getProductSlug(product)}`}>
                            <Button className="w-full rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                              Choose options
                            </Button>
                          </Link>
                        )}

                        <Link to={`/product/${getProductSlug(product)}`}>
                          <Button
                            variant="outline"
                            className="w-full rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                          >
                            View product
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          ) : (
            <section className="grid gap-4">
              {wishlistItems.map((product) => {
                const directBuy = canBuyDirectly(product)

                return (
                  <article
                    key={String(product.id)}
                    className="group overflow-hidden rounded-3xl bg-white shadow-sm transition-all hover:shadow-xl"
                  >
                    <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-0 sm:grid-cols-[180px_minmax(0,1fr)_240px]">
                      <Link
                        to={`/product/${getProductSlug(product)}`}
                        className="block aspect-square overflow-hidden bg-dh-gray sm:aspect-auto"
                      >
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                        />
                      </Link>

                      <div className="min-w-0 p-3 sm:p-5">
                        <div className="mb-3 flex flex-wrap gap-2">
                          <StockBadge item={product as any} />

                          <span className="inline-flex items-center gap-1 rounded-full bg-dh-gray px-3 py-1 text-xs font-bold text-dh-primary">
                            <Star className="h-3.5 w-3.5 fill-[#ffb54a] text-[#ffb54a]" />
                            {getRatingText(product)}
                          </span>

                          {getSoldText(product) && (
                            <span className="rounded-full bg-dh-secondary/15 px-3 py-1 text-xs font-bold text-dh-primary">
                              {getSoldText(product)}
                            </span>
                          )}
                        </div>

                        <Link to={`/product/${getProductSlug(product)}`}>
                          <h2 className="line-clamp-2 font-display text-base font-bold leading-snug text-dh-primary hover:text-dh-secondary sm:text-xl">
                            {product.name}
                          </h2>
                        </Link>

                        <p className="mt-2 text-sm text-dh-dark-gray">
                          Saved to your wishlist for quick access.
                        </p>
                      </div>

                      <div className="col-span-2 flex flex-col justify-center gap-3 bg-dh-gray p-4 sm:col-auto sm:p-5">
                        <p className="font-display text-xl font-bold text-dh-primary sm:text-2xl">
                          {formatPrice(product.price)}
                        </p>

                        {directBuy ? (
                          <Button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="rounded-full bg-dh-primary text-white hover:bg-dh-secondary"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Add to cart
                          </Button>
                        ) : (
                          <Link to={`/product/${getProductSlug(product)}`}>
                            <Button className="w-full rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                              Choose options
                            </Button>
                          </Link>
                        )}

                        <button
                          type="button"
                          onClick={() => removeFromWishlist(String(product.id))}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
