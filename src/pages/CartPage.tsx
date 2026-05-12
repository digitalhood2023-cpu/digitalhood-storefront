import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Package,
  Truck,
  Shield,
} from 'lucide-react';

import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from '@/hooks/useCart';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import Header from '@/sections/Header';
import Footer from '@/sections/Footer';

import gsap from 'gsap';

export default function CartPage() {
  const { data: cart, isLoading } = useCart();

  const removeCartItem = useRemoveCartItem();
  const updateCartItem = useUpdateCartItem();

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const navigate = useNavigate();

  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.cart-content',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' }
      );
    }, pageRef);

    return () => ctx.revert();
  }, []);

  const handleApplyPromo = () => {
    if (promoCode.trim().toLowerCase() === 'digital10') {
      setPromoApplied(true);
    }
  };

  const subtotal =
    Number(cart?.totals?.total_price || 0) / 100;

  const discount = promoApplied ? subtotal * 0.1 : 0;

  const deliveryFee = subtotal >= 500 ? 0 : 50;

  const finalTotal = subtotal - discount + deliveryFee;

  const formatPrice = (price: number) =>
    `K${price.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="py-16">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64" />
              <div className="h-40 bg-gray-200 rounded-2xl" />
              <div className="h-40 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div ref={pageRef} className="min-h-screen bg-dh-gray">
        <Header />

        <main className="py-16">
          <div className="container mx-auto px-4">
            <div className="cart-content max-w-md mx-auto text-center">
              <div className="w-24 h-24 bg-dh-light-gray rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-dh-dark-gray" />
              </div>

              <h1 className="font-display font-bold text-2xl text-dh-primary mb-3">
                Your Cart is Empty
              </h1>

              <p className="text-dh-dark-gray mb-8">
                Looks like you haven't added anything to your cart yet.
              </p>

              <Link to="/shop">
                <Button className="bg-dh-primary hover:bg-dh-secondary text-white rounded-full px-8">
                  Start Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div ref={pageRef} className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-8">
        <div className="container mx-auto px-4">
          <h1 className="font-display font-bold text-2xl lg:text-3xl text-dh-primary mb-8">
            Shopping Cart ({cart.items_count} items)
          </h1>

          <div className="cart-content grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const itemPrice =
                  Number(item.prices?.price || 0) / 100;

                return (
                  <div
                    key={item.key}
                    className="bg-white rounded-2xl p-4 lg:p-6 flex gap-4 lg:gap-6"
                  >
                    <div className="shrink-0">
                      <img
                        src={
                          item.images?.[0]?.src ||
                          '/logo.jpg'
                        }
                        alt={item.name}
                        className="w-24 h-24 lg:w-32 lg:h-32 object-cover rounded-xl"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-dh-primary line-clamp-2 mb-2">
                        {item.name}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center border border-dh-light-gray rounded-lg">
                          <button
                            onClick={() =>
                              updateCartItem.mutate({
                                key: item.key,
                                quantity: Math.max(
                                  1,
                                  item.quantity - 1
                                ),
                              })
                            }
                            className="w-8 h-8 flex items-center justify-center hover:bg-dh-gray transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="w-10 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateCartItem.mutate({
                                key: item.key,
                                quantity: item.quantity + 1,
                              })
                            }
                            className="w-8 h-8 flex items-center justify-center hover:bg-dh-gray transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="font-display font-bold text-lg text-dh-primary">
                            {formatPrice(
                              itemPrice * item.quantity
                            )}
                          </p>

                          <p className="text-sm text-dh-text-gray">
                            {formatPrice(itemPrice)} each
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        removeCartItem.mutate(item.key)
                      }
                      className="shrink-0 w-10 h-10 flex items-center justify-center text-dh-dark-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="font-display font-semibold text-xl text-dh-primary mb-6">
                  Order Summary
                </h2>

                <div className="mb-6">
                  <label className="text-sm text-dh-dark-gray mb-2 block">
                    Promo Code
                  </label>

                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter code"
                      value={promoCode}
                      onChange={(e) =>
                        setPromoCode(e.target.value)
                      }
                      disabled={promoApplied}
                      className="rounded-lg"
                    />

                    <Button
                      onClick={handleApplyPromo}
                      disabled={promoApplied}
                      variant="outline"
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  </div>

                  {promoApplied && (
                    <p className="text-green-500 text-sm mt-2">
                      Promo code applied! You saved{' '}
                      {formatPrice(discount)}
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>

                  {promoApplied && (
                    <div className="flex justify-between text-green-500">
                      <span>Discount</span>
                      <span>-{formatPrice(discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Delivery</span>

                    <span>
                      {deliveryFee === 0
                        ? 'Free'
                        : formatPrice(deliveryFee)}
                    </span>
                  </div>

                  <div className="border-t border-dh-light-gray pt-3">
                    <div className="flex justify-between font-display font-bold text-lg text-dh-primary">
                      <span>Total</span>
                      <span>{formatPrice(finalTotal)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mb-4"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-dh-dark-gray">
                    <Truck className="w-4 h-4 text-dh-primary" />
                    <span>
                      Free delivery on orders over K500
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-dh-dark-gray">
                    <Shield className="w-4 h-4 text-dh-primary" />
                    <span>Secure checkout</span>
                  </div>

                  <div className="flex items-center gap-2 text-dh-dark-gray">
                    <Package className="w-4 h-4 text-dh-primary" />
                    <span>30-day return policy</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
