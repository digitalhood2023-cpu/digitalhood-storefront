import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2, X } from 'lucide-react'

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
  const {
    dismiss: dismissWishlistDrawer,
    dismissForNavigation: closeWishlistForNavigation,
  } = useBackButtonDismiss({
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

      <aside className="absolute right-0 top-0 flex h-full w-[94vw] max-w-[420px] flex-col bg-slate-50 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h2 className="font-display text-lg font-black text-dh-primary">
              Wishlist
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              {wishlistItems.length} saved {wishlistItems.length === 1 ? 'product' : 'products'}
            </p>
          </div>

          <button
            type="button"
            onClick={dismissWishlistDrawer}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-dh-primary transition hover:bg-dh-primary hover:text-white"
            aria-label="Close wishlist"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-dh-primary shadow-sm">
              <Heart className="h-7 w-7" />
            </div>

            <h3 className="font-display text-xl font-bold text-dh-primary">
              No saved products yet
            </h3>

            <p className="mt-2 text-sm text-dh-dark-gray">
              Tap the heart icon on products you like and they will appear here.
            </p>

            <Link
              to="/shop"
              onClick={closeWishlistForNavigation}
              className="mt-5 inline-flex h-10 items-center rounded-full bg-dh-primary px-5 text-sm font-bold text-white hover:bg-dh-secondary"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              {wishlistItems.slice(0, 20).map((product) => {
                const directBuy = canBuyDirectly(product)

                return (
                  <article
                    key={String(product.id)}
                    className="border-b border-slate-100 bg-white last:border-b-0"
                  >
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2.5 px-2.5 py-2.5">
                      <Link
                        to={`/product/${getProductSlug(product)}`}
                        onClick={closeWishlistForNavigation}
                        className="aspect-square overflow-hidden rounded-xl bg-slate-100"
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
                            onClick={closeWishlistForNavigation}
                          >
                            <h3 className="line-clamp-2 text-xs font-bold leading-snug text-dh-primary hover:text-dh-secondary">
                              {product.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeFromWishlist(String(product.id))}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${product.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="mt-1 font-display text-sm font-black text-dh-primary">
                          {formatPrice(product.price)}
                        </p>

                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Link
                            to={`/product/${getProductSlug(product)}`}
                            onClick={closeWishlistForNavigation}
                            className="inline-flex h-7 items-center justify-center rounded-full border border-slate-200 px-2.5 text-[10px] font-bold text-dh-primary hover:border-dh-primary hover:bg-dh-primary hover:text-white"
                          >
                            View
                          </Link>

                          {directBuy ? (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(product)}
                              className="inline-flex h-7 items-center justify-center rounded-full bg-dh-primary px-2.5 text-[10px] font-bold text-white hover:bg-dh-secondary"
                            >
                              <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                              Add
                            </button>
                          ) : (
                            <Link
                              to={`/product/${getProductSlug(product)}`}
                              onClick={closeWishlistForNavigation}
                              className="inline-flex h-7 items-center justify-center rounded-full bg-dh-primary px-2.5 text-[10px] font-bold text-white hover:bg-dh-secondary"
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
          <div className="border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              to="/wishlist"
              onClick={closeWishlistForNavigation}
              className="inline-flex h-10 w-full items-center justify-center rounded-full bg-dh-primary px-4 text-xs font-bold text-white hover:bg-dh-secondary"
            >
              View full wishlist
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
