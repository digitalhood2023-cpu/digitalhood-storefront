import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BadgeCheck,
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
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerAvatarUrl?: string
  sellerFeedbackText?: string
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

function getStoreInitials(storeName: string) {
  return storeName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'DH'
}

function groupCartItemsByStore(items: CartDrawerItem[]) {
  const groups = new Map<
    string,
    {
      key: string
      storeName: string
      sellerUrl: string
      avatarUrl: string
      verified: boolean
      feedbackText: string
      items: CartDrawerItem[]
      subtotal: number
    }
  >()

  for (const item of items) {
    const storeName = item.sellerStoreName || 'DigitalHood'
    const sellerKey =
      item.sellerKey ||
      (storeName.toLowerCase() === 'digitalhood' ? 'digitalhood' : '')
    const key = sellerKey || storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const isDigitalHood = key === 'digitalhood'
    const current = groups.get(key) || {
      key,
      storeName,
      sellerUrl:
        item.sellerUrl ||
        (sellerKey
          ? `/seller/${encodeURIComponent(sellerKey)}`
          : '/seller/digitalhood'),
      avatarUrl: item.sellerAvatarUrl || (isDigitalHood ? '/logo.jpg' : ''),
      verified: Boolean(item.sellerVerified || isDigitalHood),
      feedbackText:
        item.sellerFeedbackText || (isDigitalHood ? '100% positive' : 'New seller'),
      items: [],
      subtotal: 0,
    }

    current.items.push(item)
    current.subtotal += Number(item.price || 0) * Number(item.quantity || 1)
    groups.set(key, current)
  }

  return Array.from(groups.values())
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
  const storeGroups = useMemo(
    () => groupCartItemsByStore(items as CartDrawerItem[]),
    [items]
  )
  const { dismiss: dismissDrawer } = useBackButtonDismiss({
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

      <aside className="absolute right-0 top-0 flex h-full w-[94vw] max-w-[420px] flex-col bg-slate-50 shadow-2xl">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-black text-dh-primary">
                Your cart
              </h2>

              {items.length > 0 && (
                <p className="text-[11px] font-semibold text-slate-500">
                  {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} from {storeGroups.length}{' '}
                  {storeGroups.length === 1 ? 'seller' : 'sellers'}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={dismissDrawer}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-dh-primary transition-colors hover:bg-dh-primary hover:text-white"
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:thin]">
          {items.length === 0 ? (
            <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-dh-primary shadow-sm">
                <ShoppingBag className="h-7 w-7" />
              </div>

              <h3 className="font-display text-xl font-bold text-dh-primary">
                Your cart is empty
              </h3>

              <p className="mx-auto mt-2 max-w-xs text-sm text-dh-dark-gray">
                Add products from the marketplace to start your order.
              </p>

              <Link
                to="/shop"
                onClick={onClose}
                className="mt-5 inline-flex h-10 items-center rounded-full bg-dh-primary px-5 text-sm font-semibold text-white hover:bg-dh-secondary"
              >
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {storeGroups.map((group) => (
                <section
                  key={group.key}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-white px-2.5 py-2">
                    <Link
                      to={group.sellerUrl}
                      onClick={onClose}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-50 text-[9px] font-black text-dh-primary ring-1 ring-slate-200">
                        {group.avatarUrl ? (
                          <img
                            src={group.avatarUrl}
                            alt={group.storeName}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          getStoreInitials(group.storeName)
                        )}
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-center gap-1 truncate text-xs font-black text-dh-primary">
                          <span className="truncate">{group.storeName}</span>
                          {group.verified && (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
                          )}
                        </span>
                        <span className="block truncate text-[10px] font-semibold text-slate-500">
                          {group.feedbackText} · {group.items.length}{' '}
                          {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </span>
                    </Link>

                    <span className="shrink-0 text-xs font-black text-dh-primary">
                      {formatPrice(group.subtotal)}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
              {group.items.map((rawItem) => {
                const item = rawItem as CartDrawerItem
                const unavailable = isUnavailable(item)
                const variationText = getVariationText(item)

                return (
                  <article
                    key={item.id}
                    className={unavailable ? 'bg-red-50/40' : 'bg-white'}
                  >
                    <div className="grid grid-cols-[68px_minmax(0,1fr)] gap-2.5 px-2.5 py-2.5">
                      <Link
                        to={item.slug ? `/product/${item.slug}` : '/shop'}
                        onClick={onClose}
                        className="aspect-square overflow-hidden rounded-xl bg-slate-100"
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
                            <h3 className="line-clamp-2 text-xs font-bold leading-snug text-dh-primary hover:text-dh-secondary">
                              {item.name}
                            </h3>
                          </Link>

                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {variationText && (
                          <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-500">
                            {variationText}
                          </p>
                        )}

                        <div className="mt-1 flex min-h-5 flex-wrap items-center gap-1.5 text-[10px]">
                          <StockBadge item={getCartItemStockObject(item)} />

                          {unavailable && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              <AlertTriangle className="h-3 w-3" />
                              Review
                            </span>
                          )}
                        </div>

                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-display text-sm font-black text-dh-primary">
                              {formatPrice(item.price * item.quantity)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-[9px] font-semibold text-slate-400">
                                {formatPrice(item.price)} each
                              </p>
                            )}
                          </div>

                          <div className="flex items-center overflow-hidden rounded-full border border-slate-200 bg-white">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item.id)}
                              className="flex h-7 w-7 items-center justify-center hover:bg-slate-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>

                            <span className="w-6 text-center text-xs font-bold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => increaseQuantity(item.id)}
                              disabled={unavailable}
                              className={`flex h-7 w-7 items-center justify-center ${
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

                      </div>
                    </div>

                    {unavailable && (
                      <div className="border-t border-red-100 bg-red-50 px-2.5 py-1.5 text-[10px] font-semibold text-red-700">
                        This item needs review before checkout.
                      </div>
                    )}
                  </article>
                )
              })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {hasUnavailableItems && (
              <div className="mb-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                Remove unavailable items before checkout.
              </div>
            )}

            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Subtotal
                </span>
                <span className="font-display text-xl font-black text-dh-primary">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex max-w-[190px] items-start gap-1.5 text-[10px] font-medium leading-snug text-slate-500">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                <p>Delivery and payment are confirmed at checkout.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/cart"
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-full border border-dh-primary px-3 text-xs font-bold text-dh-primary hover:bg-dh-primary hover:text-white"
              >
                View cart
              </Link>

              {hasUnavailableItems ? (
                <button
                  type="button"
                  disabled
                  className="h-10 cursor-not-allowed rounded-full bg-gray-200 px-3 text-xs font-bold text-gray-500"
                >
                  Checkout
                </button>
              ) : (
                <Link
                  to="/checkout"
                  onClick={onClose}
                  className="inline-flex h-10 items-center justify-center rounded-full bg-dh-primary px-3 text-xs font-bold text-white hover:bg-dh-secondary"
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
