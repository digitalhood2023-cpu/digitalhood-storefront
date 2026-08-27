import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

import {
  AlertCircle,
  ChevronLeft,
  CreditCard,
  Edit3,
  Loader2,
  MapPin,
  Plus,
  Save,
  Shield,
  ShoppingBag,
  Smartphone,
  Truck,
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
import CheckoutProgressOverlay, { type CheckoutProgressStage } from '@/components/checkout/CheckoutProgressOverlay'
import StripeCheckoutForm from '@/components/payments/StripeCheckoutForm'
import { acquireBodyScrollLock } from '@/lib/bodyScrollLock'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const DEFAULT_POSTCODE = '10101'

function createPaymentAttemptId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)

type SuccessState = {
  title: string
  message: string
  nextStep: string
  confirmed?: boolean
  failed?: boolean
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

type DeliveryLocationPin = {
  latitude: number
  longitude: number
  accuracy: number
  mapUrl: string
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

function getAddressLine(address?: SavedCustomerAddress | null) {
  if (!address) return ''

  return [address.address1, address.address2, address.city, address.province]
    .filter(Boolean)
    .join(', ')
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pageRef = useRef<HTMLDivElement>(null)
  const lencoPollingRef = useRef<number | null>(null)
  const checkoutSubmissionRef = useRef(false)
  const checkoutOrderAttemptRef = useRef(createPaymentAttemptId())
  const checkoutCreationAttemptedRef = useRef(false)
  const hasPrefilledAccountRef = useRef(false)

  const { customer, isAuthenticated } = useAccount()

  const items = useCartStore((state) => state.items)
  const removeItem = useCartStore((state) => state.removeItem)
  const selectedItemParam = searchParams.get('items') || ''
  const requestedItemIds = useMemo(
    () =>
      new Set(
        selectedItemParam
          .split(',')
          .map((itemId) => Number(itemId))
          .filter(Boolean)
      ),
    [selectedItemParam]
  )
  const checkoutItems = useMemo(
    () =>
      (items as CheckoutCartItem[]).filter(
        (item) =>
          requestedItemIds.size === 0 || requestedItemIds.has(Number(item.id))
      ),
    [items, requestedItemIds]
  )
  const subtotal = checkoutItems.reduce(
    (total, item) => total + Number(item.price || 0) * Number(item.quantity || 1),
    0
  )
  const checkoutStoreGroups = groupCheckoutItemsByStore(checkoutItems)
  const hasUnavailableItems = checkoutItems.some(isUnavailable)

  const removeCheckedOutItems = () => {
    for (const item of checkoutItems) {
      removeItem(Number(item.id))
    }
  }

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
  const [isLocatingAddress, setIsLocatingAddress] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationPin, setLocationPin] = useState<DeliveryLocationPin | null>(null)
  const [saveCheckoutAddressAsDefault, setSaveCheckoutAddressAsDefault] =
    useState(false)

  const [paymentMethod, setPaymentMethod] = useState<'mobile' | 'card' | 'cod'>(
    'mobile'
  )

  const [orderComplete, setOrderComplete] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null)
  const [createdRecoveryToken, setCreatedRecoveryToken] = useState('')
  const [completedOrderTotal, setCompletedOrderTotal] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutProgressStage, setCheckoutProgressStage] =
    useState<CheckoutProgressStage>('idle')
  const [checkoutProgressMessage, setCheckoutProgressMessage] = useState('')
  const [confirmedDeliveryLabel, setConfirmedDeliveryLabel] = useState('')

  const [cardClientSecret, setCardClientSecret] = useState('')
  const [cardPaymentIntentId, setCardPaymentIntentId] = useState('')
  const [isPreparingCard, setIsPreparingCard] = useState(false)

  const [lencoReference, setLencoReference] = useState('')

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

  const resetCheckoutOrderAttempt = () => {
    checkoutOrderAttemptRef.current = createPaymentAttemptId()
    checkoutCreationAttemptedRef.current = false
    setCreatedOrderId(null)
    setCreatedRecoveryToken('')
  }

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
  const checkoutAddressSummary = [
    formData.address,
    formData.address2,
    formData.city,
    formData.province,
  ].filter(Boolean).join(', ')

  const formatPrice = (price: number) =>
    `K${Number(price || 0).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`

  const stopLencoPolling = () => {
    if (lencoPollingRef.current) {
      window.clearTimeout(lencoPollingRef.current)
      lencoPollingRef.current = null
    }
  }

  const showConfirmedOrder = () => {
    setCheckoutProgressStage('confirmed')
    setCheckoutProgressMessage('Your order is securely confirmed and ready for fulfilment.')
    setIsSubmitting(false)
    setOrderComplete(true)
  }

  useEffect(() => {
    return () => {
      stopLencoPolling()
    }
  }, [])

  useEffect(() => {
    if (checkoutProgressStage === 'idle') return
    return acquireBodyScrollLock()
  }, [checkoutProgressStage])

  useEffect(() => {
    if (checkoutProgressStage === 'idle' || checkoutProgressStage === 'confirmed') return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [checkoutProgressStage])

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

    if (
      typeof address.latitude === 'number' &&
      typeof address.longitude === 'number' &&
      Number.isFinite(address.latitude) &&
      Number.isFinite(address.longitude)
    ) {
      const latitude = Number(address.latitude)
      const longitude = Number(address.longitude)

      setLocationPin({
        latitude,
        longitude,
        accuracy: Number(address.locationAccuracy || 0),
        mapUrl:
          address.mapUrl ||
          `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      })
    } else {
      setLocationPin(null)
    }

    setLocationError('')

    setCardClientSecret('')
    setCardPaymentIntentId('')
    resetCheckoutOrderAttempt()
    setCompletedOrderTotal(null)
  }

  const openAddCheckoutAddress = () => {
    setCheckoutError('')
    setIsAddressPickerOpen(false)
    setIsAddingCheckoutAddress(true)
    setSelectedSavedAddressId('')
    setSaveCheckoutAddressAsDefault(savedAddresses.length === 0)
    setLocationPin(null)
    setLocationError('')

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
    resetCheckoutOrderAttempt()
  }

  const cancelAddCheckoutAddress = () => {
    setIsAddingCheckoutAddress(false)
    setSaveCheckoutAddressAsDefault(false)

    if (selectedSavedAddress) {
      applySavedAddressToForm(selectedSavedAddress)
    }
  }

  const handleUseCurrentLocation = () => {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Current location is not supported by this browser.')
      return
    }

    setIsLocatingAddress(true)

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(6))
        const longitude = Number(coords.longitude.toFixed(6))
        const accuracy = Math.max(0, Math.round(coords.accuracy || 0))
        const coordinateText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`

        setLocationPin({ latitude, longitude, accuracy, mapUrl })
        setFormData((current) => ({
          ...current,
          address:
            !current.address.trim() || current.address.startsWith('Pinned GPS location:')
              ? `Pinned GPS location: ${coordinateText}`
              : current.address,
          address2: current.address2.includes('GPS pin:')
            ? current.address2
            : [
                current.address2.trim(),
                `GPS pin: ${coordinateText}${accuracy ? ` (accuracy ±${accuracy} m)` : ''}`,
              ]
                .filter(Boolean)
                .join(' · '),
        }))
        setSelectedSavedAddressId('')
        setCardClientSecret('')
        setCardPaymentIntentId('')
        resetCheckoutOrderAttempt()
        setCompletedOrderTotal(null)
        setIsLocatingAddress(false)
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? 'Location access was denied. Allow location access in your browser and try again.'
            : error.code === error.TIMEOUT
              ? 'Getting your precise location took too long. Move to an open area and try again.'
              : 'Your current location could not be determined. Please try again.'

        setLocationError(message)
        setIsLocatingAddress(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    )
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
        latitude: locationPin?.latitude ?? null,
        longitude: locationPin?.longitude ?? null,
        locationAccuracy: locationPin?.accuracy ?? null,
        mapUrl: locationPin?.mapUrl || '',
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
      resetCheckoutOrderAttempt()
      setCompletedOrderTotal(null)
    }
  }

  const validateCheckout = () => {
    if (checkoutItems.length === 0) return 'No checkout items were selected.'

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
      latitude: locationPin?.latitude ?? null,
      longitude: locationPin?.longitude ?? null,
      locationAccuracy: locationPin?.accuracy ?? null,
      mapUrl: locationPin?.mapUrl || '',
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
    const resumeCheckout = checkoutCreationAttemptedRef.current
    checkoutCreationAttemptedRef.current = true

    const response = await createDigitalHoodOrder({
      paymentMethod: method,
      clientCheckoutId: checkoutOrderAttemptRef.current,
      resumeCheckout,
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
    setCreatedRecoveryToken(response.order.recoveryAccess?.token || '')
    setOrderNumber(orderRef)
    setConfirmedDeliveryLabel(
      response.order.deliveryEstimate?.label || deliveryEstimate
    )

    return {
      orderId,
      orderRef,
      recoveryToken: response.order.recoveryAccess?.token || '',
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
    recoveryToken,
  }: {
    reference: string
    orderId: number
    recoveryToken: string
  }) => {
    stopLencoPolling()

    let attempts = 0
    // Poll local DigitalHood payment state for the five-minute provider
    // verification window. Provider reconciliation runs on the backend; this
    // loop never launches a second Mobile Money prompt.
    const maxAttempts = 60

    setCheckoutProgressStage('awaiting-approval')
    setCheckoutProgressMessage('Approve the secure request on your phone. We will confirm it here automatically.')

    const poll = async () => {
      attempts += 1

      try {
        const result = await verifyLencoMobileMoney(
          reference,
          orderId,
          recoveryToken
        )
        const paymentConfirmed = result.paid === true
        const paymentFailed =
          result.failed === true ||
          (result.terminal === true && !paymentConfirmed)

        if (paymentConfirmed) {
          stopLencoPolling()
          setCheckoutProgressStage('confirming')
          setCheckoutProgressMessage('Payment received. We are securely confirming your order now.')
          setSuccessState(getSuccessState('mobile-confirmed'))
          setCreatedOrderId(orderId)
          setCompletedOrderTotal(finalTotal)
          removeCheckedOutItems()
          showConfirmedOrder()
          return
        }

        if (paymentFailed) {
          const failureMessage =
            result.message ||
            'The Mobile Money payment was not completed. Check the number, balance and approval prompt, then try again.'

          stopLencoPolling()
          setIsSubmitting(false)
          setCheckoutProgressStage('failed')
          setSuccessState({
            title: 'Payment Not Completed',
            message: failureMessage,
            nextStep:
              'Open your order to retry securely. DigitalHood will not ask for your Mobile Money PIN.',
            confirmed: false,
            failed: true,
          })
          setOrderComplete(true)
          setCreatedOrderId(orderId)
          setCompletedOrderTotal(finalTotal)
          return
        }

        setCheckoutProgressMessage(
          result.message || 'Your request is still active. Approve it on your phone and we will confirm it automatically.'
        )
      } catch (error) {
        console.error(error)
        setCheckoutProgressMessage(
          'Your connection changed while Mobile Money was open. We are still checking the same payment securely.'
        )
      }

      if (attempts >= maxAttempts) {
        stopLencoPolling()
        setIsSubmitting(false)
        setCheckoutProgressStage('delayed')
        setSuccessState({
          title: 'Payment Confirmation Delayed',
          message:
            'The five-minute confirmation window ended without a final provider result. Your order is still reserved and DigitalHood will keep checking it securely in the background.',
          nextStep:
            'If money was deducted, do not pay again. Open the same order to view its payment state or contact support with the payment reference.',
          confirmed: false,
          failed: false,
        })
        setOrderComplete(true)
        return
      }

      lencoPollingRef.current = window.setTimeout(poll, 5000)
    }

    lencoPollingRef.current = window.setTimeout(poll, 2500)
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
    setCheckoutProgressStage('creating')
    setCheckoutProgressMessage('Creating your secure order before the card form opens…')

    try {
      const order =
        createdOrderId && orderNumber
          ? {
              orderId: createdOrderId,
              orderRef: orderNumber,
              recoveryToken: createdRecoveryToken,
            }
          : await createOrderThroughPaymentsApi('card')

      const response = await createStripePaymentIntent({
        amount: finalTotal,
        currency: 'zmw',
        orderId: order.orderId,
        customerEmail: getCheckoutEmail(),
        customerName: formData.fullName,
        recoveryToken: order.recoveryToken,
        clientAttemptId: createPaymentAttemptId(),
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
      setCheckoutProgressStage('idle')
    }
  }

  const changePaymentMethod = (value: 'mobile' | 'card' | 'cod') => {
    setPaymentMethod(value)
    if (value !== 'card') {
      setCardClientSecret('')
      setCardPaymentIntentId('')
      resetCheckoutOrderAttempt()
    }
  }

  useEffect(() => {
    if (!orderComplete && !checkoutError) return

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
      pageRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }, [orderComplete, checkoutError])

  const handleCardPaymentProcessing = () => {
    setCheckoutError('')
    setIsSubmitting(true)
    setCheckoutProgressStage('confirming')
    setCheckoutProgressMessage('Processing your card payment securely. Please wait while we confirm the result.')
  }

  const handleCardPaymentFailure = (message: string) => {
    setIsSubmitting(false)
    setSuccessState({
      title: 'Card Payment Not Completed',
      message,
      nextStep:
        'Check your card details and try again. If your bank shows a charge, do not pay again—open the order or contact support.',
      confirmed: false,
      failed: true,
    })
    setOrderComplete(true)
    setCheckoutProgressStage('failed')
  }

  const handleCardPaymentSuccess = async () => {
    setCheckoutError('')
    setIsSubmitting(true)
    setCheckoutProgressStage('confirming')
    setCheckoutProgressMessage('Payment received. We are securely confirming your order now.')

    try {
      const validationError = validateCheckout()

      if (validationError) {
        setCheckoutError(validationError)
        setCheckoutProgressStage('idle')
        return
      }

      if (cardPaymentIntentId) {
        const verification = await verifyStripePayment(
          cardPaymentIntentId,
          createdRecoveryToken
        )
        if (!verification.success) {
          throw new Error(
            'The card provider has not confirmed this payment yet. DigitalHood will keep checking it safely.'
          )
        }
      }

      setSuccessState(getSuccessState('card'))
      setCompletedOrderTotal(finalTotal)
      removeCheckedOutItems()
      showConfirmedOrder()
    } catch (error) {
      const failureMessage =
        error instanceof Error
          ? error.message
          : 'Card payment was successful, but order verification failed. Please contact DigitalHood support.'
      setCheckoutError(failureMessage)
      setSuccessState({
        title: 'Card Confirmation Needs Attention',
        message: failureMessage,
        nextStep:
          'Do not submit another payment if your card was charged. Open the order or contact support so we can confirm it safely.',
        confirmed: false,
        failed: true,
      })
      setOrderComplete(true)
      setCheckoutProgressStage('failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCheckoutResult = () => {
    stopLencoPolling()
    checkoutSubmissionRef.current = false
    setOrderComplete(false)
    setCheckoutError('')
    setCheckoutProgressStage('idle')
    setCheckoutProgressMessage('')
    setIsSubmitting(false)
  }

  const handlePlaceOrder = async () => {
    if (checkoutSubmissionRef.current) return
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

    checkoutSubmissionRef.current = true
    setIsSubmitting(true)
    setCheckoutProgressStage('creating')
    setCheckoutProgressMessage(
      paymentMethod === 'cod'
        ? 'Checking stock and confirming your delivery details…'
        : 'Checking stock, delivery and your secure order total…'
    )

    try {
      const order =
        createdOrderId && orderNumber
          ? {
              orderId: createdOrderId,
              orderRef: orderNumber,
              recoveryToken: createdRecoveryToken,
            }
          : await createOrderThroughPaymentsApi(paymentMethod)

      if (paymentMethod === 'mobile') {
        const reference = `DH_ORDER_${order.orderId}`

        setCheckoutProgressStage('requesting-payment')
        setCheckoutProgressMessage('Sending a secure approval request to your Mobile Money phone…')

        let response

        try {
          response = await initiateLencoMobileMoney({
            amount: finalTotal,
            phone: formData.paymentPhone,
            operator: detectMobileMoneyOperator(formData.paymentPhone),
            reference,
            orderId: order.orderId,
            customerName: formData.fullName,
            customerEmail: getCheckoutEmail(),
            recoveryToken: order.recoveryToken,
          })
        } catch (initiationError) {
          console.error(initiationError)
          setLencoReference(reference)
          setCreatedOrderId(order.orderId)
          setCompletedOrderTotal(finalTotal)
          setSuccessState({
            title: 'Checking Mobile Money Payment',
            message:
              'Your internet connection changed while the approval prompt was opening. DigitalHood has not marked this payment as failed and will keep checking the same order.',
            nextStep:
              'Complete the prompt if it is still on your phone. Do not request another prompt while this check is active.',
            confirmed: false,
          })
          pollLencoPayment({
            reference,
            orderId: order.orderId,
            recoveryToken: order.recoveryToken,
          })
          return
        }

        const paymentReference = response.reference || reference
        const paymentConfirmed = response.paid === true
        const paymentFailed =
          response.failed === true ||
          (response.terminal === true && !paymentConfirmed)

        setLencoReference(paymentReference)
        setCreatedOrderId(order.orderId)
        setCompletedOrderTotal(finalTotal)

        if (paymentConfirmed) {
          setCheckoutProgressStage('confirming')
          setCheckoutProgressMessage('Payment received. We are securely confirming your order now.')
          setSuccessState(getSuccessState('mobile-confirmed'))
          removeCheckedOutItems()
          showConfirmedOrder()
          return
        }

        if (paymentFailed) {
          const failureMessage =
            response.message ||
            'The Mobile Money payment was not completed. Check the number, balance and approval prompt, then try again.'

          setCheckoutProgressStage('failed')
          setSuccessState({
            title: 'Payment Not Completed',
            message: failureMessage,
            nextStep:
              'Open your order to retry securely. DigitalHood will not ask for your Mobile Money PIN.',
            confirmed: false,
            failed: true,
          })
          setOrderComplete(true)
          return
        }

        setSuccessState(getSuccessState('mobile'))

        pollLencoPayment({
          reference: paymentReference,
          orderId: order.orderId,
          recoveryToken: order.recoveryToken,
        })

        return
      }

      setCheckoutProgressStage('confirming')
      setCheckoutProgressMessage('Just a moment — we are confirming your Cash on Delivery order.')
      setSuccessState(getSuccessState(paymentMethod))
      setCompletedOrderTotal(finalTotal)
      removeCheckedOutItems()
      showConfirmedOrder()
    } catch (error) {
      const failureMessage =
        error instanceof Error
          ? error.message
          : 'Checkout failed. Please try again.'
      setCheckoutError(failureMessage)
      setSuccessState({
        title: 'Checkout Could Not Be Completed',
        message: failureMessage,
        nextStep:
          'Review your details and try again. No new payment should be made if your bank or Mobile Money account was already charged.',
        confirmed: false,
        failed: true,
      })
      setOrderComplete(true)
      setCheckoutProgressStage('failed')
    } finally {
      setIsSubmitting(false)
      checkoutSubmissionRef.current = false
    }
  }

  if (
    checkoutItems.length === 0 &&
    !orderComplete &&
    checkoutProgressStage === 'idle'
  ) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-dh-gray">
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
              The selected items are no longer in your cart. Choose the items you want to pay for.
            </p>

            <Button
              onClick={() => navigate('/cart')}
              className="rounded-full bg-dh-primary px-8 text-white hover:bg-dh-secondary"
            >
              Return to cart
            </Button>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div ref={pageRef} className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />

      <main className="py-5 lg:py-7">
        <div className="mx-auto w-full max-w-[1180px] px-3 sm:px-5 lg:px-6">
          <button
            onClick={() => navigate('/cart')}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Cart
          </button>

          <section className="mb-4 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex w-fit items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-dh-primary">
                <Shield className="h-4 w-4" />
                Secure checkout
              </p>

              <h1 className="mt-1 font-display text-2xl font-black leading-tight text-dh-primary sm:text-3xl">
                Checkout
              </h1>

              <p className="mt-1 text-sm text-dh-dark-gray">Review the order and delivery details, then pay securely.</p>
            </div>
          </section>

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

          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm sm:p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dh-primary text-sm font-black text-white">1</div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-dh-primary">Order Summary</h2>
                    <p className="text-xs text-dh-dark-gray">Confirm your products and total.</p>
                  </div>
                </div>

                <div className="mb-4 max-h-[24rem] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {checkoutStoreGroups.map((group) => (
                    <div
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-dh-light-gray bg-white"
                    >
                      <Link
                        to={group.sellerUrl}
                        className="flex items-center justify-between gap-3 border-b border-dh-light-gray bg-dh-gray px-3 py-2 transition hover:bg-white"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-black text-dh-primary">
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
                            <span className="block truncate text-sm font-black leading-tight text-dh-primary">
                              {group.storeName}
                            </span>
                            <span className="block truncate text-[10px] font-bold leading-tight text-green-700">
                              {group.feedbackText}
                            </span>
                          </span>
                        </span>

                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-dh-primary">
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
                              className={`grid grid-cols-[56px_minmax(0,1fr)] gap-2.5 p-2.5 ${
                                unavailable ? 'bg-red-50/40' : 'bg-white'
                              }`}
                            >
                              <img
                                src={item.image || '/logo.jpg'}
                                alt={item.name}
                                className="h-14 w-14 rounded-xl bg-dh-gray object-contain p-1.5"
                                onError={(event) => {
                                  event.currentTarget.src = '/logo.jpg'
                                }}
                              />

                              <div className="min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-xs font-black leading-tight text-dh-primary">
                                      {item.name}
                                    </p>

                                    {variationText && (
                                      <p className="mt-1 line-clamp-1 text-[10px] font-medium text-dh-dark-gray">
                                        {variationText}
                                      </p>
                                    )}
                                  </div>

                                  <p className="shrink-0 text-right text-xs font-black text-dh-primary">
                                    {formatPrice(item.price * item.quantity)}
                                  </p>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <StockBadge item={getCartItemStockObject(item)} />

                                    {unavailable && (
                                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                        Review
                                      </span>
                                    )}
                                  </div>

                                  <span className="rounded-full bg-dh-gray px-2.5 py-1 text-[11px] font-black text-dh-primary">
                                    Qty {item.quantity}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <section
                  aria-labelledby="checkout-delivery-address"
                  className="mb-3 overflow-hidden rounded-xl border border-dh-light-gray bg-dh-gray/70"
                >
                  <div className="flex items-start gap-2.5 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dh-secondary/15 text-dh-primary">
                      <MapPin className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p
                          id="checkout-delivery-address"
                          className="text-[10px] font-black uppercase tracking-[0.12em] text-dh-dark-gray"
                        >
                          Deliver to
                        </p>

                        {selectedSavedAddress &&
                          (selectedSavedAddress.isDefault ||
                            selectedSavedAddress.id === customer?.defaultAddressId) && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-black text-green-700">
                              Default
                            </span>
                          )}
                      </div>

                      {selectedSavedAddress && !showDeliveryFields ? (
                        <>
                          <p className="mt-0.5 truncate text-xs font-black text-dh-primary">
                            {selectedSavedAddress.fullName} · {selectedSavedAddress.phone}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-dh-dark-gray">
                            {getAddressLine(selectedSavedAddress)}
                          </p>
                        </>
                      ) : (
                        <p className="mt-0.5 text-xs font-bold text-dh-primary">
                          Enter the address for this delivery
                        </p>
                      )}
                    </div>

                    {isAuthenticated && selectedSavedAddress && !showDeliveryFields && (
                      <div className="flex shrink-0 items-center gap-1">
                        {savedAddresses.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setIsAddressPickerOpen((current) => !current)}
                            className="inline-flex h-8 items-center rounded-lg border border-dh-light-gray bg-white px-2 text-[10px] font-black text-dh-primary hover:border-dh-primary"
                          >
                            <Edit3 className="mr-1 h-3 w-3" />
                            Change
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={openAddCheckoutAddress}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-dh-primary text-white hover:bg-dh-secondary"
                          aria-label="Add another delivery address"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isAuthenticated && isAddressPickerOpen && savedAddresses.length > 1 && (
                    <div className="border-t border-dh-light-gray bg-white p-2">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-[10px] font-black uppercase tracking-wide text-dh-dark-gray">
                          Select an address
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddressPickerOpen(false)}
                          className="rounded-full p-1 text-dh-dark-gray hover:bg-dh-gray"
                          aria-label="Close address selector"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="max-h-44 space-y-1.5 overflow-y-auto">
                        {savedAddresses.map((address) => {
                          const selected = selectedSavedAddress?.id === address.id

                          return (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => applySavedAddressToForm(address)}
                              className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                                selected
                                  ? 'border-dh-primary bg-dh-primary/[0.04]'
                                  : 'border-dh-light-gray hover:border-dh-primary/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-black text-dh-primary">
                                  {address.label || address.fullName || 'Delivery address'}
                                </p>
                                {selected && (
                                  <span className="text-[9px] font-black uppercase text-green-700">
                                    Selected
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 truncate text-[10px] text-dh-dark-gray">
                                {address.fullName} · {address.phone} · {getAddressLine(address)}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {showDeliveryFields && (
                    <div className="border-t border-dh-light-gray bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black text-dh-primary">
                            {isAuthenticated ? 'New delivery address' : 'Delivery details'}
                          </p>
                          <p className="text-[10px] text-dh-dark-gray">
                            Required for delivery and live directions.
                          </p>
                        </div>

                        {isAuthenticated && savedAddresses.length > 0 && (
                          <button
                            type="button"
                            onClick={cancelAddCheckoutAddress}
                            className="rounded-lg border border-dh-light-gray px-2.5 py-1.5 text-[10px] font-black text-dh-primary"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        disabled={isLocatingAddress}
                        className="mt-2.5 inline-flex h-9 w-full items-center justify-center rounded-lg border border-dh-primary/20 bg-dh-primary/[0.035] px-3 text-[11px] font-black text-dh-primary hover:border-dh-primary disabled:opacity-60"
                      >
                        {isLocatingAddress ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MapPin className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {isLocatingAddress ? 'Getting location…' : 'Use current location'}
                      </button>

                      {locationPin && (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-green-50 px-2.5 py-2 text-[10px] font-bold text-green-800">
                          <span>
                            Precise location saved
                            {locationPin.accuracy ? ` · ±${locationPin.accuracy} m` : ''}
                          </span>
                          <a
                            href={locationPin.mapUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 underline"
                          >
                            Preview
                          </a>
                        </div>
                      )}

                      {locationError && (
                        <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] font-bold text-red-700">
                          {locationError}
                        </p>
                      )}

                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                        <Input
                          aria-label="Full name"
                          value={formData.fullName}
                          onChange={(event) => updateField('fullName', event.target.value)}
                          placeholder="Full name"
                          className="h-9 rounded-lg bg-dh-gray text-xs sm:col-span-2"
                        />

                        {!isAuthenticated && (
                          <Input
                            aria-label="Email"
                            type="email"
                            value={formData.email}
                            onChange={(event) => updateField('email', event.target.value)}
                            placeholder="Email"
                            className="h-9 rounded-lg bg-dh-gray text-xs sm:col-span-2"
                          />
                        )}

                        <Input
                          aria-label="Delivery contact number"
                          value={formData.phone}
                          onChange={(event) => updateField('phone', event.target.value)}
                          placeholder="Delivery phone"
                          className="h-9 rounded-lg bg-dh-gray text-xs sm:col-span-2"
                        />
                        <Input
                          aria-label="Street address"
                          value={formData.address}
                          onChange={(event) => updateField('address', event.target.value)}
                          placeholder="House, road and area"
                          className="h-9 rounded-lg bg-dh-gray text-xs sm:col-span-2"
                        />
                        <Input
                          aria-label="Landmark or extra directions"
                          value={formData.address2}
                          onChange={(event) => updateField('address2', event.target.value)}
                          placeholder="Landmark or extra directions"
                          className="h-9 rounded-lg bg-dh-gray text-xs sm:col-span-2"
                        />
                        <Input
                          aria-label="City"
                          value={formData.city}
                          onChange={(event) => updateField('city', event.target.value)}
                          placeholder="City"
                          className="h-9 rounded-lg bg-dh-gray text-xs"
                        />
                        <Input
                          aria-label="Province"
                          value={formData.province}
                          onChange={(event) => updateField('province', event.target.value)}
                          placeholder="Province"
                          className="h-9 rounded-lg bg-dh-gray text-xs"
                        />
                      </div>

                      {isAuthenticated && (
                        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <label className="flex items-center gap-2 text-[10px] font-bold text-dh-dark-gray">
                            <input
                              type="checkbox"
                              checked={saveCheckoutAddressAsDefault}
                              disabled={savedAddresses.length === 0}
                              onChange={(event) => setSaveCheckoutAddressAsDefault(event.target.checked)}
                              className="h-3.5 w-3.5 rounded border-dh-light-gray"
                            />
                            {savedAddresses.length === 0 ? 'First address becomes default' : 'Make default'}
                          </label>

                          <button
                            type="button"
                            onClick={handleSaveCheckoutAddress}
                            disabled={isSavingCheckoutAddress}
                            className="inline-flex h-9 items-center justify-center rounded-lg bg-dh-primary px-3 text-[11px] font-black text-white hover:bg-dh-secondary disabled:opacity-60"
                          >
                            {isSavingCheckoutAddress ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {isSavingCheckoutAddress ? 'Saving…' : 'Save and use'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <div className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">
                  <div className="flex items-start gap-2">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-black text-green-800">
                        {deliveryTitle} · {deliveryEstimate}
                      </p>
                      <p className="mt-0.5">
                        {shipping.isLusaka
                          ? shipping.countdown
                          : 'Delivery timing is confirmed from your address.'}
                      </p>
                    </div>
                  </div>
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

              </div>
            </aside>

            <div>
              <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dh-primary text-xs font-black text-white">
                      2
                    </div>

                    <div>
                      <h2 className="font-display text-lg font-bold leading-tight text-dh-primary">
                        Payment Method
                      </h2>
                      <p className="text-[11px] text-dh-dark-gray">
                        Choose how you want to pay.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-green-700">
                    <Shield className="h-3 w-3" />
                    Secure
                  </span>
                </div>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    changePaymentMethod(value as 'mobile' | 'card' | 'cod')
                  }
                  className="grid grid-cols-3 gap-1.5 rounded-xl bg-dh-gray p-1.5"
                >
                  <label
                    className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-all ${
                      paymentMethod === 'mobile'
                        ? 'border-dh-primary bg-white text-dh-primary shadow-sm'
                        : 'border-transparent text-dh-dark-gray hover:bg-white/70'
                    }`}
                  >
                    <RadioGroupItem value="mobile" />

                    <Smartphone className="h-4 w-4 shrink-0" />

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black sm:text-xs">Mobile Money</p>
                      <p className="hidden truncate text-[9px] text-dh-dark-gray sm:block">MTN · Airtel</p>
                    </div>
                  </label>

                  <label
                    className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-dh-primary bg-white text-dh-primary shadow-sm'
                        : 'border-transparent text-dh-dark-gray hover:bg-white/70'
                    }`}
                  >
                    <RadioGroupItem value="card" />

                    <CreditCard className="h-4 w-4 shrink-0" />

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black sm:text-xs">Card</p>
                      <p className="hidden truncate text-[9px] text-dh-dark-gray sm:block">Visa · Mastercard</p>
                    </div>
                  </label>

                  <label
                    className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2.5 transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-dh-primary bg-white text-dh-primary shadow-sm'
                        : 'border-transparent text-dh-dark-gray hover:bg-white/70'
                    }`}
                  >
                    <RadioGroupItem value="cod" />

                    <Truck className="h-4 w-4 shrink-0" />

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-black sm:text-xs">On delivery</p>
                      <p className="hidden truncate text-[9px] text-dh-dark-gray sm:block">Pay on arrival</p>
                    </div>
                  </label>
                </RadioGroup>

                {paymentMethod === 'mobile' && (
                  <div className="mt-2.5 rounded-lg border border-dh-light-gray bg-white p-2.5">
                    <Label htmlFor="paymentPhone" className="text-[11px] font-black">
                      Mobile Money Payment Number
                    </Label>

                    <Input
                      id="paymentPhone"
                      value={formData.paymentPhone}
                      onChange={(event) =>
                        updateField('paymentPhone', event.target.value)
                      }
                      placeholder="e.g. 097XXXXXXX or +26097XXXXXXX"
                      className="mt-1.5 h-9 rounded-lg bg-dh-gray text-xs"
                    />
                  </div>
                )}

                {paymentMethod === 'card' && (
                  <div className="mt-2.5">
                    {isPreparingCard && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs font-bold text-blue-700">
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
                          onProcessing={handleCardPaymentProcessing}
                          onSuccess={handleCardPaymentSuccess}
                          onFailure={handleCardPaymentFailure}
                        />
                      </Elements>
                    )}

                    {!isPreparingCard && !cardClientSecret && (
                      <Button
                        type="button"
                        onClick={prepareCardPayment}
                        disabled={hasUnavailableItems}
                        className="h-10 w-full rounded-lg bg-dh-primary text-xs font-black text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      >
                        Prepare Card Payment
                      </Button>
                    )}
                  </div>
                )}

                {paymentMethod !== 'card' && (
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || hasUnavailableItems}
                    className="mt-2.5 h-10 w-full rounded-lg bg-dh-primary text-xs font-black text-white shadow-sm hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                  >
                    {hasUnavailableItems
                      ? 'Checkout unavailable'
                      : isSubmitting
                        ? 'Securing your order…'
                        : `Place order · ${formatPrice(finalTotal)}`}
                  </Button>
                )}

                <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-dh-dark-gray">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Protected payment and order details</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CheckoutProgressOverlay
        stage={checkoutProgressStage}
        paymentMethod={paymentMethod}
        statusMessage={checkoutProgressMessage}
        resultTitle={orderComplete ? successState.title : undefined}
        resultMessage={orderComplete ? successState.message : undefined}
        nextStep={orderComplete ? successState.nextStep : undefined}
        orderNumber={orderNumber}
        paymentReference={lencoReference}
        total={formatPrice(successOrderTotal)}
        deliveryLabel={confirmedDeliveryLabel || deliveryEstimate}
        address={checkoutAddressSummary}
        canRetry={successState.failed === true && !createdOrderId}
        onRetry={resetCheckoutResult}
        onViewOrder={
          createdOrderId && (isAuthenticated || createdRecoveryToken)
            ? () => navigate(
                successState.confirmed
                  ? `/track-order/${createdOrderId}${createdRecoveryToken ? `?token=${encodeURIComponent(createdRecoveryToken)}` : ''}`
                  : `/orders/${createdOrderId}/pay${createdRecoveryToken ? `?token=${encodeURIComponent(createdRecoveryToken)}` : ''}`
              )
            : undefined
        }
        viewOrderLabel={successState.confirmed ? 'View order' : 'Pay this order'}
        onContinueShopping={() => navigate('/')}
      />

      <Footer />
    </div>
  )
}
