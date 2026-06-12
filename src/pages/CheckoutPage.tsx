import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import {
  AlertCircle,
  Check,
  ChevronLeft,
  Clock,
  CreditCard,
  Home,
  Edit3,
  Loader2,
  LogIn,
  MapPin,
  Plus,
  Save,
  Shield,
  ShoppingBag,
  Smartphone,
  Truck,
  UserRound,
  X,
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

import { useAccount } from '@/context/AccountContext'
import {
  addCustomerSavedAddress,
  getCustomerSavedAddresses,
  type SavedCustomerAddress,
} from '@/api/account'
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
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
  sellerAvatarUrl?: string
  sellerFeedbackText?: string
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

function getCheckoutStoreInfo(item: CheckoutCartItem) {
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
    avatarUrl: item.sellerAvatarUrl || (isDigitalHood ? '/logo.jpg' : ''),
    initials: getStoreInitials(storeName),
    feedbackText: item.sellerFeedbackText || (isDigitalHood ? '100% positive' : 'New seller'),
  }
}

function groupCheckoutItemsByStore(items: CheckoutCartItem[]) {
  const groups = new Map<
    string,
    ReturnType<typeof getCheckoutStoreInfo> & {
      items: CheckoutCartItem[]
      subtotal: number
    }
  >()

  for (const item of items) {
    const store = getCheckoutStoreInfo(item)
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

function splitFullName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return {
      firstName: '',
      lastName: '',
    }
  }

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

function getFullName(customer?: {
  firstName?: string
  lastName?: string
  email?: string
}) {
  if (!customer) return ''

  const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim()

  return fullName || customer.email || ''
}

function getPaymentMethodDisplay(method: 'mobile' | 'card' | 'cod') {
  if (method === 'mobile') return 'Mobile Money'
  if (method === 'card') return 'Card Payment'
  return 'Cash on Delivery'
}

function getAddressLine(address?: SavedCustomerAddress | null) {
  if (!address) return ''

  return [address.address1, address.address2, address.city, address.province]
    .filter(Boolean)
    .join(', ')
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const pageRef = useRef<HTMLDivElement>(null)
  const lencoPollingRef = useRef<number | null>(null)
  const hasPrefilledAccountRef = useRef(false)

  const {
    customer,
    isAuthenticated,
    isLoading: isAccountLoading,
  } = useAccount()

  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clearCart)
  const getSubtotal = useCartStore((state) => state.getSubtotal)

  const subtotal = getSubtotal()
  const checkoutItems = items as CheckoutCartItem[]
  const checkoutStoreGroups = groupCheckoutItemsByStore(checkoutItems)
  const hasUnavailableItems = checkoutItems.some(isUnavailable)

  const accountSavedAddresses = customer?.savedAddresses || []
  const [checkoutSavedAddresses, setCheckoutSavedAddresses] =
    useState<SavedCustomerAddress[]>([])
  const savedAddresses =
    checkoutSavedAddresses.length > 0 ? checkoutSavedAddresses : accountSavedAddresses

  const defaultSavedAddress = useMemo(() => {
    return (
      savedAddresses.find((address) => address.id === customer?.defaultAddressId) ||
      savedAddresses.find((address) => address.isDefault) ||
      savedAddresses[0] ||
      null
    )
  }, [customer?.defaultAddressId, savedAddresses])

  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState('')
  const [isAddressPickerOpen, setIsAddressPickerOpen] = useState(false)
  const [isAddingCheckoutAddress, setIsAddingCheckoutAddress] = useState(false)
  const [isSavingCheckoutAddress, setIsSavingCheckoutAddress] = useState(false)
  const [saveCheckoutAddressAsDefault, setSaveCheckoutAddressAsDefault] =
    useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | 'cod'>(
    'mobile'
  )

  const [orderComplete, setOrderComplete] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null)
  const [completedOrderTotal, setCompletedOrderTotal] = useState<number | null>(null)
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
    address2: '',
    city: 'Lusaka',
    province: 'Lusaka',
    postcode: DEFAULT_POSTCODE,
    paymentPhone: '',
  })

  const selectedSavedAddress = useMemo(() => {
    return (
      savedAddresses.find((address) => address.id === selectedSavedAddressId) ||
      defaultSavedAddress ||
      savedAddresses[0] ||
      null
    )
  }, [defaultSavedAddress, savedAddresses, selectedSavedAddressId])

  const showDeliveryFields =
    !isAuthenticated ||
    savedAddresses.length === 0 ||
    isAddingCheckoutAddress

  const shipping = getShippingDetails({
    subtotal,
    city: formData.city,
    province: formData.province,
  })

  const deliveryFee = shipping.fee
  const deliveryTitle = shipping.title
  const deliveryEstimate = shipping.estimate
  const finalTotal = subtotal + deliveryFee
  const successOrderTotal = completedOrderTotal ?? finalTotal

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

  async function refreshCheckoutSavedAddresses() {
    if (!isAuthenticated) return []

    const response = await getCustomerSavedAddresses()
    const addresses = response.addresses || []

    setCheckoutSavedAddresses(addresses)

    return addresses
  }

  const applySavedAddressToForm = (address: SavedCustomerAddress) => {
    setSelectedSavedAddressId(address.id)
    setIsAddressPickerOpen(false)
    setIsAddingCheckoutAddress(false)

    setFormData((current) => ({
      ...current,
      fullName: address.fullName || current.fullName,
      email: isAuthenticated ? customer?.email || current.email : current.email,
      phone: address.phone || current.phone,
      address: address.address1 || current.address,
      address2: address.address2 || current.address2,
      city: address.city || current.city || 'Lusaka',
      province: address.province || current.province || 'Lusaka',
      postcode: address.postcode || current.postcode || DEFAULT_POSTCODE,
      paymentPhone: current.paymentPhone || address.phone || current.phone,
    }))

    setCardClientSecret('')
    setCardPaymentIntentId('')
    setCreatedOrderId(null)
    setCompletedOrderTotal(null)
  }

  const openAddCheckoutAddress = () => {
    setCheckoutError('')
    setIsAddressPickerOpen(false)
    setIsAddingCheckoutAddress(true)
    setSelectedSavedAddressId('')
    setSaveCheckoutAddressAsDefault(savedAddresses.length === 0)

    setFormData((current) => ({
      ...current,
      fullName: current.fullName || getFullName(customer || undefined),
      email: isAuthenticated ? customer?.email || current.email : current.email,
      phone: current.phone || customer?.billing?.phone || '',
      address: '',
      address2: '',
      city: current.city || 'Lusaka',
      province: current.province || 'Lusaka',
      postcode: current.postcode || DEFAULT_POSTCODE,
    }))

    setCardClientSecret('')
    setCardPaymentIntentId('')
    setCreatedOrderId(null)
  }

  const cancelAddCheckoutAddress = () => {
    setIsAddingCheckoutAddress(false)
    setSaveCheckoutAddressAsDefault(false)

    if (selectedSavedAddress) {
      applySavedAddressToForm(selectedSavedAddress)
    }
  }

  const handleSaveCheckoutAddress = async () => {
    setCheckoutError('')

    if (!formData.fullName.trim()) {
      setCheckoutError('Full name is required.')
      return
    }

    if (!formData.phone.trim()) {
      setCheckoutError('Delivery contact number is required.')
      return
    }

    if (!formData.address.trim()) {
      setCheckoutError('Delivery address is required.')
      return
    }

    if (!formData.city.trim()) {
      setCheckoutError('City is required.')
      return
    }

    if (!formData.province.trim()) {
      setCheckoutError('Province is required.')
      return
    }

    setIsSavingCheckoutAddress(true)

    try {
      const response = await addCustomerSavedAddress({
        label: savedAddresses.length === 0 ? 'Default Address' : 'Checkout Address',
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address1: formData.address.trim(),
        address2: formData.address2.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        postcode: formData.postcode.trim() || DEFAULT_POSTCODE,
        country: 'ZM',
        isDefault: savedAddresses.length === 0 || saveCheckoutAddressAsDefault,
      })

      const addresses = response.addresses || []
      setCheckoutSavedAddresses(addresses)

      const newAddress =
        addresses[addresses.length - 1] ||
        addresses.find((address) => address.isDefault) ||
        addresses[0]

      if (newAddress) {
        applySavedAddressToForm(newAddress)
      }

      setSaveCheckoutAddressAsDefault(false)

      await refreshCheckoutSavedAddresses()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Unable to save this delivery address.'
      )
    } finally {
      setIsSavingCheckoutAddress(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !customer) {
      return
    }

    let mounted = true

    async function loadCheckoutAddresses() {
      try {
        const addresses = await refreshCheckoutSavedAddresses()

        if (!mounted) return

        const defaultAddress =
          addresses.find((address) => address.id === customer?.defaultAddressId) ||
          addresses.find((address) => address.isDefault) ||
          addresses[0]

        if (defaultAddress && !selectedSavedAddressId) {
          applySavedAddressToForm(defaultAddress)
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadCheckoutAddresses()

    return () => {
      mounted = false
    }
  }, [isAuthenticated, customer?.id])

  useEffect(() => {
    if (!isAuthenticated || !customer || hasPrefilledAccountRef.current) {
      return
    }

    hasPrefilledAccountRef.current = true

    const fullName = getFullName(customer)
    const legacyShipping = customer.shipping || {}
    const legacyBilling = customer.billing || {}

    if (defaultSavedAddress) {
      setSelectedSavedAddressId(defaultSavedAddress.id)
      setFormData((current) => ({
        ...current,
        fullName: current.fullName || defaultSavedAddress.fullName || fullName,
        email: customer.email || current.email,
        phone:
          current.phone ||
          defaultSavedAddress.phone ||
          legacyBilling.phone ||
          '',
        address:
          current.address ||
          defaultSavedAddress.address1 ||
          legacyShipping.address1 ||
          legacyBilling.address1 ||
          '',
        address2:
          current.address2 ||
          defaultSavedAddress.address2 ||
          legacyShipping.address2 ||
          legacyBilling.address2 ||
          '',
        city:
          current.city ||
          defaultSavedAddress.city ||
          legacyShipping.city ||
          legacyBilling.city ||
          'Lusaka',
        province:
          current.province ||
          defaultSavedAddress.province ||
          legacyShipping.province ||
          legacyBilling.province ||
          'Lusaka',
        postcode:
          current.postcode ||
          defaultSavedAddress.postcode ||
          legacyShipping.postcode ||
          legacyBilling.postcode ||
          DEFAULT_POSTCODE,
        paymentPhone:
          current.paymentPhone ||
          defaultSavedAddress.phone ||
          legacyBilling.phone ||
          '',
      }))

      return
    }

    setFormData((current) => ({
      ...current,
      fullName:
        current.fullName ||
        fullName ||
        `${legacyBilling.firstName || ''} ${legacyBilling.lastName || ''}`.trim(),
      email: customer.email || current.email,
      phone: current.phone || legacyBilling.phone || '',
      address:
        current.address ||
        legacyShipping.address1 ||
        legacyBilling.address1 ||
        '',
      address2:
        current.address2 ||
        legacyShipping.address2 ||
        legacyBilling.address2 ||
        '',
      city:
        current.city ||
        legacyShipping.city ||
        legacyBilling.city ||
        'Lusaka',
      province:
        current.province ||
        legacyShipping.province ||
        legacyBilling.province ||
        'Lusaka',
      postcode:
        current.postcode ||
        legacyShipping.postcode ||
        legacyBilling.postcode ||
        DEFAULT_POSTCODE,
      paymentPhone: current.paymentPhone || legacyBilling.phone || '',
    }))
  }, [customer, defaultSavedAddress, isAuthenticated])

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }))

    if (field !== 'paymentPhone') {
      setSelectedSavedAddressId('')
      setCardClientSecret('')
      setCardPaymentIntentId('')
      setCreatedOrderId(null)
      setCompletedOrderTotal(null)
    }
  }

  const validateCheckout = () => {
    if (items.length === 0) return 'Your cart is empty.'

    if (hasUnavailableItems) {
      return 'Some items in your cart are no longer available. Please go back to cart and remove or update them before checkout.'
    }

    if (!formData.fullName.trim()) return 'Full name is required.'

    if (!isAuthenticated && !formData.email.trim()) {
      return 'Email is required.'
    }

    if (isAuthenticated && !customer?.email) {
      return 'Your account email could not be loaded. Please sign in again.'
    }

    if (!formData.phone.trim()) return 'Contact phone number is required.'
    if (!formData.address.trim()) return 'Delivery address is required.'
    if (!formData.city.trim()) return 'City is required.'
    if (!formData.province.trim()) return 'Province is required.'

    if (paymentMethod === 'mobile' && !formData.paymentPhone.trim()) {
      return 'Mobile Money payment number is required.'
    }

    return ''
  }

  const getCheckoutEmail = () => {
    return isAuthenticated ? customer?.email || '' : formData.email.trim()
  }

  const buildAddressPayload = () => {
    const { firstName, lastName } = splitFullName(formData.fullName)

    return {
      first_name: firstName,
      last_name: lastName,
      company: '',
      address_1: formData.address.trim(),
      address_2: formData.address2.trim(),
      city: formData.city.trim(),
      state: formData.province.trim(),
      postcode: formData.postcode.trim() || DEFAULT_POSTCODE,
      country: 'ZM',
      email: getCheckoutEmail(),
      phone: formData.phone.trim(),
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

    if (isAuthenticated && customer?.id) {
      notes.push(`Customer account: ${customer.id}.`)
    }

    if (selectedSavedAddressId) {
      notes.push(`Saved address used: ${selectedSavedAddressId}.`)
    }

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
          setCompletedOrderTotal(finalTotal)
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
        customerEmail: getCheckoutEmail(),
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
      setCompletedOrderTotal(finalTotal)
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
          customerEmail: getCheckoutEmail(),
        })

        const paymentReference = response.reference || reference
        const paymentConfirmed = isLencoPaidStatus(response.status)

        setLencoReference(paymentReference)

        if (paymentConfirmed) {
          setSuccessState(getSuccessState('mobile-confirmed'))
          setOrderComplete(true)
          setCreatedOrderId(order.orderId)
          setCompletedOrderTotal(finalTotal)
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
      setCompletedOrderTotal(finalTotal)
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

        <main className="py-10 lg:py-16">
          <div className="mx-auto w-full max-w-[1500px] px-4 text-center sm:px-6 lg:px-8 xl:px-12">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
              <ShoppingBag className="h-10 w-10 text-dh-primary" />
            </div>

            <h1 className="mb-3 font-display text-3xl font-bold text-dh-primary">
              Your cart is empty
            </h1>

            <p className="text-dh-dark-gray mb-6">
              Add items to your cart before checkout.
            </p>

            <Button
              onClick={() => navigate('/cart')}
              className="rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
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

        <main className="py-10 lg:py-16">
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <div
                className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                  successState.confirmed
                    ? 'bg-green-100'
                    : 'bg-yellow-100'
                }`}
              >
                {successState.confirmed ? (
                  <Check className="h-10 w-10 text-green-500" />
                ) : (
                  <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
                )}
              </div>

              <h1 className="mb-3 font-display text-3xl font-bold text-dh-primary">
                {successState.title}
              </h1>

              <p className="mx-auto mb-4 max-w-xl text-dh-dark-gray">
                {successState.message}
              </p>

              <div className="mb-8 rounded-3xl bg-white p-5 text-left shadow-sm sm:p-6">
                <p className="text-sm text-dh-dark-gray mb-2">
                  Order Reference
                </p>

                <p className="mb-4 font-display text-xl font-bold text-dh-primary">
                  {orderNumber}
                </p>

                {lencoReference && (
                  <>
                    <p className="text-sm text-dh-dark-gray mb-2">
                      Payment Reference
                    </p>

                    <p className="mb-4 break-words font-display text-base font-bold text-dh-primary">
                      {lencoReference}
                    </p>
                  </>
                )}

                <p className="text-sm text-dh-dark-gray mb-2">
                  Order Total
                </p>

                <p className="font-display text-3xl font-bold text-dh-primary">
                  {formatPrice(successOrderTotal)}
                </p>

                <div className="mt-5 grid gap-3 text-left">
                  <div className="rounded-2xl bg-dh-gray p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                      Payment method
                    </p>

                    <p className="mt-1 font-semibold text-dh-primary">
                      {getPaymentMethodDisplay(paymentMethod)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-dh-gray p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                      Delivery method
                    </p>

                    <p className="mt-1 font-semibold text-dh-primary">
                      {deliveryTitle}
                    </p>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      {deliveryEstimate}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-dh-gray p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                      Delivery address
                    </p>

                    <p className="mt-1 font-semibold text-dh-primary">
                      {formData.fullName}
                    </p>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      {formData.phone}
                    </p>

                    <p className="mt-1 text-sm text-dh-dark-gray">
                      {[formData.address, formData.address2, formData.city, formData.province]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>

                {!successState.confirmed && (
                  <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50 p-4 text-left">
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

                <div className="mt-5 rounded-2xl bg-dh-gray p-4 text-left">
                  <p className="text-sm font-semibold text-dh-primary mb-1">
                    Next Step
                  </p>

                  <p className="text-sm text-dh-dark-gray">
                    {successState.nextStep}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                {isAuthenticated && createdOrderId && (
                  <Button
                    onClick={() => navigate(`/orders/${createdOrderId}`)}
                    className="rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
                  >
                    View Order
                  </Button>
                )}

                {isAuthenticated && !createdOrderId && (
                  <Button
                    onClick={() => navigate('/orders')}
                    className="rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
                  >
                    My Orders
                  </Button>
                )}

                <Button
                  onClick={() => navigate('/')}
                  variant={isAuthenticated ? 'outline' : 'default'}
                  className={
                    isAuthenticated
                      ? 'rounded-full px-8 border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white'
                      : 'bg-dh-primary hover:bg-dh-secondary text-white rounded-full px-8'
                  }
                >
                  Continue Shopping
                </Button>
              </div>
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

      <main className="pb-28 pt-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <button
            onClick={() => navigate('/cart')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cart
          </button>

          <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                <Shield className="h-4 w-4" />
                Secure checkout
              </p>

              <h1 className="font-display text-3xl font-bold leading-tight text-dh-primary sm:text-4xl">
                Checkout
              </h1>

              <p className="text-sm text-dh-dark-gray">
                Confirm delivery, choose payment, and place your order.
              </p>
            </div>
          </section>

          {!isAccountLoading && isAuthenticated && customer && (
            <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 p-4 text-green-800 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                    <UserRound className="h-5 w-5 text-green-700" />
                  </div>

                  <div>
                    <p className="font-semibold">
                      Checking out as {getFullName(customer)}
                    </p>

                    <p className="text-sm text-green-700">
                      Your account email is attached automatically and this order
                      will appear in your account.
                    </p>
                  </div>
                </div>

                <Link
                  to="/account"
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-800 hover:bg-green-100"
                >
                  Manage account
                </Link>
              </div>
            </div>
          )}

          {!isAccountLoading && !isAuthenticated && (
            <div className="mb-4 rounded-2xl border border-dh-light-gray bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dh-secondary/15">
                    <LogIn className="h-5 w-5 text-dh-primary" />
                  </div>

                  <div>
                    <p className="font-semibold text-dh-primary">
                      Sign in for faster checkout
                    </p>

                    <p className="text-sm text-dh-dark-gray">
                      Save orders to your account, reuse delivery addresses, and
                      track purchases easily.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    to="/login?redirect=/checkout"
                    className="inline-flex items-center justify-center rounded-full bg-dh-primary px-4 py-2 text-sm font-semibold text-white hover:bg-dh-secondary"
                  >
                    Sign in
                  </Link>

                  <Link
                    to="/register?redirect=/checkout"
                    className="inline-flex items-center justify-center rounded-full border border-dh-primary px-4 py-2 text-sm font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {checkoutError && (
            <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm whitespace-pre-wrap">{checkoutError}</p>
            </div>
          )}

          {hasUnavailableItems && (
            <div className="mb-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-dh-primary font-bold text-white">
                    1
                  </div>

                  <div>
                    <h2 className="font-display text-xl font-bold text-dh-primary">
                      Delivery Address
                    </h2>
                    <p className="text-sm text-dh-dark-gray">
                      Choose where your order should be delivered.
                    </p>
                  </div>
                </div>

                {isAuthenticated && selectedSavedAddress && !showDeliveryFields && (
                  <div className="rounded-2xl border border-dh-light-gray bg-dh-gray p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dh-secondary/20 text-dh-primary">
                          <MapPin className="h-6 w-6" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-display text-lg font-bold text-dh-primary">
                              {selectedSavedAddress.label || 'Delivery Address'}
                            </p>

                            {(selectedSavedAddress.isDefault ||
                              selectedSavedAddress.id === customer?.defaultAddressId) && (
                              <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                Default
                              </span>
                            )}
                          </div>

                          <p className="mt-1 font-semibold text-dh-primary">
                            {selectedSavedAddress.fullName}
                          </p>

                          <p className="mt-1 text-sm text-dh-dark-gray">
                            {selectedSavedAddress.phone}
                          </p>

                          <p className="mt-2 text-sm text-dh-dark-gray">
                            {getAddressLine(selectedSavedAddress)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {savedAddresses.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAddressPickerOpen((current) => !current)}
                            className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            Change
                          </Button>
                        )}

                        <Button
                          type="button"
                          onClick={openAddCheckoutAddress}
                          className="rounded-full bg-dh-primary text-white hover:bg-dh-secondary"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add new
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {isAuthenticated && isAddressPickerOpen && savedAddresses.length > 1 && (
                  <div className="mt-4 rounded-2xl border border-dh-light-gray bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-dh-primary">
                          Select delivery address
                        </p>
                        <p className="text-sm text-dh-dark-gray">
                          Pick the address you want to use for this order.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsAddressPickerOpen(false)}
                        className="rounded-full bg-dh-gray p-2 text-dh-primary hover:bg-red-50 hover:text-red-600"
                        aria-label="Close address selector"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {savedAddresses.map((address) => {
                        const selected = selectedSavedAddress?.id === address.id

                        return (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => applySavedAddressToForm(address)}
                            className={`rounded-2xl border p-4 text-left transition-all ${
                              selected
                                ? 'border-dh-primary bg-dh-secondary/10'
                                : 'border-dh-light-gray hover:border-dh-primary'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-dh-primary">
                                {address.label || 'Delivery Address'}
                              </p>

                              {selected && (
                                <span className="rounded-full bg-dh-primary px-3 py-1 text-xs font-semibold text-white">
                                  Selected
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-sm text-dh-dark-gray">
                              {address.fullName} · {address.phone}
                            </p>

                            <p className="mt-1 text-sm text-dh-dark-gray">
                              {getAddressLine(address)}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {isAuthenticated && savedAddresses.length === 0 && !isAddingCheckoutAddress && (
                  <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5 text-yellow-800">
                    <div className="flex gap-3">
                      <Home className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Add your first delivery address</p>
                        <p className="mt-1 text-sm">
                          Save a delivery address once and checkout faster next time.
                        </p>

                        <Button
                          type="button"
                          onClick={openAddCheckoutAddress}
                          className="mt-4 rounded-full bg-dh-primary text-white hover:bg-dh-secondary"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add delivery address
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {showDeliveryFields && (
                  <div className="mt-4 rounded-2xl border border-dh-light-gray bg-dh-gray p-4">
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-dh-primary">
                          {isAuthenticated ? 'New delivery address' : 'Delivery details'}
                        </p>
                        <p className="text-sm text-dh-dark-gray">
                          {isAuthenticated
                            ? 'Enter and save a new address for this order.'
                            : 'Enter your delivery information to complete checkout.'}
                        </p>
                      </div>

                      {isAuthenticated && savedAddresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={cancelAddCheckoutAddress}
                          className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                        >
                          Cancel
                        </Button>
                      )}
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
                          className="mt-1 bg-white"
                        />
                      </div>

                      {!isAuthenticated && (
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
                            className="mt-1 bg-white"
                          />
                        </div>
                      )}

                      {isAuthenticated && (
                        <div className="sm:col-span-2 rounded-xl bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                            Account email
                          </p>

                          <p className="mt-1 break-all font-semibold text-dh-primary">
                            {customer?.email}
                          </p>
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <Label htmlFor="phone">Delivery Contact Number</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(event) =>
                            updateField('phone', event.target.value)
                          }
                          placeholder="+260 97X XXX XXX"
                          className="mt-1 bg-white"
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
                          className="mt-1 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label htmlFor="address2">Apartment, landmark or extra directions</Label>
                        <Input
                          id="address2"
                          value={formData.address2}
                          onChange={(event) =>
                            updateField('address2', event.target.value)
                          }
                          placeholder="Apartment, suite, landmark"
                          className="mt-1 bg-white"
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
                          className="mt-1 bg-white"
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
                          className="mt-1 bg-white"
                        />
                      </div>
                    </div>



                    {isAuthenticated && (
                      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 text-sm text-dh-dark-gray">
                        <input
                          type="checkbox"
                          checked={saveCheckoutAddressAsDefault}
                          disabled={savedAddresses.length === 0}
                          onChange={(event) =>
                            setSaveCheckoutAddressAsDefault(event.target.checked)
                          }
                          className="mt-1 h-4 w-4 rounded border-dh-light-gray"
                        />

                        <span>
                          <span className="block font-semibold text-dh-primary">
                            Use this as my default delivery address
                          </span>
                          <span className="mt-1 block text-dh-dark-gray">
                            {savedAddresses.length === 0
                              ? 'Your first saved address will automatically become your default.'
                              : 'Default addresses appear automatically next time you checkout.'}
                          </span>
                        </span>
                      </label>
                    )}

                    {isAuthenticated && (
                      <Button
                        type="button"
                        onClick={handleSaveCheckoutAddress}
                        disabled={isSavingCheckoutAddress}
                        className="mt-5 rounded-full bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        {isSavingCheckoutAddress ? (
                          'Saving address...'
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save and use this address
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 p-4">
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
                      Shipping updates automatically based on your selected delivery address.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-dh-primary font-bold text-white">
                    2
                  </div>

                  <h2 className="font-display text-xl font-bold text-dh-primary">
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
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition-all ${
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
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition-all ${
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
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3.5 transition-all ${
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
                  <div className="mt-4 rounded-2xl border border-dh-light-gray bg-dh-gray p-4">
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
                        className="h-11 w-full rounded-full bg-dh-primary font-semibold text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Prepare Card Payment
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <aside>
              <div className="sticky top-24 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-5 font-display text-2xl font-bold text-dh-primary">
                  Order Summary
                </h2>

                <div className="mb-5 max-h-80 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {checkoutStoreGroups.map((group) => (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-dh-light-gray bg-white"
                    >
                      <Link
                        to={group.sellerUrl}
                        className="flex items-center justify-between gap-3 border-b border-dh-light-gray bg-dh-gray px-3 py-2.5 transition hover:bg-white"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-xs font-black text-dh-primary">
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
                            <span className="block truncate text-[11px] font-bold text-green-700">
                              {group.feedbackText}
                            </span>
                          </span>
                        </span>

                        <span className="shrink-0 text-xs font-black text-dh-primary">
                          {formatPrice(group.subtotal)}
                        </span>
                      </Link>

                      <div className="divide-y divide-dh-light-gray">
                        {group.items.map((item) => {
                          const unavailable = isUnavailable(item)
                          const variationText = getVariationText(item)

                          return (
                            <div
                              key={item.id}
                              className={`p-3 ${
                                unavailable ? 'bg-red-50/40' : 'bg-white'
                              }`}
                            >
                              <div className="flex gap-3">
                                <img
                                  src={item.image || '/logo.jpg'}
                                  alt={item.name}
                                  className="h-16 w-16 rounded-2xl bg-dh-gray object-cover"
                                  onError={(event) => {
                                    event.currentTarget.src = '/logo.jpg'
                                  }}
                                />

                                <div className="flex-1 min-w-0">
                                  <p className="line-clamp-2 text-sm font-semibold text-dh-primary">
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

                                    <p className="text-sm font-bold text-dh-primary">
                                      {formatPrice(item.price * item.quantity)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
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

                  <div className="flex justify-between border-t border-dh-light-gray pt-3 font-display text-xl font-bold text-dh-primary">
                    <span>Total</span>

                    <span>{formatPrice(finalTotal)}</span>
                  </div>
                </div>

                {hasUnavailableItems && (
                  <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    Remove unavailable items before checkout.
                  </div>
                )}

                {isAuthenticated && (
                  <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-3 text-sm text-green-700">
                    This order will be saved to your account.
                  </div>
                )}

                {paymentMethod !== 'card' && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || hasUnavailableItems}
                    className="mt-5 h-11 w-full rounded-full bg-dh-primary font-semibold text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {hasUnavailableItems
                      ? 'Checkout unavailable'
                      : isSubmitting
                        ? 'Creating Order...'
                        : `Place Order - ${formatPrice(finalTotal)}`}
                  </Button>
                )}

                {paymentMethod === 'card' && (
                  <p className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                    Prepare card payment, then enter your card details in the secure Stripe form.
                  </p>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-dh-dark-gray">
                  <Shield className="w-4 h-4" />

                  <span>Secure checkout</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {!orderComplete && items.length > 0 && paymentMethod !== 'card' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-dh-light-gray bg-white/95 p-3 shadow-2xl backdrop-blur lg:hidden">
          <div className="mx-auto flex w-full max-w-[1500px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-dh-dark-gray">
                Total
              </p>
              <p className="font-display text-lg font-bold text-dh-primary">
                {formatPrice(finalTotal)}
              </p>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || hasUnavailableItems}
              className="shrink-0 rounded-full bg-dh-primary px-5 font-semibold text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {hasUnavailableItems
                ? 'Unavailable'
                : isSubmitting
                  ? 'Creating...'
                  : 'Place order'}
            </Button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}