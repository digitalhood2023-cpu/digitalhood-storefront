import { Link } from 'react-router-dom'
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowLeft,
  ShoppingBag,
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
  const { items, removeFromWishlist } = useWishlist()
  const addItem = useCartStore((state) => state.addItem)

  const wishlistItems = items as unknown as WishlistProduct[]

  const handleAddToCart = (product: WishlistProduct) => {
    if (!canBuyDirectly(product)) {
      return
    }

    addItem(
      {
        id: Number(product.id),
        productId: Number(product.productId || product.id),
        variationId: product.variationId ? Number(product.variationId) : undefined,
        name: product.name,
        slug: product.slug,
        type: product.type,
        price: product.price,
        regular_price: product.regular_price || product.price,
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
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Wishlist"
        description="View your saved DigitalHood Marketplace products."
        path="/wishlist"
      />

      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="mb-8">
            <Link
              to="/shop"
              className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue shopping
            </Link>

            <div className="rounded-3xl bg-black p-6 text-white md:p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
                    <Heart className="h-4 w-4 text-[#ffb54a]" />
                    Saved products
                  </div>

                  <h1 className="font-display text-3xl font-bold md:text-4xl">
                    Your Wishlist
                  </h1>

                  <p className="mt-2 max-w-2xl text-white/70">
                    Keep track of products you like and come back when you are ready to buy.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-5 py-4 text-center">
                  <p className="text-3xl font-bold">{wishlistItems.length}</p>
                  <p className="text-sm text-white/70">
                    {wishlistItems.length === 1 ? 'item saved' : 'items saved'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {wishlistItems.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <Heart className="h-10 w-10 text-gray-400" />
              </div>

              <h2 className="mb-2 text-2xl font-bold text-black">
                Your wishlist is empty
              </h2>

              <p className="mx-auto mb-6 max-w-md text-gray-600">
                Save products you like by tapping the heart icon. They will appear here for quick access.
              </p>

              <Link to="/shop">
                <Button className="rounded-full bg-black px-6 text-white hover:bg-[#ffb54a] hover:text-black">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Start shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {wishlistItems.map((product) => {
                const directBuy = canBuyDirectly(product)

                return (
                  <div
                    key={String(product.id)}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="relative aspect-square bg-gray-100">
                      <Link to={`/product/${getProductSlug(product)}`}>
                        <img
                          src={getProductImage(product)}
                          alt={product.name}
                          className="h-full w-full object-cover"
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
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-500 shadow-sm transition hover:scale-105 hover:bg-red-500 hover:text-white"
                        aria-label={`Remove ${product.name} from wishlist`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4">
                      <Link to={`/product/${getProductSlug(product)}`}>
                        <h2 className="mb-2 line-clamp-2 font-semibold text-black transition hover:text-[#ffb54a]">
                          {product.name}
                        </h2>
                      </Link>

                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="font-display text-lg font-bold text-black">
                          {formatPrice(product.price)}
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Link to={`/product/${getProductSlug(product)}`}>
                          <Button
                            variant="outline"
                            className="w-full rounded-xl border-black text-black hover:bg-black hover:text-white"
                          >
                            View product
                          </Button>
                        </Link>

                        {directBuy ? (
                          <Button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            className="w-full rounded-xl bg-black text-white hover:bg-[#ffb54a] hover:text-black"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Add to Cart
                          </Button>
                        ) : (
                          <Link to={`/product/${getProductSlug(product)}`}>
                            <Button className="w-full rounded-xl bg-black text-white hover:bg-[#ffb54a] hover:text-black">
                              Choose options
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
