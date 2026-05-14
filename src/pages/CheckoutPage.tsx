import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import {
  ChevronLeft,
  CreditCard,
  Truck,
  Shield,
  Check,
  Smartphone,
  AlertCircle,
  Clock,
  MapPin,
} from 'lucide-react'

import { addCartItem, submitCheckout } from '@/api/cart'

import {
  detectMobileMoneyOperator,
  initiateLencoMobileMoney,
} from '@/api/lenco'

import {
  applyWooCommerceOrderShipping,
  markWooCommerceOrderPaid,
} from '@/api/woocommerceOrders'

import { getShippingDetails } from '@/lib/shipping'
import { useCartStore } from '@/store/cartStore'

import StripeCheckoutForm from '@/components/payments/StripeCheckoutForm'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const DEFAULT_POSTCODE = '10101'

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

const paymentMethodMap: Record<string, string> = {
  mobile: 'lenco',
  cod: 'cod',
}

type SuccessState = {
  title: string
  message: string
  nextStep: string
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement>(null)

  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()

  const [paymentMethod, setPaymentMethod] = useState('mobile')
  const [orderComplete, setOrderComplete] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [cardClientSecret, setCardClientSecret] = useState('')
  const [isPreparingCard, setIsPreparingCard] = useState(false)

  const [successState, setSuccessState] = useState<SuccessState>({
    title: 'Order Created Successfully',
    message: 'Your order has been created.',
    nextStep: 'We will contact you shortly.',
  })

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Lusaka',
    province: 'Lusaka',
    paymentPhone: '',
  })

  const shipping = getShippingDetails({
    subtotal,
    city: formData.city,
    province: formData.province,
  })

  const deliveryFee = shipping.fee
  const deliveryTitle = shipping.title
  const deliveryEstimate = shipping.estimate
  const finalTotal = subtotal + deliveryFee

  const formatPrice = (price: number) =>
    `K${Number(price || 0).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const splitFullName = (name: string) => {
    const parts = name.trim().split(/\s+/)

    if (parts.length === 1) {
      return {
        firstName: parts[0],
        lastName: parts[0],
      }
    }

    return {
      firstName: parts.slice(0, -1).join(' '),
      lastName: parts[parts.length - 1],
    }
  }

  const validateCheckout = () => {
    if (items.length === 0) return 'Your cart is empty.'
    if (!formData.fullName.trim()) return 'Full name is required.'
    if (!formData.email.trim()) return 'Email is required.'
    if (!formData.phone.trim()) return 'Contact phone number is required.'
    if (!formData.address.trim()) return 'Delivery address is required.'
    if (!formData.city.trim()) return 'City is required.'
    if (!formData.province.trim()) return 'Province is required.'

    if (paymentMethod === 'mobile' && !formData.paymentPhone.trim()) {
      return 'Mobile Money payment number is required.'
    }

    return ''
  }

  const syncZustandCartToWooCommerce = async () => {
    for (const item of items) {
      await addCartItem(
        Number(item.productId || item.id),
        item.quantity,
        item.variationId ? Number(item.variationId) : undefined
      )
    }
  }

  const createWooCommerceOrder = async (method: 'mobile' | 'cod' | 'card') => {
    await syncZustandCartToWooCommerce()

    const { firstName, lastName } = splitFullName(formData.fullName)

    const paymentMethodId =
      method === 'card'
        ? 'cod'
        : paymentMethodMap[method] || 'lenco'

    const response = await submitCheckout({
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
          key: `wc-${paymentMethodId}-payment-token`,
          value: '',
        },
        {
          key: `wc-${paymentMethodId}-new-payment-method`,
          value: false,
        },
      ],
    })

    const orderReference =
      response?.order_id?.toString() ||
      response?.order_key ||
      `DH_${Date.now()}`

    setOrderNumber(orderReference)

    await applyWooCommerceOrderShipping({
      orderId: orderReference,
      shippingFee: deliveryFee,
      shippingTitle: `${deliveryTitle} - ${deliveryEstimate}`,
    })

    return orderReference
  }

  const getSuccessState = (method: string): SuccessState => {
    if (method === 'mobile') {
      return {
        title: 'Payment Request Sent',
        message:
          'Your order has been created and a Mobile Money payment request has been sent to your phone.',
        nextStep:
          'Approve the payment on your phone to complete your order. We will confirm once payment is received.',
      }
    }

    if (method === 'card') {
      return {
        title: 'Card Payment Successful',
        message:
          'Your card payment has been confirmed and your order has been created successfully.',
        nextStep:
          'Our team will process your order and contact you with delivery updates.',
      }
    }

    return {
      title: 'Order Placed Successfully',
      message:
        'Your Cash on Delivery order has been created successfully.',
      nextStep:
        'Our team will contact you to confirm delivery. You will pay when you receive your order.',
    }
  }

  const prepareCardPayment = async () => {
    setCheckoutError('')
    setCardClientSecret('')

    const validationError = validateCheckout()

    if (validationError) {
      setCheckoutError(validationError)
      return
    }

    setIsPreparingCard(true)

    try {
      const response = await fetch(
        `${PAYMENTS_API_URL}/api/stripe/create-payment-intent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: finalTotal,
            currency: 'zmw',
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data?.clientSecret) {
        throw new Error(
          data?.error || 'Could not prepare card payment.'
        )
      }

      setCardClientSecret(data.clientSecret)
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Could not prepare card payment.'
      )
    } finally {
      setIsPreparingCard(false)
    }
  }

  useEffect(() => {
    if (paymentMethod === 'card' && finalTotal > 0) {
      prepareCardPayment()
    } else {
      setCardClientSecret('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, finalTotal])

  const handleCardPaymentSuccess = async () => {
    setCheckoutError('')
    setIsSubmitting(true)

    try {
      const orderReference = await createWooCommerceOrder('card')

      await markWooCommerceOrderPaid(orderReference)

      setSuccessState(getSuccessState('card'))
      setOrderComplete(true)
      clearCart()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Card payment was successful, but order creation failed. Please contact DigitalHood support.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlaceOrder = async () => {
    setCheckoutError('')

    const validationError = validateCheckout()

    if (validationError) {
      setCheckoutError(validationError)
      return
    }

    if (paymentMethod === 'card') {
      if (!cardClientSecret) {
        await prepareCardPayment()
      }

      return
    }

    setIsSubmitting(true)

    try {
      const orderReference = await createWooCommerceOrder(
        paymentMethod as 'mobile' | 'cod'
      )

      if (paymentMethod === 'mobile') {
        await initiateLencoMobileMoney({
          amount: finalTotal,
          phone: formData.paymentPhone,
          operator: detectMobileMoneyOperator(formData.paymentPhone),
          reference: `DH_ORDER_${orderReference}`,
        })
      }

      setSuccessState(getSuccessState(paymentMethod))
      setOrderComplete(true)
      clearCart()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Checkout failed. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="font-display font-bold text-2xl text-dh-primary mb-3">
              Your cart is empty
            </h1>

            <p className="text-dh-dark-gray mb-6">
              Add items to your cart before checkout.
            </p>

            <Button
              onClick={() => navigate('/cart')}
              className="bg-dh-primary hover:bg-dh-secondary text-white rounded-full px-8"
            >
              Go to Cart
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    )
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
                {successState.title}
              </h1>

              <p className="text-dh-dark-gray mb-4">
                {successState.message}
              </p>

              <div className="bg-white rounded-2xl p-6 mb-8">
                <p className="text-sm text-dh-dark-gray mb-2">
                  Order Reference
                </p>

                <p className="font-display font-bold text-xl text-dh-primary mb-4">
                  {orderNumber}
                </p>

                <p className="text-sm text-dh-dark-gray mb-2">
                  Order Total
                </p>

                <p className="font-display font-bold text-2xl text-dh-primary">
                  {formatPrice(finalTotal)}
                </p>

                <p className="mt-3 text-sm text-dh-dark-gray">
                  {deliveryTitle} · {deliveryEstimate}
                </p>

                <div className="mt-5 rounded-xl bg-dh-gray p-4 text-left">
                  <p className="text-sm font-semibold text-dh-primary mb-1">
                    Next Step
                  </p>

                  <p className="text-sm text-dh-dark-gray">
                    {successState.nextStep}
                  </p>
                </div>
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
    )
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

                <div className="mt-6 rounded-2xl bg-green-50 border border-green-100 p-4">
                  <div className="flex items-start gap-2">
                    <Truck className="w-5 h-5 text-green-700 mt-0.5" />

                    <div>
                      <p className="font-semibold text-green-800">
                        {deliveryTitle}
                      </p>

                      <p className="text-sm text-green-700">
                        {deliveryEstimate}
                      </p>
                    </div>
                  </div>

                  {shipping.isLusaka && (
                    <div className="flex items-start gap-2 mt-3">
                      <Clock className="w-4 h-4 text-green-700 mt-0.5" />
                      <p className="text-sm text-green-700">
                        {shipping.countdown}
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mt-3">
                    <MapPin className="w-4 h-4 text-green-700 mt-0.5" />
                    <p className="text-sm text-green-700">
                      Shipping updates automatically based on your city and
                      province.
                    </p>
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
                        Lenco / MTN / Airtel
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
                        Secure card payment with Stripe
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
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="mt-6">
                    {isPreparingCard && (
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                        Preparing secure card payment...
                      </div>
                    )}

                    {!isPreparingCard && cardClientSecret && (
                      <Elements
                        stripe={stripePromise}
                        options={{
                          clientSecret: cardClientSecret,
                          appearance: {
                            theme: 'stripe',
                          },
                        }}
                      >
                        <StripeCheckoutForm
                          amount={finalTotal}
                          onSuccess={handleCardPaymentSuccess}
                        />
                      </Elements>
                    )}

                    {!isPreparingCard && !cardClientSecret && (
                      <Button
                        type="button"
                        onClick={prepareCardPayment}
                        className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold"
                      >
                        Prepare Card Payment
                      </Button>
                    )}
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
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4">
                      <img
                        src={item.image || '/logo.jpg'}
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
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t border-dh-light-gray pt-4">
                  <div className="flex justify-between text-dh-dark-gray">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
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

                {paymentMethod !== 'card' && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6"
                  >
                    {isSubmitting
                      ? 'Creating Order...'
                      : `Place Order - ${formatPrice(finalTotal)}`}
                  </Button>
                )}

                {paymentMethod === 'card' && (
                  <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                    Enter card details in the secure Stripe form to complete
                    payment.
                  </p>
                )}

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
  )
}