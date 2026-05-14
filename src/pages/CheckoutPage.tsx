import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  CreditCard,
  Truck,
  Shield,
  Check,
  Smartphone,
  AlertCircle,
} from 'lucide-react';

import { useCart, useSubmitCheckout } from '@/hooks/useCart';
import {
  detectMobileMoneyOperator,
  initiateLencoMobileMoney,
} from '@/api/lenco';
import {
  applyWooCommerceOrderShipping,
  markWooCommerceOrderPaid,
} from '@/api/woocommerceOrders';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Header from '@/sections/Header';
import Footer from '@/sections/Footer';

const paymentMethodMap: Record<string, string> = {
  card: 'stripe',
  mobile: 'lenco',
  cod: 'cod',
};

const DEFAULT_POSTCODE = '10101';

export default function CheckoutPage() {
  const { data: cart, isLoading } = useCart();
  const submitCheckout = useSubmitCheckout();

  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('mobile');
  const [orderComplete, setOrderComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Lusaka',
    province: 'Lusaka',
    paymentPhone: '',
  });

  const pageRef = useRef<HTMLDivElement>(null);

  const items = cart?.items || [];
  const totalPrice = Number(cart?.totals?.total_price || 0) / 100;

  const isLusaka =
    formData.city.trim().toLowerCase().includes('lusaka') ||
    formData.province.trim().toLowerCase().includes('lusaka');

  const isBeforeSameDayCutoff = new Date().getHours() < 16;

  const deliveryFee = totalPrice >= 499 ? 0 : isLusaka ? 30 : 50;

  const deliveryTitle =
    totalPrice >= 499
      ? 'Free Shipping'
      : isLusaka
        ? 'Lusaka Delivery'
        : 'Outside Lusaka Delivery';

  const deliveryEstimate =
    isLusaka && isBeforeSameDayCutoff
      ? 'Same-day delivery available'
      : isLusaka
        ? 'Next-day delivery'
        : '1–2 days delivery outside Lusaka';

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

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const splitFullName = (name: string) => {
    const parts = name.trim().split(/\s+/);

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: parts[0],
      };
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    };
  };

  const validateCheckout = () => {
    if (!formData.fullName.trim()) return 'Full name is required.';
    if (!formData.email.trim()) return 'Email is required.';
    if (!formData.phone.trim()) return 'Contact phone number is required.';
    if (!formData.address.trim()) return 'Delivery address is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.province.trim()) return 'Province is required.';

    if (paymentMethod === 'mobile' && !formData.paymentPhone.trim()) {
      return 'Mobile Money payment number is required.';
    }

    return '';
  };

  const handlePlaceOrder = async () => {
    setCheckoutError('');

    const validationError = validateCheckout();

    if (validationError) {
      setCheckoutError(validationError);
      return;
    }

    const { firstName, lastName } = splitFullName(formData.fullName);
    const paymentMethodId = paymentMethodMap[paymentMethod] || 'lenco';

    submitCheckout.mutate(
      {
        billing_address: {
          first_name: firstName,
          last_name: lastName,
          company: '',
          address_1: formData.address,
          address_2: '',
          city: formData.city,
          state: formData.province,
          postcode: DEFAULT_POSTCODE,
          country: 'ZM',
          email: formData.email,
          phone: formData.phone,
        },
        shipping_address: {
          first_name: firstName,
          last_name: lastName,
          company: '',
          address_1: formData.address,
          address_2: '',
          city: formData.city,
          state: formData.province,
          postcode: DEFAULT_POSTCODE,
          country: 'ZM',
          phone: formData.phone,
        },
        payment_method: paymentMethodId,
        payment_data: [
          {
            key: 'wc-' + paymentMethodId + '-payment-token',
            value: '',
          },
          {
            key: 'wc-' + paymentMethodId + '-new-payment-method',
            value: false,
          },
        ],
      },
      {
        onSuccess: async (response: any) => {
          const orderReference =
            response?.order_id?.toString() ||
            response?.order_key ||
            `DH_${Date.now()}`;

          setOrderNumber(orderReference);

          try {
            await applyWooCommerceOrderShipping({
              orderId: orderReference,
              shippingFee: deliveryFee,
              shippingTitle: `${deliveryTitle} - ${deliveryEstimate}`,
            });
          } catch (error) {
            setCheckoutError(
              error instanceof Error
                ? error.message
                : 'Order was created, but shipping could not be applied.'
            );
            return;
          }

          if (paymentMethod === 'mobile') {
            try {
              await initiateLencoMobileMoney({
                amount: finalTotal,
                phone: formData.paymentPhone,
                operator: detectMobileMoneyOperator(formData.paymentPhone),
                reference: `DH_ORDER_${orderReference}`,
              });

              await markWooCommerceOrderPaid(orderReference);
            } catch (error) {
              setCheckoutError(
                error instanceof Error
                  ? error.message
                  : 'Order was created, but mobile money payment could not be initiated.'
              );
              return;
            }
          }

          setOrderComplete(true);
        },
        onError: (error) => {
          setCheckoutError(
            error instanceof Error
              ? error.message
              : 'Checkout failed. Please try again.'
          );
        },
      }
    );
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
                Order Created Successfully
              </h1>

              <p className="text-dh-dark-gray mb-4">
                Your order has been created in WooCommerce.
              </p>

              <div className="bg-white rounded-2xl p-6 mb-8">
                <p className="text-sm text-dh-dark-gray mb-2">Order Reference</p>
                <p className="font-display font-bold text-xl text-dh-primary mb-4">
                  {orderNumber}
                </p>

                <p className="text-sm text-dh-dark-gray mb-2">Order Total</p>
                <p className="font-display font-bold text-2xl text-dh-primary">
                  {formatPrice(finalTotal)}
                </p>

                <p className="mt-3 text-sm text-dh-dark-gray">
                  {deliveryTitle} · {deliveryEstimate}
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

          {checkoutError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-wrap">{checkoutError}</p>
            </div>
          )}

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
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(event) =>
                        updateField('fullName', event.target.value)
                      }
                      placeholder="e.g. Caster Williams"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        updateField('email', event.target.value)
                      }
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="phone">Delivery Contact Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(event) =>
                        updateField('phone', event.target.value)
                      }
                      placeholder="+260 97X XXX XXX"
                      className="mt-1"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(event) =>
                        updateField('address', event.target.value)
                      }
                      placeholder="House number, road, area"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(event) =>
                        updateField('city', event.target.value)
                      }
                      placeholder="Lusaka"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="province">Province</Label>
                    <Input
                      id="province"
                      value={formData.province}
                      onChange={(event) =>
                        updateField('province', event.target.value)
                      }
                      placeholder="Lusaka"
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
                        Lenco / MTN / Airtel / Zamtel
                      </p>
                    </div>
                  </label>

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
                        Stripe / WooPayments
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

                {paymentMethod === 'mobile' && (
                  <div className="mt-6 rounded-xl border border-dh-light-gray bg-dh-gray/40 p-4">
                    <Label htmlFor="paymentPhone">
                      Mobile Money Payment Number
                    </Label>

                    <Input
                      id="paymentPhone"
                      value={formData.paymentPhone}
                      onChange={(event) =>
                        updateField('paymentPhone', event.target.value)
                      }
                      placeholder="e.g. 097XXXXXXX or +26097XXXXXXX"
                      className="mt-2"
                    />

                    <p className="mt-2 text-sm text-dh-dark-gray">
                      This number is only used for payment and can be different
                      from the delivery contact number.
                    </p>
                  </div>
                )}
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

                  <div>
                    <div className="flex justify-between text-dh-dark-gray">
                      <span>Delivery</span>
                      <span>
                        {deliveryFee === 0 ? 'Free' : formatPrice(deliveryFee)}
                      </span>
                    </div>

                    <p className="text-xs text-dh-dark-gray mt-1">
                      {deliveryTitle} · {deliveryEstimate}
                    </p>
                  </div>

                  <div className="flex justify-between font-display font-bold text-lg text-dh-primary pt-3 border-t border-dh-light-gray">
                    <span>Total</span>
                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={submitCheckout.isPending}
                  className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6"
                >
                  {submitCheckout.isPending
                    ? 'Creating Order...'
                    : `Place Order - ${formatPrice(finalTotal)}`}
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