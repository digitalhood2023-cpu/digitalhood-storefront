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
  ShoppingBag,
  Loader2,
} from 'lucide-react'

import {
  createDigitalHoodOrder,
  createStripePaymentIntent,
  verifyStripePayment,
} from '@/api/payments'

import {
  detectMobileMoneyOperator,
  initiateLencoMobileMoney,
  verifyLencoMobileMoney,
} from '@/api/lenco'

import { getShippingDetails } from '@/lib/shipping'
import { useCartStore } from '@/store/cartStore'

import StockBadge from '@/components/StockBadge'
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

type SuccessState = {
  title: string
  message: string
  nextStep: string
  confirmed?: boolean
}

type CheckoutCartItem = {
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
}

function getCartItemStockObject(item: CheckoutCartItem) {
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

function isUnavailable(item: CheckoutCartItem) {
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

function getVariationText(item: CheckoutCartItem) {
  if (item.variationLabel) return item.variationLabel
  if (!item.variationId) return ''

  return `Variation ID: ${item.variationId}`
}

function isLencoPaidStatus(status: unknown) {
  if (status === true) return true

  const normalizedStatus = String(status || '').toLowerCase()

  return [
    'true',
    'successful',
    'success',
    'succeeded',
    'completed',
    'complete',
    'paid',
    'approved',
    'processed',
    'confirmed',
    'collection.successful',
    'collection.success',
    'charge.success',
    'payment.success',
  ].includes(normalizedStatus)
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement>(null)
  const lencoPollingRef = useRef<number | null>(null)

  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()
  const checkoutItems = items as CheckoutCartItem[]
  const hasUnavailableItems = checkoutItems.some(isUnavailable)

  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | 'cod'>(
    'mobile'
  )

  const [orderComplete, setOrderComplete] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [cardClientSecret, setCardClientSecret] = useState('')
  const [cardPaymentIntentId, setCardPaymentIntentId] = useState('')
  const [isPreparingCard, setIsPreparingCard] = useState(false)

  const [isWaitingForLenco, setIsWaitingForLenco] = useState(false)
  const [lencoReference, setLencoReference] = useState('')
  const [lencoStatus, setLencoStatus] = useState('')

  const [successState, setSuccessState] = useState<SuccessState>({
    title: 'Order Created Successfully',
    message: 'Your order has been created.',
    nextStep: 'We will contact you shortly.',
    confirmed: false,
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

  const stopLencoPolling = () => {
    if (lencoPollingRef.current) {
      window.clearInterval(lencoPollingRef.current)
      lencoPollingRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopLencoPolling()
    }
  }, [])

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))

    if (field !== 'paymentPhone') {
      setCardClientSecret('')
      setCardPaymentIntentId('')
      setCreatedOrderId(null)
    }
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

    if (hasUnavailableItems) {
      return 'Some items in your cart are no longer available. Please go back to cart and remove or update them before checkout.'
    }

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

  const buildAddressPayload = () => {
    const { firstName, lastName } = splitFullName(formData.fullName)

    return {
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
    }
  }

  const buildLineItems = () => {
    return checkoutItems.map((item) => ({
      productId: Number(item.productId || item.id),
      variationId: item.variationId ? Number(item.variationId) : undefined,
      quantity: Number(item.quantity || 1),
    }))
  }

  const buildCustomerNote = () => {
    const variationLines = checkoutItems
      .map((item) => {
        const variationText = getVariationText(item)

        if (!variationText) return ''

        return `${item.name}: ${variationText}`
      })
      .filter(Boolean)

    const notes = [
      'Created from DigitalHood React storefront.',
      `Delivery: ${deliveryTitle} - ${deliveryEstimate}.`,
    ]

    if (variationLines.length > 0) {
      notes.push(`Selected options: ${variationLines.join(' | ')}`)
    }

    return notes.join('\n')
  }

  const createOrderThroughPaymentsApi = async (
    method: 'mobile' | 'cod' | 'card'
  ) => {
    const address = buildAddressPayload()

    const response = await createDigitalHoodOrder({
      paymentMethod: method,
      billing: address,
      shipping: address,
      lineItems: buildLineItems(),
      shippingLines: [
        {
          method_id: 'digitalhood_delivery',
          method_title: `${deliveryTitle} - ${deliveryEstimate}`,
          total: String(deliveryFee),
        },
      ],
      customerNote: buildCustomerNote(),
    })

    const orderId = response.order.id
    const orderRef = response.order.number || String(orderId)

    setCreatedOrderId(orderId)
    setOrderNumber(orderRef)

    return {
      orderId,
      orderRef,
    }
  }

  const getSuccessState = (method: string): SuccessState => {
    if (method === 'mobile') {
      return {
        title: 'Payment Request Sent',
        message:
          'Your order has been created and a Mobile Money payment request has been sent to your phone.',
        nextStep:
          'Approve the payment on your phone. This screen will update automatically once payment is confirmed.',
        confirmed: false,
      }
    }

    if (method === 'mobile-confirmed') {
      return {
        title: 'Payment Received Successfully',
        message:
          'Your Mobile Money payment has been confirmed and your order is now being processed.',
        nextStep:
          'Our team will process your order and contact you with delivery updates.',
        confirmed: true,
      }
    }

    if (method === 'card') {
      return {
        title: 'Card Payment Successful',
        message:
          'Your card payment has been confirmed and your order has been created successfully.',
        nextStep:
          'Our team will process your order and contact you with delivery updates.',
        confirmed: true,
      }
    }

    return {
      title: 'Order Placed Successfully',
      message:
        'Your Cash on Delivery order has been created successfully.',
      nextStep:
        'Our team will contact you to confirm delivery. You will pay when you receive your order.',
      confirmed: true,
    }
  }

  const pollLencoPayment = ({
    reference,
    orderId,
  }: {
    reference: string
    orderId: number
  }) => {
    stopLencoPolling()

    let attempts = 0
    const maxAttempts = 24

    setIsWaitingForLenco(true)
    setLencoStatus('Waiting for payment approval...')

    lencoPollingRef.current = window.setInterval(async () => {
      attempts += 1

      try {
        const result = await verifyLencoMobileMoney(reference)

        const paymentConfirmed =
          result.paid === true || isLencoPaidStatus(result.status)

        setLencoStatus(
          paymentConfirmed
            ? 'Payment confirmed successfully.'
            : result.status
              ? String(result.status)
              : 'Checking payment...'
        )

        if (paymentConfirmed) {
          stopLencoPolling()

          setIsWaitingForLenco(false)
          setSuccessState(getSuccessState('mobile-confirmed'))
          setOrderComplete(true)
          setCreatedOrderId(orderId)
          clearCart()

          return
        }

        if (attempts >= maxAttempts) {
          stopLencoPolling()
          setIsWaitingForLenco(false)
          setLencoStatus(
            'Payment has not been confirmed yet. If you approved payment, we will still reconcile it automatically.'
          )
        }
      } catch (error) {
        console.error(error)

        if (attempts >= maxAttempts) {
          stopLencoPolling()
          setIsWaitingForLenco(false)
          setLencoStatus(
            'We could not confirm payment automatically. If you approved payment, DigitalHood support will verify it.'
          )
        }
      }
    }, 5000)
  }

  const prepareCardPayment = async () => {
    setCheckoutError('')
    setCardClientSecret('')
    setCardPaymentIntentId('')

    const validationError = validateCheckout()

    if (validationError) {
      setCheckoutError(validationError)
      return
    }

    setIsPreparingCard(true)

    try {
      const order =
        createdOrderId && orderNumber
          ? { orderId: createdOrderId, orderRef: orderNumber }
          : await createOrderThroughPaymentsApi('card')

      const response = await createStripePaymentIntent({
        amount: finalTotal,
        currency: 'zmw',
        orderId: order.orderId,
        customerEmail: formData.email,
        customerName: formData.fullName,
      })

      setCardClientSecret(response.clientSecret)
      setCardPaymentIntentId(response.paymentIntentId)
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
    if (paymentMethod !== 'card') {
      setCardClientSecret('')
      setCardPaymentIntentId('')
      setCreatedOrderId(null)
    }
  }, [paymentMethod])

  const handleCardPaymentSuccess = async () => {
    setCheckoutError('')
    setIsSubmitting(true)

    try {
      const validationError = validateCheckout()

      if (validationError) {
        setCheckoutError(validationError)
        return
      }

      if (cardPaymentIntentId) {
        await verifyStripePayment(cardPaymentIntentId)
      }

      setSuccessState(getSuccessState('card'))
      setOrderComplete(true)
      clearCart()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Card payment was successful, but order verification failed. Please contact DigitalHood support.'
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
      const order = await createOrderThroughPaymentsApi(paymentMethod)

      if (paymentMethod === 'mobile') {
        const reference = `DH_ORDER_${order.orderId}`

        const response = await initiateLencoMobileMoney({
          amount: finalTotal,
          phone: formData.paymentPhone,
          operator: detectMobileMoneyOperator(formData.paymentPhone),
          reference,
          orderId: order.orderId,
          customerName: formData.fullName,
          customerEmail: formData.email,
        })

        const paymentReference = response.reference || reference
        const paymentConfirmed = isLencoPaidStatus(response.status)

        setLencoReference(paymentReference)

        if (paymentConfirmed) {
          setSuccessState(getSuccessState('mobile-confirmed'))
          setOrderComplete(true)
          setCreatedOrderId(order.orderId)
          clearCart()
          return
        }

        setSuccessState(getSuccessState('mobile'))
        setOrderComplete(true)

        pollLencoPayment({
          reference: paymentReference,
          orderId: order.orderId,
        })

        return
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
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white">
              <ShoppingBag className="h-10 w-10 text-dh-primary" />
            </div>

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
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  successState.confirmed
                    ? 'bg-green-100'
                    : 'bg-yellow-100'
                }`}
              >
                {successState.confirmed ? (
                  <Check className="w-12 h-12 text-green-500" />
                ) : (
                  <Loader2 className="w-12 h-12 text-yellow-600 animate-spin" />
                )}
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

                {lencoReference && (
                  <>
                    <p className="text-sm text-dh-dark-gray mb-2">
                      Payment Reference
                    </p>

                    <p className="font-display font-bold text-base text-dh-primary mb-4 break-words">
                      {lencoReference}
                    </p>
                  </>
                )}

                <p className="text-sm text-dh-dark-gray mb-2">
                  Order Total
                </p>

                <p className="font-display font-bold text-2xl text-dh-primary">
                  {formatPrice(finalTotal)}
                </p>

                <p className="mt-3 text-sm text-dh-dark-gray">
                  {deliveryTitle} · {deliveryEstimate}
                </p>

                {!successState.confirmed && (
                  <div className="mt-5 rounded-xl bg-yellow-50 border border-yellow-100 p-4 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      Payment Status
                    </p>

                    <p className="text-sm text-yellow-700">
                      {isWaitingForLenco
                        ? lencoStatus || 'Checking payment...'
                        : lencoStatus || 'Waiting for confirmation...'}
                    </p>
                  </div>
                )}

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

          {hasUnavailableItems && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 flex gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

              <div>
                <p className="font-semibold text-sm">
                  Some items need attention
                </p>

                <p className="text-sm">
                  Please return to cart and remove unavailable items before checkout.
                </p>
              </div>
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
                      Shipping updates automatically based on your city and province.
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
                  onValueChange={(value) =>
                    setPaymentMethod(value as 'mobile' | 'card' | 'cod')
                  }
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
                        Creating your secure order and preparing card payment...
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
                        disabled={hasUnavailableItems}
                        className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
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

                <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
                  {checkoutItems.map((item) => {
                    const unavailable = isUnavailable(item)
                    const variationText = getVariationText(item)

                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 ${
                          unavailable
                            ? 'border-red-200 bg-red-50/40'
                            : 'border-dh-light-gray bg-white'
                        }`}
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.image || '/logo.jpg'}
                            alt={item.name}
                            className="w-16 h-16 object-cover rounded-lg bg-dh-gray"
                            onError={(event) => {
                              event.currentTarget.src = '/logo.jpg'
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2">
                              {item.name}
                            </p>

                            {variationText && (
                              <p className="mt-1 text-xs text-dh-dark-gray">
                                Selected: {variationText}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <StockBadge item={getCartItemStockObject(item)} />

                              {unavailable && (
                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  Review
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-dh-dark-gray">
                                Qty: {item.quantity}
                              </p>

                              <p className="font-medium text-sm">
                                {formatPrice(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
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

                {hasUnavailableItems && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    Remove unavailable items before checkout.
                  </div>
                )}

                {paymentMethod !== 'card' && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || hasUnavailableItems}
                    className="w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold mt-6 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {hasUnavailableItems
                      ? 'Checkout unavailable'
                      : isSubmitting
                        ? 'Creating Order...'
                        : `Place Order - ${formatPrice(finalTotal)}`}
                  </Button>
                )}

                {paymentMethod === 'card' && (
                  <p className="mt-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
                    Prepare card payment, then enter your card details in the secure Stripe form.
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