import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import StockBadge from '@/components/StockBadge'
import { Button } from '@/components/ui/button'

import { useCartStore } from '@/store/cartStore'

type CartPageItem = {
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

function getCartItemStockObject(item: CartPageItem) {
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

function isUnavailable(item: CartPageItem) {
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

function getVariationText(item: CartPageItem) {
  if (!item.variationId) return ''

  return `Variation ID: ${item.variationId}`
}

export default function CartPage() {
  const navigate = useNavigate()

  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()
  const hasUnavailableItems = items.some((item) =>
    isUnavailable(item as CartPageItem)
  )

  const handleCheckout = () => {
    if (hasUnavailableItems) {
      alert('Please remove unavailable items before checkout.')
      return
    }

    navigate('/checkout')
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-dh-primary lg:text-3xl">
                Your Cart
              </h1>

              <p className="mt-1 text-dh-dark-gray">
                Review your items before checkout.
              </p>
            </div>

            <Link
              to="/shop"
              className="text-sm font-medium text-dh-primary hover:text-dh-secondary"
            >
              Continue Shopping
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center lg:p-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-dh-gray">
                <ShoppingBag className="h-10 w-10 text-dh-primary" />
              </div>

              <h2 className="font-display mb-3 text-xl font-bold text-dh-primary">
                Your cart is empty
              </h2>

              <p className="mb-6 text-dh-dark-gray">
                Add products from DigitalHood Marketplace to get started.
              </p>

              <Button
                onClick={() => navigate('/shop')}
                className="rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <section className="space-y-4 lg:col-span-2">
                {hasUnavailableItems && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">
                          Some cart items need attention
                        </p>
                        <p>
                          Remove unavailable items or select another option before checkout.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {items.map((rawItem) => {
                  const item = rawItem as CartPageItem
                  const unavailable = isUnavailable(item)
                  const variationText = getVariationText(item)

                  return (
                    <article
                      key={item.id}
                      className={`rounded-2xl border p-4 sm:p-6 ${
                        unavailable
                          ? 'border-red-200 bg-red-50/40'
                          : 'border-transparent bg-white'
                      }`}
                    >
                      <div className="flex gap-4">
                        <Link
                          to={item.slug ? `/product/${item.slug}` : '/shop'}
                          className="shrink-0"
                        >
                          <img
                            src={item.image || '/logo.jpg'}
                            alt={item.name}
                            className="h-24 w-24 rounded-xl bg-dh-gray object-cover sm:h-28 sm:w-28"
                            onError={(event) => {
                              event.currentTarget.src = '/logo.jpg'
                            }}
                          />
                        </Link>

                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between gap-4">
                            <div className="min-w-0">
                              <Link to={item.slug ? `/product/${item.slug}` : '/shop'}>
                                <h2 className="font-display line-clamp-2 text-base font-semibold text-dh-primary hover:text-dh-secondary sm:text-lg">
                                  {item.name}
                                </h2>
                              </Link>

                              {variationText && (
                                <p className="mt-1 text-sm text-dh-dark-gray">
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

                              <p className="mt-2 text-sm font-semibold text-dh-primary">
                                {formatPrice(item.price)}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {unavailable && (
                            <div className="mt-4 rounded-xl border border-red-100 bg-white p-3 text-xs text-red-700">
                              This item is no longer available in the selected option.
                              Remove it or choose another option before checkout.
                            </div>
                          )}

                          <div className="mt-6 flex items-center justify-between gap-4">
                            <div className="flex items-center overflow-hidden rounded-full border border-dh-light-gray">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item.id)}
                                className="flex h-9 w-9 items-center justify-center hover:bg-dh-gray"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-4 w-4" />
                              </button>

                              <span className="w-10 text-center font-medium">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() => increaseQuantity(item.id)}
                                disabled={unavailable}
                                className={`flex h-9 w-9 items-center justify-center ${
                                  unavailable
                                    ? 'cursor-not-allowed text-gray-300'
                                    : 'hover:bg-dh-gray'
                                }`}
                                aria-label="Increase quantity"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-dh-dark-gray">
                                Item total
                              </p>
                              <p className="font-display font-bold text-dh-primary">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}

                <button
                  type="button"
                  onClick={clearCart}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Clear Cart
                </button>
              </section>

              <aside className="lg:col-span-1">
                <div className="sticky top-24 rounded-2xl bg-white p-6">
                  <h2 className="font-display mb-6 text-xl font-semibold">
                    Order Summary
                  </h2>

                  <div className="space-y-3 border-b border-dh-light-gray pb-4">
                    <div className="flex justify-between text-dh-dark-gray">
                      <span>Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    <div className="flex justify-between gap-4 text-dh-dark-gray">
                      <span>Delivery</span>
                      <span className="text-right">Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="font-display flex justify-between pt-4 text-lg font-bold text-dh-primary">
                    <span>Total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {hasUnavailableItems && (
                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      Remove unavailable items before checkout.
                    </div>
                  )}

                  <Button
                    onClick={handleCheckout}
                    disabled={hasUnavailableItems}
                    className={`mt-6 h-12 w-full rounded-xl font-semibold ${
                      hasUnavailableItems
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                        : 'bg-dh-primary text-white hover:bg-dh-secondary'
                    }`}
                  >
                    {hasUnavailableItems
                      ? 'Checkout unavailable'
                      : 'Proceed to Checkout'}
                  </Button>

                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-700">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Secure checkout powered by DigitalHood Marketplace. Final
                      delivery fee and payment method are confirmed at checkout.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}