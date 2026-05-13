import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  Truck,
  Shield,
  Check,
  Smartphone,
} from 'lucide-react';

import { useCart } from '@/hooks/useCart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';

export default function CheckoutPage() {
  const { data: cart, isLoading } = useCart();

  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const pageRef = useRef<HTMLDivElement>(null);

  const items = cart?.items || [];
  const totalPrice = Number(cart?.totals?.total_price || 0) / 100;
  const deliveryFee = totalPrice >= 500 ? 0 : 50;
  const finalTotal = totalPrice + deliveryFee;

  useEffect(() => {
    if (!isLoading && items.length === 0 && !orderComplete) {
      navigate('/cart');
    }
  }, [isLoading, items.length, orderComplete, navigate]);

  const formatPrice = (price: number) =>
    `K${price.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setOrderComplete(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />
        <main className="py-16">
          <div className="container mx-auto px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-64" />
              <div className="h-64 bg-gray-200 rounded-2xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div ref={pageRef} className="min-h-screen bg-dh-gray">
        <Header />

        <main className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-12 h-12 text-green-500" />
              </div>

              <h1 className="font-display font-bold text-2xl text-dh-primary mb-3">
                Order Request Received
              </h1>

              <p className="text-dh-dark-gray mb-8">
                Thank you. Your order request has been captured. Payment processing will be connected next.
              </p>

              <div className="bg-white rounded-2xl p-6 mb-8">
                <p className="text-sm text-dh-dark-gray mb-2">Order Total</p>
                <p className="font-display font-bold text-2xl text-dh-primary">
                  {formatPrice(finalTotal)}
                </p>
              </div>

              <Button
                onClick={() => navigate('/')}
                className="bg-dh-primary hover:bg-dh-secondary text-white rounded-full px-8"
              >
                Continue Shopping
              </Button>
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
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2 text-dh-dark-gray hover:text-dh-primary transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cart
          </button>

          <h1 className="font-display font-bold text-2xl lg:text-3xl text-dh-primary mb-8">
            Checkout
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-dh-primary rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h2 className="font-display font-semibold text-xl">
                    Shipping Information
                  </h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="John" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Doe" className="mt-1" />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      placeholder="+260 97X XXX XXX"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Lusaka" className="mt-1" />
                  </div>

                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      placeholder="Lusaka Province"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-dh-primary rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h2 className="font-display font-semibold text-xl">
                    Payment Method
                  </h2>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-3"
                >
                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'card'
                        ? 'border-dh-primary bg-dh-primary/5'
                        : 'border-dh-light-gray'
                    }`}
                  >
                    <RadioGroupItem value="card" />
                    <CreditCard className="w-5 h-5 text-dh-primary" />
                    <div>
                      <p className="font-medium">Credit/Debit Card</p>
                      <p className="text-sm text-dh-dark-gray">
                        Visa, Mastercard
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'mobile'
                        ? 'border-dh-primary bg-dh-primary/5'
                        : 'border-dh-light-gray'
                    }`}
                  >
                    <RadioGroupItem value="mobile" />
                    <Smartphone className="w-5 h-5 text-dh-primary" />
                    <div>
                      <p className="font-medium">Mobile Money</p>
                      <p className="text-sm text-dh-dark-gray">
                        MTN, Airtel, Zamtel
                      </p>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-dh-primary bg-dh-primary/5'
                        : 'border-dh-light-gray'
                    }`}
                  >
                    <RadioGroupItem value="cod" />
                    <Truck className="w-5 h-5 text-dh-primary" />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-dh-dark-gray">
                        Pay when you receive
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="font-display font-semibold text-xl mb-6">
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                  {items.map((item) => {
                    const itemPrice = Number(item.prices?.price || 0) / 100;

                    return (
                      <div key={item.key} className="flex gap-4">
                        <img
                          src={item.images?.[0]?.src || '/logo.jpg'}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">
                            {item.name}
                          </p>
                          <p className="text-sm text-dh-dark-gray">
                            Qty: {item.quantity}
                          </p>
                        </div>

                        <p className="font-medium text-sm">
                          {formatPrice(itemPrice * item.quantity)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 border-t border-dh-light-gray pt-4">
                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>

                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Delivery</span>
                    <span>
                      {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
                    </span>
                  </div>

                  <div className="flex justify-between font-display font-bold text-lg text-dh-primary pt-3 border-t border-dh-light-gray">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6"
                >
                  {isProcessing ? 'Processing...' : `Place Order - ${formatPrice(finalTotal)}`}
                </Button>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-dh-dark-gray">
                  <Shield className="w-4 h-4" />
                  <span>Secure checkout</span>
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