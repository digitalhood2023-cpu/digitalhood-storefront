import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  CreditCard, 
  Truck, 
  Shield,
  Check,
  Smartphone
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const deliveryFee = totalPrice >= 500 ? 0 : 50;
  const finalTotal = totalPrice + deliveryFee;

  const formatPrice = (price: number) => `K${price.toLocaleString()}`;

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    // Simulate order processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setOrderComplete(true);
    clearCart();
  };

  if (items.length === 0 && !orderComplete) {
    navigate('/cart');
    return null;
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
                Order Placed Successfully!
              </h1>
              <p className="text-dh-dark-gray mb-8">
                Thank you for your order. We'll send you a confirmation email shortly.
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
          {/* Back Button */}
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
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Information */}
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-dh-primary rounded-full flex items-center justify-center text-white font-bold">
                    1
                  </div>
                  <h2 className="font-display font-semibold text-xl">Shipping Information</h2>
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
                    <Input id="email" type="email" placeholder="john@example.com" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+260 97X XXX XXX" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Street Address</Label>
                    <Input id="address" placeholder="123 Main Street" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" placeholder="Lusaka" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Input id="province" placeholder="Lusaka Province" className="mt-1" />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-dh-primary rounded-full flex items-center justify-center text-white font-bold">
                    2
                  </div>
                  <h2 className="font-display font-semibold text-xl">Payment Method</h2>
                </div>

                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-dh-primary bg-dh-primary/5' : 'border-dh-light-gray'
                  }`}>
                    <RadioGroupItem value="card" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dh-primary/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-dh-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Credit/Debit Card</p>
                        <p className="text-sm text-dh-dark-gray">Visa, Mastercard</p>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'mobile' ? 'border-dh-primary bg-dh-primary/5' : 'border-dh-light-gray'
                  }`}>
                    <RadioGroupItem value="mobile" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dh-primary/10 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-dh-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Mobile Money</p>
                        <p className="text-sm text-dh-dark-gray">MTN, Airtel, Zamtel</p>
                      </div>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod' ? 'border-dh-primary bg-dh-primary/5' : 'border-dh-light-gray'
                  }`}>
                    <RadioGroupItem value="cod" />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dh-primary/10 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-dh-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-dh-dark-gray">Pay when you receive</p>
                      </div>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === 'card' && (
                  <div className="mt-4 grid gap-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input id="cardNumber" placeholder="1234 5678 9012 3456" className="mt-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input id="expiry" placeholder="MM/YY" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="cvv">CVV</Label>
                        <Input id="cvv" placeholder="123" className="mt-1" />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'mobile' && (
                  <div className="mt-4">
                    <Label htmlFor="mobileNumber">Mobile Money Number</Label>
                    <Input id="mobileNumber" placeholder="+260 97X XXX XXX" className="mt-1" />
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-6 sticky top-24">
                <h2 className="font-display font-semibold text-xl mb-6">Order Summary</h2>

                {/* Items */}
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex gap-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
                        <p className="text-sm text-dh-dark-gray">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-sm">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 border-t border-dh-light-gray pt-4">
                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Subtotal</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between font-display font-bold text-lg text-dh-primary pt-3 border-t border-dh-light-gray">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {/* Place Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                  className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    `Place Order - ${formatPrice(finalTotal)}`
                  )}
                </Button>

                {/* Security */}
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
