import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
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
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
  sellerAvatarUrl?: string
  sellerFeedbackText?: string
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
  if (item.variationLabel) return item.variationLabel
  if (!item.variationId) return ''

  return `Variation ID: ${item.variationId}`
}

function getStoreInitials(storeName = '') {
  const words = String(storeName || 'DigitalHood')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'DH'
}

function getCartStoreInfo(item: CartPageItem) {
  const storeName = item.sellerStoreName || 'DigitalHood'
  const sellerKey =
    item.sellerKey ||
    (storeName.toLowerCase() === 'digitalhood' ? 'digitalhood' : '')
  const sellerUrl =
    item.sellerUrl ||
    (sellerKey ? `/seller/${encodeURIComponent(sellerKey)}` : '/seller/digitalhood')
  const isDigitalHood =
    sellerKey === 'digitalhood' ||
    storeName.toLowerCase() === 'digitalhood'

  return {
    key: sellerKey || storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    storeName,
    sellerUrl,
    verified: Boolean(item.sellerVerified || isDigitalHood),
    avatarUrl: item.sellerAvatarUrl || (isDigitalHood ? '/logo.jpg' : ''),
    initials: getStoreInitials(storeName),
    feedbackText: item.sellerFeedbackText || (isDigitalHood ? '100% positive' : 'New seller'),
  }
}

function groupCartItemsByStore(items: CartPageItem[]) {
  const groups = new Map<
    string,
    ReturnType<typeof getCartStoreInfo> & {
      items: CartPageItem[]
      subtotal: number
    }
  >()

  for (const item of items) {
    const store = getCartStoreInfo(item)
    const current =
      groups.get(store.key) ||
      {
        ...store,
        items: [],
        subtotal: 0,
      }

    current.items.push(item)
    current.subtotal += Number(item.price || 0) * Number(item.quantity || 1)
    groups.set(store.key, current)
  }

  return Array.from(groups.values())
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
  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0)
  const hasUnavailableItems = items.some((item) =>
    isUnavailable(item as CartPageItem)
  )
  const storeGroups = groupCartItemsByStore(items as CartPageItem[])

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

      <main className="py-4 lg:py-6">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <Link
            to="/shop"
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>

          <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <ShoppingBag className="h-4 w-4" />
                  Shopping cart
                </p>

                <h1 className="font-display text-2xl font-black leading-tight text-dh-primary sm:text-3xl">
                  Review your cart
                </h1>

                <p className="mt-2 text-sm text-dh-dark-gray">
                  {items.length === 0
                    ? 'Your selected products will appear here.'
                    : `${totalQuantity} ${totalQuantity === 1 ? 'item' : 'items'} in your cart.`}
                </p>
              </div>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex items-center justify-center rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear cart
                </button>
              )}
            </div>
          </section>

          {items.length === 0 ? (
            <section className="mx-auto max-w-xl rounded-3xl bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-dh-gray text-dh-primary">
                <ShoppingBag className="h-10 w-10" />
              </div>

              <h2 className="font-display text-xl font-black text-dh-primary">
                Your cart is empty
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-dh-dark-gray">
                Add products from DigitalHood Marketplace to get started.
              </p>

              <Button
                onClick={() => navigate('/shop')}
                className="mt-6 rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
              >
                Start shopping
              </Button>
            </section>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px]">
              <section className="grid gap-4">
                {hasUnavailableItems && (
                  <div className="rounded-3xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
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

                {storeGroups.map((group) => (
                  <div key={group.key} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-dh-light-gray/70">
                    <Link
                      to={group.sellerUrl}
                      className="flex items-center justify-between gap-3 border-b border-dh-light-gray bg-white px-3 py-2.5 transition hover:bg-dh-gray sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dh-gray text-[11px] font-black text-dh-primary">
                          {group.avatarUrl ? (
                            <img
                              src={group.avatarUrl}
                              alt={group.storeName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            group.initials
                          )}
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-dh-primary">
                            {group.storeName}
                          </span>
                          <span className="block truncate text-xs font-bold text-green-700">
                            {group.feedbackText}
                          </span>
                        </span>
                      </div>

                      <span className="shrink-0 rounded-full bg-dh-gray px-3 py-1 text-xs font-black text-dh-primary">
                        {formatPrice(group.subtotal)}
                      </span>
                    </Link>

                    <div className="grid gap-2.5 p-2.5 sm:p-3">
                      {group.items.map((rawItem) => {
                  const item = rawItem as CartPageItem
                  const unavailable = isUnavailable(item)
                  const variationText = getVariationText(item)

                  return (
                    <article
                      key={item.id}
                      className={`overflow-hidden rounded-xl bg-white ring-1 transition ${
                        unavailable ? 'ring-red-200' : 'ring-dh-light-gray/80'
                      }`}
                    >
                      <div className="grid gap-0 sm:grid-cols-[108px_minmax(0,1fr)_150px] xl:grid-cols-[116px_minmax(0,1fr)_160px]">
                        <Link
                          to={item.slug ? `/product/${item.slug}` : '/shop'}
                          className="block aspect-[4/3] overflow-hidden bg-dh-gray sm:aspect-square"
                        >
                          <img
                            src={item.image || '/logo.jpg'}
                            alt={item.name}
                            className="h-full w-full object-contain p-2"
                            onError={(event) => {
                              event.currentTarget.src = '/logo.jpg'
                            }}
                          />
                        </Link>

                        <div className="min-w-0 p-3 sm:p-3.5">
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            <StockBadge item={getCartItemStockObject(item)} />

                            {unavailable && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                <AlertTriangle className="h-3 w-3" />
                                Review item
                              </span>
                            )}
                          </div>

                          <Link to={item.slug ? `/product/${item.slug}` : '/shop'}>
                            <h2 className="line-clamp-2 font-display text-sm font-black leading-snug text-dh-primary hover:text-dh-secondary sm:text-base">
                              {item.name}
                            </h2>
                          </Link>

                          {variationText && (
                            <p className="mt-1.5 line-clamp-1 text-xs font-medium text-dh-dark-gray">
                              Selected: {variationText}
                            </p>
                          )}

                          <p className="mt-2 font-display text-base font-black text-dh-primary">
                            {formatPrice(item.price)}
                          </p>

                          {unavailable && (
                            <div className="mt-2 rounded-xl border border-red-100 bg-red-50 p-2 text-xs text-red-700">
                              This item is no longer available.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-row items-center justify-between gap-3 border-t border-dh-light-gray bg-dh-gray p-3 sm:flex-col sm:items-stretch sm:justify-center sm:border-l sm:border-t-0">
                          <div className="flex items-center gap-2 sm:block">
                            <p className="hidden text-[11px] font-black uppercase tracking-wide text-dh-dark-gray sm:mb-1.5 sm:block">
                              Qty
                            </p>

                            <div className="inline-flex items-center overflow-hidden rounded-full border border-dh-light-gray bg-white">
                              <button
                                type="button"
                                onClick={() => decreaseQuantity(item.id)}
                                className="flex h-8 w-8 items-center justify-center hover:bg-dh-gray"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>

                              <span className="w-8 text-center text-sm font-black">
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

                          <div className="text-right sm:text-left">
                            <p className="text-[11px] font-black uppercase tracking-wide text-dh-dark-gray">
                              Total
                            </p>
                            <p className="font-display text-base font-black text-dh-primary">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="inline-flex items-center justify-center rounded-full border border-red-200 px-3 py-2 text-xs font-black text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                      })}
                    </div>
                  </div>
                ))}
              </section>

              <aside>
                <div className="sticky top-24 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                  <h2 className="font-display text-xl font-black text-dh-primary">
                    Order summary
                  </h2>

                  <div className="mt-4 space-y-3 border-b border-dh-light-gray pb-4">
                    <div className="flex justify-between text-sm text-dh-dark-gray">
                      <span>Subtotal</span>
                      <span className="font-semibold text-dh-primary">
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm text-dh-dark-gray">
                      <span>Delivery</span>
                      <span className="text-right">Calculated at checkout</span>
                    </div>
                  </div>

                  <div className="font-display flex justify-between pt-4 text-lg font-black text-dh-primary">
                    <span>Total</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {hasUnavailableItems && (
                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                      Remove unavailable items before checkout.
                    </div>
                  )}

                  <Button
                    onClick={handleCheckout}
                    disabled={hasUnavailableItems}
                    className={`mt-5 h-11 w-full rounded-full font-semibold ${
                      hasUnavailableItems
                        ? 'cursor-not-allowed bg-gray-200 text-gray-500 hover:bg-gray-200'
                        : 'bg-dh-primary text-white hover:bg-dh-secondary'
                    }`}
                  >
                    {hasUnavailableItems
                      ? 'Checkout unavailable'
                      : 'Proceed to checkout'}
                  </Button>

                  <Link to="/shop">
                    <Button
                      variant="outline"
                      className="mt-3 h-11 w-full rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                    >
                      Continue shopping
                    </Button>
                  </Link>

                  <div className="mt-4 flex items-start gap-2 rounded-2xl bg-green-50 p-3 text-xs text-green-700">
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
