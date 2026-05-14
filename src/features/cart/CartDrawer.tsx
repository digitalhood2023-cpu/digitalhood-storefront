import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, X } from 'lucide-react'

import { useCartStore } from '@/store/cartStore'

type CartDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const increaseQuantity = useCartStore((state) => state.increaseQuantity)
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()

  const formatPrice = (price: number) =>
    `K${Number(price || 0).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-bold">Your Cart</h2>

          <button
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
              <p className="text-gray-600">Your cart is empty.</p>

              <Link
                to="/shop"
                onClick={onClose}
                className="mt-4 inline-block rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-[#ffb54a] hover:text-black"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 border-b pb-4">
                  <img
                    src={item.image || '/logo.jpg'}
                    alt={item.name}
                    className="h-20 w-20 rounded-lg object-cover bg-gray-100"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-medium">
                        {item.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${item.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <p className="mt-1 text-sm font-semibold">
                      {formatPrice(item.price)}
                    </p>

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
                          className="flex h-8 w-8 items-center justify-center hover:bg-gray-100"
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
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t bg-white p-4">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-bold">{formatPrice(subtotal)}</span>
            </div>

            <Link
              to="/cart"
              onClick={onClose}
              className="block w-full rounded-lg border border-black py-3 text-center font-semibold hover:bg-gray-50"
            >
              View Cart
            </Link>

            <Link
              to="/checkout"
              onClick={onClose}
              className="mt-3 block w-full rounded-lg bg-black py-3 text-center font-semibold text-white hover:bg-[#ffb54a] hover:text-black"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}