import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react'

import StockBadge from '@/components/StockBadge'
import { useBackButtonDismiss } from '@/hooks/useBackButtonDismiss'
import { useCartStore } from '@/store/cartStore'

type CartDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

type CartDrawerItem = {
  id: number
  productId?: number
  variationId?: number
  variationLabel?: string
  name: string
  slug?: string
  price: number
  regularPrice?: number
  image: string
  quantity: number
  stockStatus?: string
  stockQuantity?: number | null
  stockLabel?: string
  stockTone?: string
  canAddToCart?: boolean
}

function formatPrice(price: number) {
  return `K${Number(price || 0).toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function getCartItemStockObject(item: CartDrawerItem) {
  return {
    stockStatus: item.stockStatus,
    stock_status: item.stockStatus,
    stockQuantity: item.stockQuantity,
    stock_quantity: item.stockQuantity,
    stockLabel: item.stockLabel,
    stock_label: item.stockLabel,
    stockTone: item.stockTone,
    stock_tone: item.stockTone,
    canAddToCart: item.canAddToCart,
    can_add_to_cart: item.canAddToCart,
  }
}

function isUnavailable(item: CartDrawerItem) {
  if (item.canAddToCart === false) return true
  if (item.stockStatus === 'outofstock') return true

  if (
    item.stockQuantity !== null &&
    item.stockQuantity !== undefined &&
    item.stockQuantity <= 0
  ) {
    return true
  }

  return false
}

function getVariationText(item: CartDrawerItem) {
  if (item.variationLabel) return item.variationLabel
  if (!item.variationId) return ''

  return `Variation ID: ${item.variationId}`
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0)
  const hasUnavailableItems = items.some((item) =>
    isUnavailable(item as CartDrawerItem)
  )
  const dismissDrawer = useBackButtonDismiss({
    id: 'cart-drawer',
    isOpen,
    onDismiss: onClose,
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-black/40"
        onClick={dismissDrawer}
      />

      <aside className="absolute right-0 top-0 flex h-full w-[92vw] max-w-md flex-col bg-dh-gray shadow-2xl">
        <div className="border-b border-dh-light-gray bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                Shopping cart
              </p>

              <h2 className="font-display text-2xl font-bold text-dh-primary">
                Your cart
              </h2>

              {items.length > 0 && (
                <p className="mt-1 text-sm text-dh-dark-gray">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} ready for review
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={dismissDrawer}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-dh-gray text-dh-primary transition-colors hover:bg-dh-secondary/20"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">
          {items.length === 0 ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white text-dh-primary shadow-sm">
                <ShoppingBag className="h-10 w-10" />
              </div>

              <h3 className="font-display text-2xl font-bold text-dh-primary">
                Your cart is empty
              </h3>

              <p className="mx-auto mt-2 max-w-xs text-sm text-dh-dark-gray">
                Add products from the marketplace to start your order.
              </p>

              <Link
                to="/shop"
                onClick={onClose}
                className="mt-6 inline-flex rounded-full bg-dh-primary px-6 py-3 text-sm font-semibold text-white hover:bg-dh-secondary"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((rawItem) => {
                const item = rawItem as CartDrawerItem
                const unavailable = isUnavailable(item)
                const variationText = getVariationText(item)

                return (
                  <article
                    key={item.id}
                    className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ${
                      unavailable ? 'ring-red-200' : 'ring-transparent'
                    }`}
                  >
                    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3">
                      <Link
                        to={item.slug ? `/product/${item.slug}` : '/shop'}
                        onClick={onClose}
                        className="aspect-square overflow-hidden rounded-2xl bg-dh-gray"
                      >
                        <img
                          src={item.image || '/logo.jpg'}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                        />
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={item.slug ? `/product/${item.slug}` : '/shop'}
                            onClick={onClose}
                          >
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-dh-primary hover:text-dh-secondary">
                              {item.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dh-gray text-red-500 hover:bg-red-500 hover:text-white"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {variationText && (
                          <p className="mt-1 line-clamp-1 text-xs text-dh-dark-gray">
                            Selected: {variationText}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StockBadge item={getCartItemStockObject(item)} />

                          {unavailable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Review
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <p className="font-display text-base font-bold text-dh-primary">
                            {formatPrice(item.price)}
                          </p>

                          <div className="flex items-center overflow-hidden rounded-full border border-dh-light-gray">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item.id)}
                              className="flex h-8 w-8 items-center justify-center hover:bg-dh-gray"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="w-8 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => increaseQuantity(item.id)}
                              disabled={unavailable}
                              className={`flex h-8 w-8 items-center justify-center ${
                                unavailable
                                  ? 'cursor-not-allowed text-gray-300'
                                  : 'hover:bg-dh-gray'
                              }`}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-right text-xs font-semibold text-dh-dark-gray">
                          Total: {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>

                    {unavailable && (
                      <div className="border-t border-red-100 bg-red-50 p-3 text-xs text-red-700">
                        This item needs review before checkout.
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-dh-light-gray bg-white p-4">
            {hasUnavailableItems && (
              <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                Remove unavailable items before checkout.
              </div>
            )}

            <div className="mb-4 rounded-3xl bg-dh-gray p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-dh-dark-gray">
                  Subtotal
                </span>

                <span className="font-display text-2xl font-bold text-dh-primary">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="mt-3 flex items-start gap-2 text-xs text-dh-dark-gray">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <p>Delivery fee and payment method are confirmed at checkout.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/cart"
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-full border border-dh-primary px-4 py-3 text-sm font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
              >
                View cart
              </Link>

              {hasUnavailableItems ? (
                <button
                  type="button"
                  disabled
                  className="cursor-not-allowed rounded-full bg-gray-200 px-4 py-3 text-sm font-semibold text-gray-500"
                >
                  Checkout
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full bg-dh-primary px-4 py-3 text-sm font-semibold text-white hover:bg-dh-secondary"
                >
                  Checkout
                </Link>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
