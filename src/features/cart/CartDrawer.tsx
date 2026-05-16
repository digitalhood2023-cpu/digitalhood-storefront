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
import { useCartStore } from '@/store/cartStore'

type CartDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

type CartDrawerItem = {
  id: number
  productId?: number
  variationId?: number
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
  if (item.stockQuantity !== null && item.stockQuantity !== undefined && item.stockQuantity <= 0) {
    return true
  }

  return false
}

function getVariationText(item: CartDrawerItem) {
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
  const hasUnavailableItems = items.some((item) => isUnavailable(item as CartDrawerItem))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-bold text-black">Your Cart</h2>
            {items.length > 0 && (
              <p className="text-xs text-gray-500">
                {items.length} {items.length === 1 ? 'item' : 'items'} ready for checkout
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ShoppingBag className="h-8 w-8 text-gray-400" />
              </div>

              <p className="font-semibold text-black">Your cart is empty.</p>

              <p className="mt-1 text-sm text-gray-500">
                Add products from the marketplace to start your order.
              </p>

              <Link
                to="/shop"
                onClick={onClose}
                className="mt-5 inline-block rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-[#ffb54a] hover:text-black"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((rawItem) => {
                const item = rawItem as CartDrawerItem
                const unavailable = isUnavailable(item)
                const variationText = getVariationText(item)

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-3 ${
                      unavailable
                        ? 'border-red-200 bg-red-50/40'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="flex gap-3">
                      <Link
                        to={item.slug ? `/product/${item.slug}` : '/shop'}
                        onClick={onClose}
                        className="shrink-0"
                      >
                        <img
                          src={item.image || '/logo.jpg'}
                          alt={item.name}
                          className="h-20 w-20 rounded-xl bg-gray-100 object-cover"
                          onError={(event) => {
                            event.currentTarget.src = '/logo.jpg'
                          }}
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to={item.slug ? `/product/${item.slug}` : '/shop'}
                            onClick={onClose}
                            className="min-w-0"
                          >
                            <h3 className="line-clamp-2 text-sm font-semibold text-black hover:text-[#ffb54a]">
                              {item.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {variationText && (
                          <p className="mt-1 text-xs text-gray-500">
                            {variationText}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StockBadge item={getCartItemStockObject(item)} />

                          {unavailable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Review item
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-bold text-black">
                            {formatPrice(item.price)}
                          </p>

                          <p className="text-xs font-semibold text-gray-500">
                            Total: {formatPrice(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {unavailable && (
                      <div className="mt-3 rounded-xl border border-red-100 bg-white p-3 text-xs text-red-700">
                        This item is no longer available in the selected option. Remove it or choose another option before checkout.
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center overflow-hidden rounded-full border border-gray-200">
                        <button
                          type="button"
                          onClick={() => decreaseQuantity(item.id)}
                          className="flex h-8 w-8 items-center justify-center hover:bg-gray-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>

                        <span className="w-9 text-center text-sm font-medium">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => increaseQuantity(item.id)}
                          disabled={unavailable}
                          className={`flex h-8 w-8 items-center justify-center ${
                            unavailable
                              ? 'cursor-not-allowed text-gray-300'
                              : 'hover:bg-gray-100'
                          }`}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t bg-white p-4">
            {hasUnavailableItems && (
              <div className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                Remove unavailable items before checkout.
              </div>
            )}

            <div className="mb-4 rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-bold text-black">{formatPrice(subtotal)}</span>
              </div>

              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Final delivery fee and payment method are confirmed at checkout.
              </div>
            </div>

            <Link
              to="/cart"
              onClick={onClose}
              className="block w-full rounded-lg border border-black py-3 text-center font-semibold hover:bg-gray-50"
            >
              View Cart
            </Link>

            {hasUnavailableItems ? (
              <button
                type="button"
                disabled
                className="mt-3 block w-full cursor-not-allowed rounded-lg bg-gray-200 py-3 text-center font-semibold text-gray-500"
              >
                Checkout unavailable
              </button>
            ) : (
              <Link
                to="/checkout"
                onClick={onClose}
                className="mt-3 block w-full rounded-lg bg-black py-3 text-center font-semibold text-white hover:bg-[#ffb54a] hover:text-black"
              >
                Checkout
              </Link>
            )}
          </div>
        )}
      </aside>
    </div>
  )
}