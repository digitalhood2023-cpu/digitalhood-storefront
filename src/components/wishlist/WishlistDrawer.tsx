import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useBackButtonDismiss } from '@/hooks/useBackButtonDismiss'
import { useWishlist } from '@/context/WishlistContext'
import { useCartStore } from '@/store/cartStore'
import { getFastProductImage, getFastProductSrcSet, getProductImageSizes } from '@/lib/productImages'

type DrawerWishlistProduct = {
  id: string | number
  productId?: string | number
  variationId?: string | number
  name: string
  slug?: string
  price?: number | string
  regular_price?: number | string
  image?: string
  imageThumb?: string
  imageCard?: string
  imageMedium?: string
  imageLarge?: string
  imageOriginal?: string
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

function getProductImage(product: DrawerWishlistProduct) {
  return getFastProductImage(
    {
      image: product.image,
      imageThumb: product.imageThumb,
      imageCard: product.imageCard,
      imageMedium: product.imageMedium,
      imageLarge: product.imageLarge,
      imageOriginal: product.imageOriginal,
      images: product.images?.map((image) => image.src),
    },
    'card'
  )
}

function getProductSrcSet(product: DrawerWishlistProduct) {
  return getFastProductSrcSet({
    image: product.image,
    imageThumb: product.imageThumb,
    imageCard: product.imageCard,
    imageMedium: product.imageMedium,
    imageLarge: product.imageLarge,
    imageOriginal: product.imageOriginal,
    images: product.images?.map((image) => image.src),
  })
}

function getProductSlug(product: DrawerWishlistProduct) {
  return product.slug || String(product.id)
}

function canBuyDirectly(product: DrawerWishlistProduct) {
  if (product.hasOptions || product.type === 'variable') return false
  if (product.canAddToCart === false || product.can_add_to_cart === false) return false
  if (product.stockStatus === 'outofstock' || product.stock_status === 'outofstock') return false

  return true
}

export default function WishlistDrawer() {
  const {
    items,
    removeFromWishlist,
    isWishlistDrawerOpen,
    closeWishlistDrawer,
  } = useWishlist()

  const addItem = useCartStore((state) => state.addItem)
  const wishlistItems = items as unknown as DrawerWishlistProduct[]
  const dismissWishlistDrawer = useBackButtonDismiss({
    id: 'wishlist-drawer',
    isOpen: isWishlistDrawerOpen,
    onDismiss: closeWishlistDrawer,
  })

  const handleAddToCart = (product: DrawerWishlistProduct) => {
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

  if (!isWishlistDrawerOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close wishlist"
        onClick={dismissWishlistDrawer}
        className="absolute inset-0 bg-black/40"
      />

      <aside className="absolute right-0 top-0 flex h-full w-[90vw] max-w-md flex-col bg-dh-gray shadow-2xl">
        <div className="flex items-center justify-between border-b border-dh-light-gray bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
              Saved products
            </p>

            <h2 className="font-display text-2xl font-bold text-dh-primary">
              Wishlist
            </h2>
          </div>

          <button
            type="button"
            onClick={dismissWishlistDrawer}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-dh-gray text-dh-primary"
            aria-label="Close wishlist"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-dh-primary shadow-sm">
              <Heart className="h-8 w-8" />
            </div>

            <h3 className="font-display text-xl font-bold text-dh-primary">
              No saved products yet
            </h3>

            <p className="mt-2 text-sm text-dh-dark-gray">
              Tap the heart icon on products you like and they will appear here.
            </p>

            <Link to="/shop" onClick={dismissWishlistDrawer}>
              <Button className="mt-6 rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                Start shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
            <div className="grid gap-3">
              {wishlistItems.slice(0, 20).map((product) => {
                const directBuy = canBuyDirectly(product)

                return (
                  <article
                    key={String(product.id)}
                    className="overflow-hidden rounded-3xl bg-white shadow-sm"
                  >
                    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3">
                      <Link
                        to={`/product/${getProductSlug(product)}`}
                        onClick={dismissWishlistDrawer}
                        className="aspect-square overflow-hidden rounded-2xl bg-dh-gray"
                      >
                        <img
                          src={getProductImage(product)}
                          srcSet={getProductSrcSet(product)}
                          sizes={getProductImageSizes('card')}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                          fetchPriority="low"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={`/product/${getProductSlug(product)}`}
                            onClick={dismissWishlistDrawer}
                          >
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-dh-primary hover:text-dh-secondary">
                              {product.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeFromWishlist(String(product.id))}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dh-gray text-red-500 hover:bg-red-500 hover:text-white"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="mt-2 font-display text-base font-bold text-dh-primary">
                          {formatPrice(product.price)}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <Link
                            to={`/product/${getProductSlug(product)}`}
                            onClick={dismissWishlistDrawer}
                            className="inline-flex items-center justify-center rounded-full border border-dh-primary px-3 py-2 text-xs font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
                          >
                            View
                          </Link>

                          {directBuy ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="inline-flex items-center justify-center rounded-full bg-dh-primary px-3 py-2 text-xs font-semibold text-white hover:bg-dh-secondary"
                            >
                              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                              Add
                            </button>
                          ) : (
                            <Link
                              to={`/product/${getProductSlug(product)}`}
                              onClick={dismissWishlistDrawer}
                              className="inline-flex items-center justify-center rounded-full bg-dh-primary px-3 py-2 text-xs font-semibold text-white hover:bg-dh-secondary"
                            >
                              Options
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        )}

        {wishlistItems.length > 0 && (
          <div className="border-t border-dh-light-gray bg-white p-4">
            <Link to="/wishlist" onClick={dismissWishlistDrawer}>
              <Button className="w-full rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                View full wishlist
              </Button>
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
