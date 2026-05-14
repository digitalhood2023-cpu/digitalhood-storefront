import { Link, useNavigate } from 'react-router-dom'
import {
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'

import { useCartStore } from '@/store/cartStore'

export default function CartPage() {
  const navigate = useNavigate()

  const items = useCartStore((state) => state.items)

  const removeItem = useCartStore(
    (state) => state.removeItem
  )

  const increaseQuantity = useCartStore(
    (state) => state.increaseQuantity
  )

  const decreaseQuantity = useCartStore(
    (state) => state.decreaseQuantity
  )

  const clearCart = useCartStore(
    (state) => state.clearCart
  )

  const getSubtotal = useCartStore(
    (state) => state.getSubtotal
  )

  const subtotal = getSubtotal()

  const formatPrice = (price: number) =>
    `K${Number(price || 0).toLocaleString(
      'en-ZM',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`

  const handleCheckout = () => {
    navigate('/checkout')
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display font-bold text-2xl lg:text-3xl text-dh-primary">
                Your Cart
              </h1>

              <p className="text-dh-dark-gray mt-1">
                Review your items before checkout.
              </p>
            </div>

            <Link
              to="/"
              className="text-sm font-medium text-dh-primary hover:text-dh-secondary"
            >
              Continue Shopping
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 lg:p-12 text-center max-w-xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-dh-gray flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-dh-primary" />
              </div>

              <h2 className="font-display font-bold text-xl text-dh-primary mb-3">
                Your cart is empty
              </h2>

              <p className="text-dh-dark-gray mb-6">
                Add products from DigitalHood Marketplace to get started.
              </p>

              <Button
                onClick={() => navigate('/')}
                className="bg-dh-primary hover:bg-dh-secondary text-white rounded-full px-8"
              >
                Start Shopping
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <article
                    key={item.id}
                    className="bg-white rounded-2xl p-4 sm:p-6 flex gap-4"
                  >
                    <img
                      src={item.image || '/logo.jpg'}
                      alt={item.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-dh-gray"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-4">
                        <div>
                          <h2 className="font-display font-semibold text-base sm:text-lg text-dh-primary line-clamp-2">
                            {item.name}
                          </h2>

                          <p className="text-sm text-dh-dark-gray mt-1">
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            removeItem(item.id)
                          }
                          className="w-9 h-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-6">
                        <div className="flex items-center border border-dh-light-gray rounded-full overflow-hidden">
                          <button
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                            className="w-9 h-9 flex items-center justify-center hover:bg-dh-gray"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="w-10 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                            className="w-9 h-9 flex items-center justify-center hover:bg-dh-gray"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="font-display font-bold text-dh-primary">
                          {formatPrice(
                            item.price * item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Clear Cart
                </button>
              </section>

              <aside className="lg:col-span-1">
                <div className="bg-white rounded-2xl p-6 sticky top-24">
                  <h2 className="font-display font-semibold text-xl mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-3 border-b border-dh-light-gray pb-4">
                    <div className="flex justify-between text-dh-dark-gray">
                      <span>Subtotal</span>

                      <span>
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between text-dh-dark-gray">
                      <span>Delivery</span>

                      <span>
                        Calculated at checkout
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between font-display font-bold text-lg text-dh-primary pt-4">
                    <span>Total</span>

                    <span>
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6"
                  >
                    Proceed to Checkout
                  </Button>

                  <p className="text-xs text-dh-dark-gray text-center mt-4">
                    Secure checkout powered by
                    DigitalHood Marketplace.
                  </p>
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