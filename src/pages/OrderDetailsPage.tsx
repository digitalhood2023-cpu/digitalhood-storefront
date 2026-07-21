import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  ImagePlus,
  Loader2,
  MapPin,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'

import { useAccount } from '@/context/AccountContext'

import {
  createCustomerOrderCase,
  getCustomerOrder,
  getCustomerOrderCases,
  replyToCustomerOrderCase,
  type AccountOrder,
  type AccountOrderCase,
  type AccountOrderCaseAttachment,
  type AccountOrderCaseReasonOption,
  type AccountOrderItem,
} from '@/api/account'

import { groupOrderItemsByStore } from '@/lib/orderStoreOwnership'

function formatPrice(amount?: string | number, currency = 'ZMW') {
  const value = Number(amount || 0)

  if (currency === 'ZMW') {
    return `K${value.toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return `${currency} ${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function countWords(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length
}

function formatFileSize(value?: number) {
  const bytes = Number(value || 0)

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date?: string | null) {
  if (!date) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  } catch {
    return date
  }
}

function normalizeStatus(status?: string) {
  return String(status || '')
    .toLowerCase()
    .replace(/^wc-/, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

function getStatusStyle(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'processing') {
    return 'bg-blue-50 text-blue-700 border-blue-100'
  }

  if (value === 'shipped') {
    return 'bg-purple-50 text-purple-700 border-purple-100'
  }

  if (value === 'out-for-delivery' || value === 'outfordelivery') {
    return 'bg-orange-50 text-orange-700 border-orange-100'
  }

  if (value === 'delivered' || value === 'completed') {
    return 'bg-green-50 text-green-700 border-green-100'
  }

  if (value === 'pending' || value === 'on-hold') {
    return 'bg-yellow-50 text-yellow-700 border-yellow-100'
  }

  if (value === 'failed' || value === 'cancelled' || value === 'refunded') {
    return 'bg-red-50 text-red-700 border-red-100'
  }

  return 'bg-gray-50 text-gray-700 border-gray-100'
}

const ORDER_CASE_ASSET_ORIGIN =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

function getCaseStatusLabel(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'new') return 'Submitted'
  if (value === 'open') return 'Under review'
  if (value === 'pending') return 'Pending'
  if (value === 'waiting-for-customer') return 'Action required'
  if (value === 'waiting-for-seller') return 'Waiting for seller'
  if (value === 'resolved') return 'Resolved'
  if (value === 'closed') return 'Closed'

  return String(status || 'Submitted')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getCaseStatusStyle(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'waiting-for-customer') {
    return 'border-orange-200 bg-orange-50 text-orange-700'
  }

  if (value === 'resolved') {
    return 'border-green-200 bg-green-50 text-green-700'
  }

  if (value === 'closed') {
    return 'border-slate-200 bg-slate-100 text-slate-600'
  }

  if (value === 'open') {
    return 'border-purple-200 bg-purple-50 text-purple-700'
  }

  return 'border-blue-200 bg-blue-50 text-blue-700'
}

function isCaseClosed(status?: string) {
  return ['resolved', 'closed', 'spam'].includes(
    normalizeStatus(status)
  )
}

function getCaseAttachmentUrl(
  attachment: AccountOrderCaseAttachment
) {
  const value = String(attachment.url || '').trim()

  if (!value) return ''

  try {
    return new URL(value, ORDER_CASE_ASSET_ORIGIN).toString()
  } catch {
    return value
  }
}

function getStatusTitle(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'pending') return 'Awaiting payment'
  if (value === 'on-hold') return 'On hold'
  if (value === 'processing') return 'Your order is being processed'
  if (value === 'shipped') return 'Your order has been shipped'
  if (value === 'out-for-delivery' || value === 'outfordelivery') {
    return 'Your order is out for delivery'
  }
  if (value === 'delivered' || value === 'completed') {
    return 'Your order has been delivered'
  }
  if (value === 'failed') return 'Payment failed'
  if (value === 'cancelled') return 'Order cancelled'
  if (value === 'refunded') return 'Order refunded'

  return 'Order details'
}

function getNextStepMessage(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'pending') {
    return 'We are waiting for payment confirmation. Once payment is confirmed, your order will move to processing.'
  }

  if (value === 'on-hold') {
    return 'Your order is on hold while we confirm payment, stock, or delivery details.'
  }

  if (value === 'processing') {
    return 'Our team is preparing your order. We will update the progress once it is shipped.'
  }

  if (value === 'shipped') {
    return 'Your order has left dispatch. The next update will show when it is out for delivery.'
  }

  if (value === 'out-for-delivery' || value === 'outfordelivery') {
    return 'Your order is on the way. Please keep your delivery phone available.'
  }

  if (value === 'delivered' || value === 'completed') {
    return 'Your order has been delivered. Thank you for shopping with DigitalHood.'
  }

  if (value === 'failed') {
    return 'Payment failed. You can contact support if money was deducted or if you need help placing the order again.'
  }

  if (value === 'cancelled') {
    return 'This order was cancelled. Contact support if you believe this was a mistake.'
  }

  if (value === 'refunded') {
    return 'This order has been refunded. Contact support if you need more information.'
  }

  return 'We will update this page as your order progresses.'
}

function getProgressSteps(order: AccountOrder) {
  const status = normalizeStatus(order.status)

  const statusRank: Record<string, number> = {
    pending: 1,
    'on-hold': 1,
    processing: 2,
    shipped: 3,
    'out-for-delivery': 4,
    outfordelivery: 4,
    delivered: 5,
    completed: 5,
  }

  const currentRank = statusRank[status] || 1

  const paid =
    Boolean(order.datePaid) ||
    [
      'processing',
      'shipped',
      'out-for-delivery',
      'outfordelivery',
      'delivered',
      'completed',
    ].includes(status)

  return [
    {
      label: 'Order placed',
      description: 'We received your order.',
      done: true,
    },
    {
      label: 'Payment confirmed',
      description: paid
        ? 'Payment is confirmed or your order is approved.'
        : 'Waiting for payment confirmation.',
      done: paid,
    },
    {
      label: 'Processing',
      description:
        currentRank >= 2
          ? 'Your order is being prepared.'
          : 'Your order will move here after confirmation.',
      done: currentRank >= 2,
    },
    {
      label: 'Shipped',
      description:
        currentRank >= 3
          ? 'Your order has left the dispatch point.'
          : 'Your order has not been shipped yet.',
      done: currentRank >= 3,
    },
    {
      label: 'Out for delivery',
      description:
        currentRank >= 4
          ? 'Your order is on the way to your delivery address.'
          : 'Delivery will start after the order is shipped.',
      done: currentRank >= 4,
    },
    {
      label: 'Delivered',
      description:
        currentRank >= 5
          ? 'Your order has been delivered successfully.'
          : 'Delivery confirmation will appear here.',
      done: currentRank >= 5,
    },
  ]
}

function getItemMetaText(item: AccountOrderItem) {
  const meta = item.meta || []

  return meta
    .filter((entry) => {
      const key = String(entry.displayKey || entry.key || '').toLowerCase()

      if (!key) return false
      if (key.startsWith('_')) return false
      if (key.includes('reduced stock')) return false

      return true
    })
    .map((entry) => {
      const label = entry.displayKey || entry.key || 'Option'
      const value = entry.displayValue || String(entry.value || '')

      return `${label}: ${value}`
    })
}

function DetailCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
          {icon}
        </div>

        <h2 className="font-display text-xl font-bold text-dh-primary">
          {title}
        </h2>
      </div>

      {children}
    </section>
  )
}

export default function OrderDetailsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { orderId } = useParams()
  const { isAuthenticated, isLoading } = useAccount()

  const [order, setOrder] = useState<AccountOrder | null>(null)
  const [isOrderLoading, setIsOrderLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [highlightedItemId, setHighlightedItemId] = useState('')

  const [isCaseModalOpen, setIsCaseModalOpen] = useState(false)
  const [isCaseDataLoading, setIsCaseDataLoading] = useState(false)
  const [isCaseSubmitting, setIsCaseSubmitting] = useState(false)
  const [caseError, setCaseError] = useState('')
  const [caseSuccessNumber, setCaseSuccessNumber] = useState('')
  const [orderCases, setOrderCases] = useState<AccountOrderCase[]>([])
  const [caseReasonOptions, setCaseReasonOptions] = useState<
    AccountOrderCaseReasonOption[]
  >([])
  const [caseReason, setCaseReason] = useState('')
  const [caseItemId, setCaseItemId] = useState('')
  const [caseDescription, setCaseDescription] = useState('')
  const [casePhotos, setCasePhotos] = useState<File[]>([])
  const [caseCanCreate, setCaseCanCreate] =
    useState<boolean | null>(null)
  const [isCaseProgressOpen, setIsCaseProgressOpen] =
    useState(false)
  const [caseReplyMessage, setCaseReplyMessage] = useState('')
  const [caseReplyPhotos, setCaseReplyPhotos] =
    useState<File[]>([])
  const [isCaseReplySubmitting, setIsCaseReplySubmitting] =
    useState(false)
  const [caseReplyError, setCaseReplyError] = useState('')
  const [caseReplySuccess, setCaseReplySuccess] = useState('')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectPath =
        `${location.pathname}${location.search}${location.hash}`

      navigate(
        `/login?redirect=${encodeURIComponent(redirectPath)}`,
        { replace: true }
      )
    }
  }, [
    isAuthenticated,
    isLoading,
    location.hash,
    location.pathname,
    location.search,
    navigate,
  ])

  useEffect(() => {
    if (!isAuthenticated || !orderId) return

    let mounted = true

    async function loadOrder() {
      setIsOrderLoading(true)
      setErrorMessage('')

      try {
        const response = await getCustomerOrder(orderId as string)

        if (mounted) {
          setOrder(response.order)
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load this order right now.'
          )
        }
      } finally {
        if (mounted) {
          setIsOrderLoading(false)
        }
      }
    }

    loadOrder()

    return () => {
      mounted = false
    }
  }, [isAuthenticated, orderId])

  useEffect(() => {
    if (!order) return

    setOrderCases([])
    setCaseCanCreate(null)
    setIsCaseProgressOpen(false)
    setCaseReplyMessage('')
    setCaseReplyPhotos([])
    setCaseReplyError('')
    setCaseReplySuccess('')

    void loadOrderCases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id])

  const progressSteps = useMemo(() => {
    return order ? getProgressSteps(order) : []
  }, [order])

  const itemCount = useMemo(() => {
    return (order?.items || []).reduce((total, item) => {
      return total + Number(item.quantity || 0)
    }, 0)
  }, [order])

  const orderStoreGroups = useMemo(() => {
    return groupOrderItemsByStore(order?.items || [])
  }, [order])

  const requestedItemId = useMemo(() => {
    const queryItem =
      new URLSearchParams(location.search)
        .get('item')
        ?.trim()

    if (queryItem) {
      return queryItem
    }

    const hashMatch =
      location.hash.match(/^#item-(.+)$/)

    if (!hashMatch?.[1]) {
      return ''
    }

    try {
      return decodeURIComponent(hashMatch[1])
    } catch {
      return hashMatch[1]
    }
  }, [location.hash, location.search])

  useEffect(() => {
    if (!order || !requestedItemId) {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(
        `item-${requestedItemId}`
      )

      if (!target) {
        return
      }

      setHighlightedItemId(requestedItemId)

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })

    const highlightTimeout = window.setTimeout(() => {
      setHighlightedItemId((current) =>
        current === requestedItemId ? '' : current
      )
    }, 5000)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(highlightTimeout)
    }
  }, [order, requestedItemId])

  const caseDescriptionWordCount = useMemo(() => {
    return countWords(caseDescription)
  }, [caseDescription])

  const casePhotoPreviews = useMemo(() => {
    return casePhotos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
  }, [casePhotos])

  const existingOrderCase = useMemo(() => {
    return orderCases[0] || null
  }, [orderCases])

  const caseReplyWordCount = useMemo(() => {
    return countWords(caseReplyMessage)
  }, [caseReplyMessage])

  const caseReplyPhotoPreviews = useMemo(() => {
    return caseReplyPhotos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }))
  }, [caseReplyPhotos])

  useEffect(() => {
    return () => {
      for (const preview of casePhotoPreviews) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [casePhotoPreviews])

  useEffect(() => {
    return () => {
      for (const preview of caseReplyPhotoPreviews) {
        URL.revokeObjectURL(preview.url)
      }
    }
  }, [caseReplyPhotoPreviews])

  useEffect(() => {
    if (!isCaseModalOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isCaseModalOpen])

  async function loadOrderCases(
    options: { silent?: boolean } = {}
  ) {
    if (!order) return

    if (!options.silent) {
      setIsCaseDataLoading(true)
    }

    setCaseError('')

    try {
      const response = await getCustomerOrderCases(order.id)
      const nextCases = response.cases || []

      setOrderCases(nextCases)
      setCaseReasonOptions(response.reasonOptions || [])

      setCaseCanCreate(
        typeof response.canCreateCase === 'boolean'
          ? response.canCreateCase
          : nextCases.length === 0 &&
              Boolean(response.eligibility?.canOpenCase)
      )

      if (
        response.reasonOptions?.length &&
        !response.reasonOptions.some(
          (option) => option.value === caseReason
        )
      ) {
        setCaseReason(response.reasonOptions[0].value)
      }
    } catch (error) {
      setCaseError(
        error instanceof Error
          ? error.message
          : 'Unable to load order case information.'
      )
    } finally {
      if (!options.silent) {
        setIsCaseDataLoading(false)
      }
    }
  }

  async function openOrderCaseModal() {
    setCaseError('')
    setCaseSuccessNumber('')

    if (existingOrderCase) {
      setIsCaseProgressOpen(true)
      await loadOrderCases({ silent: true })
      return
    }

    setIsCaseModalOpen(true)
    await loadOrderCases()
  }

  function closeOrderCaseModal() {
    if (isCaseSubmitting) return

    setIsCaseModalOpen(false)
    setCaseError('')
    setCaseSuccessNumber('')
  }

  function handleCasePhotos(files: FileList | null) {
    if (!files) return

    setCaseError('')

    const selected = Array.from(files)
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])

    const invalidType = selected.find((file) => !allowedTypes.has(file.type))
    if (invalidType) {
      setCaseError('Only JPG, PNG and WebP photos are allowed.')
      return
    }

    const oversized = selected.find((file) => file.size > 5 * 1024 * 1024)
    if (oversized) {
      setCaseError(`${oversized.name} is larger than 5 MB.`)
      return
    }

    if (casePhotos.length + selected.length > 5) {
      setCaseError('You can attach a maximum of 5 photos.')
      return
    }

    setCasePhotos((current) => [...current, ...selected])
  }

  function removeCasePhoto(index: number) {
    setCasePhotos((current) =>
      current.filter((_, photoIndex) => photoIndex !== index)
    )
  }

  function handleCaseReplyPhotos(
    files: FileList | null
  ) {
    if (!files) return

    setCaseReplyError('')

    const selected = Array.from(files)
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
    ])

    const invalidType = selected.find(
      (file) => !allowedTypes.has(file.type)
    )

    if (invalidType) {
      setCaseReplyError(
        'Only JPG, PNG and WebP photos are allowed.'
      )
      return
    }

    const oversized = selected.find(
      (file) => file.size > 5 * 1024 * 1024
    )

    if (oversized) {
      setCaseReplyError(
        `${oversized.name} is larger than 5 MB.`
      )
      return
    }

    if (
      caseReplyPhotos.length + selected.length > 5
    ) {
      setCaseReplyError(
        'You can attach a maximum of 5 photos.'
      )
      return
    }

    setCaseReplyPhotos((current) => [
      ...current,
      ...selected,
    ])
  }

  function removeCaseReplyPhoto(index: number) {
    setCaseReplyPhotos((current) =>
      current.filter(
        (_, photoIndex) => photoIndex !== index
      )
    )
  }

  async function submitCaseReply() {
    if (!existingOrderCase) return

    setCaseReplyError('')
    setCaseReplySuccess('')

    if (!existingOrderCase.canReply) {
      setCaseReplyError(
        'You can provide more information after DigitalHood Support replies.'
      )
      return
    }

    if (caseReplyMessage.trim().length < 2) {
      setCaseReplyError(
        'Enter the additional information.'
      )
      return
    }

    if (caseReplyWordCount > 200) {
      setCaseReplyError(
        'Your reply must not exceed 200 words.'
      )
      return
    }

    setIsCaseReplySubmitting(true)

    try {
      await replyToCustomerOrderCase(
        existingOrderCase.caseNumber,
        {
          message: caseReplyMessage.trim(),
          photos: caseReplyPhotos,
        }
      )

      setCaseReplyMessage('')
      setCaseReplyPhotos([])
      setCaseReplySuccess(
        'Your information was sent to DigitalHood Support.'
      )

      await loadOrderCases({ silent: true })
    } catch (error) {
      setCaseReplyError(
        error instanceof Error
          ? error.message
          : 'Unable to send the additional information.'
      )
    } finally {
      setIsCaseReplySubmitting(false)
    }
  }

  async function submitOrderCase() {
    if (!order) return

    setCaseError('')
    setCaseSuccessNumber('')

    if (!caseReason) {
      setCaseError('Select the issue affecting this order.')
      return
    }

    if (caseDescription.trim().length < 10) {
      setCaseError('Describe the issue using at least 10 characters.')
      return
    }

    if (caseDescriptionWordCount > 200) {
      setCaseError('Your description must not exceed 200 words.')
      return
    }

    setIsCaseSubmitting(true)

    try {
      const response = await createCustomerOrderCase(order.id, {
        reason: caseReason,
        description: caseDescription.trim(),
        itemId: caseItemId || undefined,
        photos: casePhotos,
        pageUrl: window.location.href,
      })

      setCaseSuccessNumber(response.caseNumber)
      setCaseDescription('')
      setCaseItemId('')
      setCasePhotos([])

      const refreshed = await getCustomerOrderCases(order.id)
      setOrderCases(refreshed.cases || [])
      setCaseReasonOptions(refreshed.reasonOptions || [])
      setCaseCanCreate(false)
      setIsCaseProgressOpen(true)
    } catch (error) {
      setCaseError(
        error instanceof Error
          ? error.message
          : 'Unable to create this order case.'
      )
    } finally {
      setIsCaseSubmitting(false)
    }
  }

  if (isLoading || isOrderLoading) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-dh-primary" />

            <h1 className="font-display text-xl font-bold text-dh-primary">
              Loading order details
            </h1>

            <p className="mt-2 text-sm text-dh-dark-gray">
              Please wait while we prepare your order information.
            </p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  if (errorMessage || !order) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="py-12">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />

              <h1 className="font-display text-2xl font-bold text-dh-primary">
                Order not available
              </h1>

              <p className="mt-3 text-dh-dark-gray">
                {errorMessage || 'We could not load this order.'}
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/orders">
                  <Button className="rounded-full bg-dh-primary text-white hover:bg-dh-secondary">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to orders
                  </Button>
                </Link>

                <Link to="/track-order">
                  <Button
                    variant="outline"
                    className="rounded-full border-dh-primary text-dh-primary hover:bg-dh-primary hover:text-white"
                  >
                    Track by order number
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-8 lg:py-12">
        <div className="container mx-auto px-4">
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <Link to="/account" className="hover:text-dh-primary">
              My Account
            </Link>

            <ChevronRight className="h-4 w-4" />

            <Link to="/orders" className="hover:text-dh-primary">
              My Orders
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-medium text-dh-primary">
              #{order.number || order.id}
            </span>
          </nav>

          <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <Link
                  to="/orders"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:text-dh-secondary"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to orders
                </Link>

                <span className="inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                  <ReceiptText className="h-4 w-4" />
                  Order #{order.number || order.id}
                </span>
              </div>

              <div className="rounded-3xl bg-dh-gray p-5">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-dh-primary">
                  <PackageCheck className="h-3.5 w-3.5" />
                  Current status
                </div>

                <h1 className="font-display text-2xl font-bold leading-tight text-dh-primary sm:text-3xl">
                  {getStatusTitle(order.status)}
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-dh-dark-gray">
                  Placed on {formatDate(order.dateCreated)}.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-dh-light-gray bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                    Status
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {order.statusLabel || order.status}
                  </span>
                </div>

                <div className="rounded-2xl border border-dh-light-gray bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                    Items
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-dh-primary">
                    {itemCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-dh-light-gray bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                    Total
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-dh-primary">
                    {formatPrice(order.total, order.currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
                  <Truck className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-dh-primary">
                    Delivery summary
                  </h2>

                  <p className="mt-1 text-sm text-dh-dark-gray">
                    Estimated delivery and next steps for this order.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-dh-gray p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                    Expected delivery
                  </p>

                  <p className="mt-1 font-display text-lg font-bold text-dh-primary">
                    {order.deliveryEstimate?.label || 'Not available yet'}
                  </p>

                  <p className="mt-1 text-sm text-dh-dark-gray">
                    {order.deliveryEstimate?.window ||
                      'Delivery details will update as your order progresses.'}
                  </p>
                </div>

                <div className="rounded-2xl bg-green-50 p-4 text-green-800">
                  <p className="text-sm font-semibold">What happens next</p>

                  <p className="mt-1 text-sm text-green-700">
                    {getNextStepMessage(order.status)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-dh-gray p-4 text-sm text-dh-dark-gray">
                <p className="font-semibold text-dh-primary">
                  Delivery schedule
                </p>

                <p className="mt-1">
                  Deliveries are handled Monday to Saturday, depending on your
                  location and order confirmation time.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <DetailCard
                icon={<PackageCheck className="h-6 w-6" />}
                title="Order progress"
              >
                <div className="space-y-4">
                  {progressSteps.map((step, index) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                            step.done
                              ? 'border-green-600 bg-green-600 text-white'
                              : 'border-gray-300 bg-white text-gray-400'
                          }`}
                        >
                          {step.done ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>

                        {index < progressSteps.length - 1 && (
                          <div
                            className={`mt-2 h-8 w-0.5 ${
                              progressSteps[index + 1].done
                                ? 'bg-green-600'
                                : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </div>

                      <div className="pb-4">
                        <p className="font-semibold text-dh-primary">
                          {step.label}
                        </p>

                        <p className="text-sm text-dh-dark-gray">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DetailCard>

              <DetailCard
                icon={<ShoppingBag className="h-6 w-6" />}
                title="Items in this order"
              >
                <div className="space-y-4">
                  {orderStoreGroups.map((group) => (
                    <section
                      key={group.key}
                      className="overflow-hidden rounded-2xl border border-dh-light-gray bg-white"
                    >
                      <Link
                        to={group.sellerUrl}
                        className="flex items-center justify-between gap-3 border-b border-dh-light-gray bg-dh-gray px-3 py-2.5 transition hover:bg-white"
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[10px] font-black text-dh-primary">
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
                            <span className="block truncate text-[11px] font-bold leading-tight text-green-700">
                              {group.feedbackText}
                            </span>
                          </span>
                        </span>

                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-dh-primary">
                          {formatPrice(group.subtotal, order.currency)}
                        </span>
                      </Link>

                      <div className="divide-y divide-dh-light-gray">
                        {group.items.map((item) => {
                          const metaLines = getItemMetaText(item)
                          const itemId = String(item.id)
                          const itemDomId = `item-${itemId}`
                          const isHighlighted =
                            highlightedItemId === itemId

                          return (
                            <article
                              id={itemDomId}
                              key={item.id}
                              data-order-item-id={itemId}
                              className={`scroll-mt-28 grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-3 transition-all duration-500 ${
                                isHighlighted
                                  ? 'relative z-10 rounded-2xl bg-amber-50 ring-2 ring-dh-secondary shadow-lg'
                                  : ''
                              }`}
                            >
                              <img
                                src={item.image || '/logo.jpg'}
                                alt={item.name}
                                className="h-16 w-16 shrink-0 rounded-xl bg-dh-gray object-contain p-1.5"
                                onError={(event) => {
                                  event.currentTarget.src = '/logo.jpg'
                                }}
                              />

                              <div className="min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-black leading-tight text-dh-primary">
                                      {item.name}
                                    </p>

                                    {metaLines.length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        {metaLines.slice(0, 2).map((line) => (
                                          <p
                                            key={line}
                                            className="line-clamp-1 text-[11px] text-dh-dark-gray"
                                          >
                                            {line}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <p className="shrink-0 text-right text-sm font-black text-dh-primary">
                                    {formatPrice(item.total, order.currency)}
                                  </p>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <span className="rounded-full bg-dh-gray px-2.5 py-1 text-[11px] font-black text-dh-primary">
                                    Qty {item.quantity}
                                  </span>
                                </div>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              </DetailCard>
            </div>

            <aside className="space-y-6">
              <DetailCard icon={<CreditCard className="h-6 w-6" />} title="Payment">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-dh-gray p-4">
                    <span className="text-dh-dark-gray">Method</span>
                    <span className="font-semibold text-dh-primary">
                      {order.paymentMethodTitle || 'Not specified'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-dh-gray p-4">
                    <span className="text-dh-dark-gray">Total</span>
                    <span className="font-semibold text-dh-primary">
                      {formatPrice(order.total, order.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-dh-gray p-4">
                    <span className="text-dh-dark-gray">Payment status</span>
                    <span className="text-right font-semibold text-dh-primary">
                      {order.datePaid
                        ? `Confirmed · ${formatDate(order.datePaid)}`
                        : normalizeStatus(order.status) === 'processing'
                          ? 'Approved for processing'
                          : 'Not confirmed yet'}
                    </span>
                  </div>
                </div>
              </DetailCard>

              <DetailCard
                icon={<MapPin className="h-6 w-6" />}
                title="Delivery address"
              >
                <div className="space-y-2 text-sm text-dh-dark-gray">
                  <p className="font-semibold text-dh-primary">
                    {[order.shipping?.firstName, order.shipping?.lastName]
                      .filter(Boolean)
                      .join(' ') || 'Customer'}
                  </p>

                  {order.billing?.phone && (
                    <p>{order.billing.phone}</p>
                  )}

                  <p>{order.shipping?.address1 || 'Address not available'}</p>

                  {order.shipping?.address2 && <p>{order.shipping.address2}</p>}

                  <p>
                    {[order.shipping?.city, order.shipping?.province]
                      .filter(Boolean)
                      .join(', ') || 'Location not available'}
                  </p>

                  {order.shipping?.postcode && <p>{order.shipping.postcode}</p>}
                </div>

                <div className="mt-4 rounded-2xl bg-dh-gray p-4 text-sm">
                  <p className="font-semibold text-dh-primary">
                    Expected delivery
                  </p>

                  <p className="mt-1 text-dh-dark-gray">
                    {order.deliveryEstimate?.label || 'Not available yet'}
                  </p>

                  {order.deliveryEstimate?.window && (
                    <p className="mt-1 text-xs text-dh-dark-gray">
                      {order.deliveryEstimate.window}
                    </p>
                  )}
                </div>
              </DetailCard>

              <DetailCard
                icon={<CalendarDays className="h-6 w-6" />}
                title="Order dates"
              >
                <div className="space-y-3 text-sm">
                  <div className="rounded-2xl bg-dh-gray p-4">
                    <p className="text-dh-dark-gray">Placed</p>
                    <p className="mt-1 font-semibold text-dh-primary">
                      {formatDate(order.dateCreated)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-dh-gray p-4">
                    <p className="text-dh-dark-gray">Payment confirmed</p>
                    <p className="mt-1 font-semibold text-dh-primary">
                      {formatDate(order.datePaid)}
                    </p>
                  </div>
                </div>
              </DetailCard>

              <DetailCard
                icon={<ShieldCheck className="h-6 w-6" />}
                title={
                  existingOrderCase
                    ? 'Support case'
                    : 'Order case'
                }
              >
                {existingOrderCase ? (
                  <div>
                    <div className="rounded-2xl border border-dh-light-gray bg-dh-gray p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-dh-dark-gray">
                            Case number
                          </p>

                          <p className="mt-1 font-display text-lg font-bold text-dh-primary">
                            {existingOrderCase.caseNumber}
                          </p>

                          <p className="mt-2 text-sm font-semibold text-dh-primary">
                            {existingOrderCase.reasonLabel ||
                              existingOrderCase.subject ||
                              'Order support issue'}
                          </p>
                        </div>

                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCaseStatusStyle(
                            existingOrderCase.status
                          )}`}
                        >
                          {getCaseStatusLabel(
                            existingOrderCase.status
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-dh-dark-gray">
                        Opened{' '}
                        {formatDate(
                          existingOrderCase.createdAt
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCaseProgressOpen(
                          (current) => !current
                        )

                        if (!isCaseProgressOpen) {
                          void loadOrderCases({
                            silent: true,
                          })
                        }
                      }}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-dh-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-dh-secondary"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      {isCaseProgressOpen
                        ? 'Hide case progress'
                        : 'Check case progress'}
                    </button>

                    <Link
                      to="/account/support-cases"
                      className="mt-3 inline-flex w-full items-center justify-center text-sm font-semibold text-dh-primary hover:text-dh-secondary"
                    >
                      View all support cases
                    </Link>

                    {isCaseProgressOpen && (
                      <div className="mt-5 space-y-4 border-t border-dh-light-gray pt-5">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-dh-dark-gray">
                              Last updated
                            </p>

                            <p className="mt-1 text-sm font-semibold text-dh-primary">
                              {formatDate(
                                existingOrderCase.updatedAt ||
                                  existingOrderCase.createdAt
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void loadOrderCases({
                                silent: true,
                              })
                            }
                            className="rounded-full bg-dh-gray p-2.5 text-dh-primary hover:bg-dh-secondary/20"
                            aria-label="Refresh case progress"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="rounded-2xl bg-dh-gray p-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-dh-dark-gray">
                            Your original report
                          </p>

                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-dh-primary">
                            {existingOrderCase.message ||
                              'No description available.'}
                          </p>
                        </div>

                        {!!existingOrderCase.attachments?.length && (
                          <div>
                            <p className="text-sm font-bold text-dh-primary">
                              Original evidence
                            </p>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {existingOrderCase.attachments.map(
                                (attachment, index) => (
                                  <a
                                    key={
                                      attachment.id ||
                                      attachment.filename ||
                                      index
                                    }
                                    href={getCaseAttachmentUrl(
                                      attachment
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="overflow-hidden rounded-xl border border-dh-light-gray bg-dh-gray"
                                  >
                                    <img
                                      src={getCaseAttachmentUrl(
                                        attachment
                                      )}
                                      alt={
                                        attachment.originalName ||
                                        `Case evidence ${index + 1}`
                                      }
                                      loading="lazy"
                                      className="aspect-square w-full object-cover"
                                    />
                                  </a>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-bold text-dh-primary">
                            Case conversation
                          </p>

                          <div className="mt-3 space-y-3">
                            {(existingOrderCase.messages || []).map(
                              (message, index) => {
                                const fromCustomer =
                                  message.direction ===
                                  'customer_to_admin'

                                return (
                                  <article
                                    key={
                                      message.id ||
                                      `${message.createdAt}-${index}`
                                    }
                                    className={`rounded-2xl p-4 ${
                                      fromCustomer
                                        ? 'ml-4 bg-dh-primary text-white'
                                        : 'mr-4 border border-dh-light-gray bg-white'
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <p
                                        className={`text-xs font-bold ${
                                          fromCustomer
                                            ? 'text-white'
                                            : 'text-dh-primary'
                                        }`}
                                      >
                                        {fromCustomer
                                          ? 'You'
                                          : 'DigitalHood Support'}
                                      </p>

                                      <p
                                        className={`text-[11px] ${
                                          fromCustomer
                                            ? 'text-white/70'
                                            : 'text-dh-dark-gray'
                                        }`}
                                      >
                                        {formatDate(
                                          message.createdAt
                                        )}
                                      </p>
                                    </div>

                                    <p
                                      className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${
                                        fromCustomer
                                          ? 'text-white'
                                          : 'text-dh-dark-gray'
                                      }`}
                                    >
                                      {message.message}
                                    </p>

                                    {!!message.attachments?.length && (
                                      <div className="mt-3 grid grid-cols-3 gap-2">
                                        {message.attachments.map(
                                          (
                                            attachment,
                                            attachmentIndex
                                          ) => (
                                            <a
                                              key={
                                                attachment.id ||
                                                attachment.filename ||
                                                attachmentIndex
                                              }
                                              href={getCaseAttachmentUrl(
                                                attachment
                                              )}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="overflow-hidden rounded-xl bg-white/90"
                                            >
                                              <img
                                                src={getCaseAttachmentUrl(
                                                  attachment
                                                )}
                                                alt="Additional case evidence"
                                                className="aspect-square w-full object-cover"
                                              />
                                            </a>
                                          )
                                        )}
                                      </div>
                                    )}
                                  </article>
                                )
                              }
                            )}

                            {!existingOrderCase.messages?.length && (
                              <div className="rounded-2xl bg-dh-gray p-4 text-center">
                                <Clock className="mx-auto h-6 w-6 text-dh-primary" />

                                <p className="mt-2 text-sm font-semibold text-dh-primary">
                                  DigitalHood is reviewing your case
                                </p>

                                <p className="mt-1 text-xs leading-5 text-dh-dark-gray">
                                  Replies and requests for additional
                                  information will appear here.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {caseReplyError && (
                          <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{caseReplyError}</p>
                          </div>
                        )}

                        {caseReplySuccess && (
                          <div className="flex items-start gap-2 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-semibold text-green-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <p>{caseReplySuccess}</p>
                          </div>
                        )}

                        {existingOrderCase.canReply ? (
                          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                            <p className="font-semibold text-orange-800">
                              DigitalHood needs more information
                            </p>

                            <p className="mt-1 text-xs leading-5 text-orange-700">
                              You may send one response now. After
                              submitting, replies will lock until
                              DigitalHood responds again.
                            </p>

                            <label className="mt-4 grid gap-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-bold text-dh-primary">
                                  Additional information
                                </span>

                                <span
                                  className={`text-xs font-bold ${
                                    caseReplyWordCount > 200
                                      ? 'text-red-600'
                                      : 'text-dh-dark-gray'
                                  }`}
                                >
                                  {caseReplyWordCount}/200 words
                                </span>
                              </div>

                              <textarea
                                value={caseReplyMessage}
                                onChange={(event) =>
                                  setCaseReplyMessage(
                                    event.target.value
                                  )
                                }
                                rows={5}
                                maxLength={4000}
                                placeholder="Answer DigitalHood's question or provide the requested information."
                                className="rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-dh-primary"
                              />
                            </label>

                            <label className="mt-4 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-orange-300 bg-white px-4 py-4 text-sm font-semibold text-dh-primary hover:border-dh-primary">
                              <ImagePlus className="mr-2 h-5 w-5" />
                              Add photos
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                onChange={(event) => {
                                  handleCaseReplyPhotos(
                                    event.target.files
                                  )
                                  event.currentTarget.value = ''
                                }}
                                className="hidden"
                              />
                            </label>

                            {!!caseReplyPhotoPreviews.length && (
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                {caseReplyPhotoPreviews.map(
                                  (preview, index) => (
                                    <div
                                      key={`${preview.file.name}-${index}`}
                                      className="relative overflow-hidden rounded-xl bg-white"
                                    >
                                      <img
                                        src={preview.url}
                                        alt={preview.file.name}
                                        className="aspect-square w-full object-cover"
                                      />

                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeCaseReplyPhoto(
                                            index
                                          )
                                        }
                                        className="absolute right-1 top-1 rounded-full bg-red-600 p-1 text-white"
                                        aria-label="Remove photo"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>

                                      <p className="truncate px-2 py-1 text-[10px] text-dh-dark-gray">
                                        {formatFileSize(
                                          preview.file.size
                                        )}
                                      </p>
                                    </div>
                                  )
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={submitCaseReply}
                              disabled={
                                isCaseReplySubmitting ||
                                !caseReplyMessage.trim() ||
                                caseReplyWordCount > 200
                              }
                              className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-dh-primary px-5 py-3 text-sm font-semibold text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {isCaseReplySubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending information...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send information
                                </>
                              )}
                            </button>
                          </div>
                        ) : isCaseClosed(
                            existingOrderCase.status
                          ) ? (
                          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                            <p className="font-semibold">
                              This case is{' '}
                              {getCaseStatusLabel(
                                existingOrderCase.status
                              ).toLowerCase()}
                              .
                            </p>

                            <p className="mt-1 text-xs leading-5">
                              The conversation remains available for
                              your records.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                            <p className="font-semibold">
                              DigitalHood is reviewing your case
                            </p>

                            <p className="mt-1 text-xs leading-5">
                              Additional information can be submitted
                              after DigitalHood Support replies.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-dh-dark-gray">
                      Open a case for this order if there is an issue
                      with payment, delivery, product condition, or
                      return and refund support.
                    </p>

                    <div className="mt-4 rounded-2xl bg-dh-gray p-4 text-sm">
                      <p className="font-semibold text-dh-primary">
                        Order reference
                      </p>

                      <p className="mt-1 text-dh-dark-gray">
                        #{order.number || order.id}
                      </p>

                      {order.caseEligibility?.deadline && (
                        <p className="mt-2 text-xs font-semibold text-dh-dark-gray">
                          Case window ends:{' '}
                          {formatDate(
                            order.caseEligibility.deadline
                          )}
                        </p>
                      )}
                    </div>

                    {isCaseDataLoading &&
                    caseCanCreate === null ? (
                      <div className="mt-4 flex items-center justify-center rounded-2xl bg-dh-gray p-4 text-sm font-semibold text-dh-primary">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking case status...
                      </div>
                    ) : caseCanCreate ? (
                      <button
                        type="button"
                        onClick={openOrderCaseModal}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-dh-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-dh-secondary"
                      >
                        Report an issue
                      </button>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-dh-dark-gray">
                        {order.caseEligibility?.reason ||
                          'Order cases are not available for this order right now.'}
                      </div>
                    )}
                  </div>
                )}
              </DetailCard>
            </aside>
          </section>
        </div>
      </main>

      {isCaseModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-case-title"
        >
          <button
            type="button"
            aria-label="Close order issue form"
            onClick={closeOrderCaseModal}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-dh-secondary">
                  Order #{order.number || order.id}
                </p>

                <h2
                  id="order-case-title"
                  className="mt-1 font-display text-2xl font-bold text-dh-primary"
                >
                  Report an order issue
                </h2>

                <p className="mt-1 text-sm text-dh-dark-gray">
                  Your account, order, payment and delivery information will be
                  attached automatically.
                </p>
              </div>

              <button
                type="button"
                onClick={closeOrderCaseModal}
                disabled={isCaseSubmitting}
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5 sm:p-7">
              {caseSuccessNumber ? (
                <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />

                  <h3 className="mt-4 text-xl font-bold text-green-800">
                    Your order case has been created
                  </h3>

                  <p className="mt-2 text-sm font-semibold text-green-700">
                    Case number
                  </p>

                  <p className="mt-1 text-2xl font-black text-dh-primary">
                    {caseSuccessNumber}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-green-700">
                    DigitalHood will review the order details and evidence attached
                    to this case.
                  </p>

                  <button
                    type="button"
                    onClick={closeOrderCaseModal}
                    className="mt-5 rounded-full bg-dh-primary px-6 py-3 text-sm font-bold text-white hover:bg-dh-secondary"
                  >
                    Done
                  </button>
                </div>
              ) : isCaseDataLoading ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-dh-primary" />
                  <p className="mt-4 text-sm font-semibold text-dh-dark-gray">
                    Loading issue options...
                  </p>
                </div>
              ) : (
                <>
                  {caseError && (
                    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{caseError}</p>
                    </div>
                  )}

                  <section>
                    <h3 className="text-sm font-bold text-dh-primary">
                      What happened?
                    </h3>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {caseReasonOptions.map((option) => {
                        const selected = caseReason === option.value

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setCaseReason(option.value)}
                            className={`rounded-2xl border p-4 text-left text-sm font-semibold transition ${
                              selected
                                ? 'border-dh-primary bg-dh-primary text-white shadow-md'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-dh-primary/40 hover:bg-slate-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {(order.items || []).length > 0 && (
                    <label className="grid gap-2">
                      <span className="text-sm font-bold text-dh-primary">
                        Which item is affected?
                      </span>

                      <select
                        value={caseItemId}
                        onChange={(event) => setCaseItemId(event.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-dh-primary"
                      >
                        <option value="">The whole order / not item-specific</option>

                        {(order.items || []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} × {item.quantity}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-dh-primary">
                        Describe the issue
                      </span>

                      <span
                        className={`text-xs font-bold ${
                          caseDescriptionWordCount > 200
                            ? 'text-red-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {caseDescriptionWordCount}/200 words
                      </span>
                    </div>

                    <textarea
                      value={caseDescription}
                      onChange={(event) => setCaseDescription(event.target.value)}
                      rows={6}
                      maxLength={4000}
                      placeholder="Briefly explain what happened, the condition of the item, and what resolution you need."
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-dh-primary"
                    />

                    <p className="text-xs leading-5 text-slate-500">
                      Keep the description clear and below 200 words. Do not enter
                      payment card details or passwords.
                    </p>
                  </label>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-dh-primary">
                          Add photos
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Up to 5 JPG, PNG or WebP photos. Maximum 5 MB each.
                        </p>
                      </div>

                      <span className="text-xs font-bold text-slate-400">
                        {casePhotos.length}/5
                      </span>
                    </div>

                    {casePhotos.length < 5 && (
                      <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-5 py-7 text-center transition hover:border-dh-primary/40 hover:bg-white">
                        <ImagePlus className="h-8 w-8 text-dh-primary" />

                        <span className="mt-3 text-sm font-bold text-dh-primary">
                          Choose evidence photos
                        </span>

                        <span className="mt-1 text-xs text-slate-500">
                          Photos of damage, wrong items or missing parts help with
                          review.
                        </span>

                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(event) => {
                            handleCasePhotos(event.target.files)
                            event.target.value = ''
                          }}
                          className="hidden"
                        />
                      </label>
                    )}

                    {casePhotoPreviews.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {casePhotoPreviews.map((preview, index) => (
                          <div
                            key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          >
                            <div className="aspect-square bg-slate-100">
                              <img
                                src={preview.url}
                                alt={`Evidence ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2 p-3">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {preview.file.name}
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {formatFileSize(preview.file.size)}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeCasePhoto(index)}
                                className="shrink-0 rounded-full bg-red-50 p-2 text-red-600 hover:bg-red-100"
                                aria-label={`Remove ${preview.file.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {orderCases.length > 0 && (
                    <section className="rounded-3xl bg-slate-50 p-5">
                      <h3 className="text-sm font-bold text-dh-primary">
                        Previous cases for this order
                      </h3>

                      <div className="mt-3 space-y-3">
                        {orderCases.map((item) => (
                          <div
                            key={item.caseNumber}
                            className="rounded-2xl bg-white p-4 ring-1 ring-slate-100"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-bold text-dh-primary">
                                {item.caseNumber}
                              </p>

                              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase text-slate-500">
                                {item.status}
                              </span>
                            </div>

                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              {item.reasonLabel || item.subject || 'Order issue'}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Created {formatDate(item.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeOrderCaseModal}
                      disabled={isCaseSubmitting}
                      className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={submitOrderCase}
                      disabled={
                        isCaseSubmitting ||
                        !caseReason ||
                        caseDescription.trim().length < 10 ||
                        caseDescriptionWordCount > 200
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-dh-primary px-7 py-3 text-sm font-bold text-white transition hover:bg-dh-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCaseSubmitting && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}

                      {isCaseSubmitting
                        ? 'Submitting case...'
                        : 'Submit order case'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
