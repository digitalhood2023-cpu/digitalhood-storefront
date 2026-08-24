import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const pageRef = useRef<HTMLDivElement>(null)
  const lencoPollingRef = useRef<number | null>(null)
  const completionTimerRef = useRef<number | null>(null)
  const checkoutSubmissionRef = useRef(false)
  const hasPrefilledAccountRef = useRef(false)

  const {
    customer,
    isAuthenticated,
    isLoading: isAccountLoading,
  } = useAccount()

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
  const [completedOrderTotal, setCompletedOrderTotal] = useState<number | null>(null)
  const [completedStoreGroups, setCompletedStoreGroups] = useState<
    ReturnType<typeof groupCheckoutItemsByStore>
  >([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutProgressStage, setCheckoutProgressStage] =
    useState<CheckoutProgressStage>('idle')
  const [checkoutProgressMessage, setCheckoutProgressMessage] = useState('')
  const [confirmedDeliveryLabel, setConfirmedDeliveryLabel] = useState('')

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
  const successStoreGroups = completedStoreGroups.length > 0
    ? completedStoreGroups
    : checkoutStoreGroups
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
    setCheckoutProgressMessage('Your confirmation is ready. Taking you to your order summary…')
    setIsSubmitting(false)

    if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = window.setTimeout(() => {
      setOrderComplete(true)
      setCheckoutProgressStage('idle')
      completionTimerRef.current = null
    }, 1_100)
  }

  useEffect(() => {
    return () => {
      stopLencoPolling()
      if (completionTimerRef.current) window.clearTimeout(completionTimerRef.current)
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
    setCreatedOrderId(null)
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
    setCreatedOrderId(null)
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
        setCreatedOrderId(null)
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
      setCreatedOrderId(null)
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
    setConfirmedDeliveryLabel(
      response.order.deliveryEstimate?.label || deliveryEstimate
    )

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
    const maxAttempts = 60

    setIsWaitingForLenco(true)
    setLencoStatus('Waiting for payment approval...')
    setCheckoutProgressStage('awaiting-approval')
    setCheckoutProgressMessage('Approve the secure request on your phone. We will confirm it here automatically.')

    const poll = async () => {
      attempts += 1

      try {
        const result = await verifyLencoMobileMoney(reference)
        const paymentConfirmed =
          result.paid === true || isLencoPaidStatus(result.status)
        const paymentFailed =
          result.failed === true ||
          (result.terminal === true && !paymentConfirmed)

        if (paymentConfirmed) {
          stopLencoPolling()
          setIsWaitingForLenco(false)
          setCheckoutProgressStage('confirming')
          setCheckoutProgressMessage('Payment received. We are securely confirming your order now.')
          setLencoStatus('Payment confirmed successfully.')
          setSuccessState(getSuccessState('mobile-confirmed'))
          setCreatedOrderId(orderId)
          setCompletedOrderTotal(finalTotal)
          setCompletedStoreGroups(checkoutStoreGroups)
          removeCheckedOutItems()
          showConfirmedOrder()
          return
        }

        if (paymentFailed) {
          const failureMessage =
            result.message ||
            'The Mobile Money payment was not completed. Check the number, balance and approval prompt, then try again.'

          stopLencoPolling()
          setIsWaitingForLenco(false)
          setIsSubmitting(false)
          setCheckoutProgressStage('idle')
          setLencoStatus(failureMessage)
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

        setLencoStatus(
          result.message ||
            (result.status
              ? String(result.status)
              : 'Checking payment...')
        )
        setCheckoutProgressMessage(
          result.message || 'Your request is still active. Approve it on your phone and we will confirm it automatically.'
        )
      } catch (error) {
        console.error(error)
      }

      if (attempts >= maxAttempts) {
        stopLencoPolling()
        setIsWaitingForLenco(false)
        setIsSubmitting(false)
        setCheckoutProgressStage('idle')
        setLencoStatus(
          'Payment has not been confirmed. If money was deducted, do not pay again; DigitalHood will still reconcile it automatically.'
        )
        setSuccessState({
          title: 'Payment Confirmation Delayed',
          message:
            'Confirmation is taking longer than expected, but DigitalHood will keep checking it securely in the background.',
          nextStep:
            'If money was deducted, do not retry. View your order or contact DigitalHood support with the payment reference.',
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
      setCheckoutProgressStage('idle')
    }
  }

  useEffect(() => {
    if (paymentMethod !== 'card') {
      setCardClientSecret('')
      setCardPaymentIntentId('')
      setCreatedOrderId(null)
    }
  }, [paymentMethod])

  useEffect(() => {
    if (!orderComplete && !checkoutError) return

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'auto' })
      pageRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
    })
  }, [orderComplete, checkoutError])

  const handleCardPaymentSuccess = async () => {
    setCheckoutError('')
    setIsSubmitting(true)
    setCheckoutProgressStage('confirming')
    setCheckoutProgressMessage('Payment received. We are securely confirming your order now.')

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
      setCompletedOrderTotal(finalTotal)
      setCompletedStoreGroups(checkoutStoreGroups)
      removeCheckedOutItems()
      showConfirmedOrder()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Card payment was successful, but order verification failed. Please contact DigitalHood support.'
      )
      setCheckoutProgressStage('idle')
    } finally {
      setIsSubmitting(false)
    }
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
          ? { orderId: createdOrderId, orderRef: orderNumber }
          : await createOrderThroughPaymentsApi(paymentMethod)

      if (paymentMethod === 'mobile') {
        const reference = `DH_ORDER_${order.orderId}`

        setCheckoutProgressStage('requesting-payment')
        setCheckoutProgressMessage('Sending a secure approval request to your Mobile Money phone…')

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
        const paymentConfirmed =
          response.paid === true || isLencoPaidStatus(response.status)
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
          setCompletedStoreGroups(checkoutStoreGroups)
          removeCheckedOutItems()
          showConfirmedOrder()
          return
        }

        if (paymentFailed) {
          const failureMessage =
            response.message ||
            'The Mobile Money payment was not completed. Check the number, balance and approval prompt, then try again.'

          setIsWaitingForLenco(false)
          setCheckoutProgressStage('idle')
          setLencoStatus(failureMessage)
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
        })

        return
      }

      setCheckoutProgressStage('confirming')
      setCheckoutProgressMessage('Just a moment — we are confirming your Cash on Delivery order.')
      setSuccessState(getSuccessState(paymentMethod))
      setCompletedOrderTotal(finalTotal)
      setCompletedStoreGroups(checkoutStoreGroups)
      removeCheckedOutItems()
      showConfirmedOrder()
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Checkout failed. Please try again.'
      )
      setCheckoutProgressStage('idle')
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

  if (orderComplete) {
    return (
      <div ref={pageRef} className="flex min-h-[100svh] flex-col bg-dh-gray">
        <Header />

        <main className="py-10 lg:py-16">
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <div
                className={`relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
                  successState.confirmed
                    ? 'bg-green-100 shadow-[0_0_0_12px_rgba(34,197,94,0.10)]'
                    : successState.failed
                      ? 'bg-red-100 shadow-[0_0_0_12px_rgba(239,68,68,0.08)]'
                      : 'bg-yellow-100'
                }`}
              >
                {successState.confirmed && (
                  <span className="absolute inset-0 rounded-full border-4 border-green-300/70 animate-ping" />
                )}

                {successState.confirmed ? (
                  <Check className="relative z-10 h-10 w-10 animate-[bounce_1.1s_ease-in-out_1] text-green-600" />
                ) : successState.failed ? (
                  <AlertCircle className="h-10 w-10 text-red-600" />
                ) : isWaitingForLenco ? (
                  <Loader2 className="h-10 w-10 animate-spin text-yellow-600" />
                ) : (
                  <Clock className="h-10 w-10 text-yellow-700" />
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

                <div className="mt-5 rounded-2xl border border-dh-light-gray bg-white p-4 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                    Stores in this order
                  </p>

                  <div className="mt-3 space-y-2.5">
                    {successStoreGroups.map((group) => (
                      <div
                        key={group.key}
                        className="flex items-center justify-between gap-3 rounded-2xl bg-dh-gray px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-black text-dh-primary">
                            {group.avatarUrl ? (
                              <img
                                src={group.avatarUrl}
                                alt={group.storeName}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              group.initials
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-dh-primary">
                              {group.storeName}
                            </p>
                            <p className="truncate text-[11px] font-bold text-green-700">
                              {group.feedbackText}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-dh-primary">
                            {formatPrice(group.subtotal)}
                          </p>
                          <p className="text-[10px] font-semibold text-dh-dark-gray">
                            {group.items.length} item{group.items.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {!successState.confirmed && (
                  <div
                    className={`mt-5 rounded-2xl border p-4 text-left ${
                      successState.failed
                        ? 'border-red-200 bg-red-50'
                        : 'border-yellow-100 bg-yellow-50'
                    }`}
                  >
                    <p
                      className={`mb-1 text-sm font-semibold ${
                        successState.failed
                          ? 'text-red-800'
                          : 'text-yellow-800'
                      }`}
                    >
                      Payment Status
                    </p>

                    <p
                      className={`text-sm ${
                        successState.failed
                          ? 'text-red-700'
                          : 'text-yellow-700'
                      }`}
                    >
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
                    onClick={() => navigate(`/track-order/${createdOrderId}`)}
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
    <div ref={pageRef} className="flex min-h-[100svh] flex-col bg-dh-gray">
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
                      <div className="sm:col-span-2 rounded-2xl border border-dh-primary/15 bg-white p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-semibold text-dh-primary">
                              Pin your precise delivery location
                            </p>
                            <p className="mt-1 text-sm text-dh-dark-gray">
                              We use your device GPS so the seller or courier can open exact directions.
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleUseCurrentLocation}
                            disabled={isLocatingAddress}
                            className="shrink-0 rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                          >
                            {isLocatingAddress ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <MapPin className="mr-2 h-4 w-4" />
                            )}
                            {isLocatingAddress ? 'Getting location...' : 'Use current location'}
                          </Button>
                        </div>

                        {locationPin && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                            <span>
                              Location pinned to 6 decimal places
                              {locationPin.accuracy ? ` · accuracy ±${locationPin.accuracy} m` : ''}
                            </span>
                            <a
                              href={locationPin.mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-black underline"
                            >
                              Preview in Maps
                            </a>
                          </div>
                        )}

                        {locationError && (
                          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            {locationError}
                          </p>
                        )}
                      </div>

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

                <div className="mb-5 max-h-[28rem] space-y-2.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
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

      {!orderComplete && checkoutItems.length > 0 && paymentMethod !== 'card' && (
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

      <CheckoutProgressOverlay
        stage={checkoutProgressStage}
        paymentMethod={paymentMethod}
        statusMessage={checkoutProgressMessage}
        orderNumber={orderNumber}
        total={formatPrice(successOrderTotal)}
        deliveryLabel={confirmedDeliveryLabel || deliveryEstimate}
        address={checkoutAddressSummary}
      />

      <Footer />
    </div>
  )
}
