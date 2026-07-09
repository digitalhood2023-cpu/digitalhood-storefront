import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
  lookupCustomerOrder,
  type CustomerOrder,
  type CustomerOrderItem,
} from '@/api/orders'

import { groupOrderItemsByStore } from '@/lib/orderStoreOwnership'

import { buildOrderSupportUrl } from '@/lib/supportLinks'
type DeliveryDetails = {
  expectedDate?: string | null
  label: string
  window: string
  isLusaka: boolean
  businessDays?: number
  skipDays?: string[]
}

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

function formatDeliveryDate(date?: Date | null) {
  if (!date) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return date.toDateString()
  }
}

function normalizeOrderStatus(status?: string) {
  return String(status || '')
    .toLowerCase()
    .replace(/^wc-/, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

function normalizeLocation(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isLusakaOrder(order: CustomerOrder) {
  const city = normalizeLocation(order.shipping?.city)
  const province = normalizeLocation(order.shipping?.province)
  const address = normalizeLocation(order.shipping?.address1)

  return (
    city.includes('lusaka') ||
    province.includes('lusaka') ||
    address.includes('lusaka')
  )
}

function isSunday(date: Date) {
  return date.getDay() === 0
}

function moveToNextDeliveryDay(date: Date) {
  const next = new Date(date)

  while (isSunday(next)) {
    next.setDate(next.getDate() + 1)
  }

  return next
}

function addDeliveryBusinessDays(startDate: Date, daysToAdd: number) {
  let current = moveToNextDeliveryDay(startDate)
  let addedDays = 0

  while (addedDays < daysToAdd) {
    current.setDate(current.getDate() + 1)

    if (!isSunday(current)) {
      addedDays += 1
    }
  }

  return moveToNextDeliveryDay(current)
}

function getDeliveryStartDate(order: CustomerOrder) {
  const sourceDate = order.datePaid || order.dateCreated

  if (!sourceDate) return null

  const parsed = new Date(sourceDate)

  if (Number.isNaN(parsed.getTime())) return null

  return parsed
}

function hasBackendDeliveryEstimate(order: CustomerOrder) {
  return Boolean(
    order.deliveryEstimate &&
      (order.deliveryEstimate.label ||
        order.deliveryEstimate.expectedDate ||
        order.deliveryEstimate.window)
  )
}

function getBackendDeliveryDetails(order: CustomerOrder): DeliveryDetails | null {
  if (!hasBackendDeliveryEstimate(order)) return null

  const backendEstimate = order.deliveryEstimate

  if (!backendEstimate) return null

  return {
    expectedDate: backendEstimate.expectedDate || null,
    label: backendEstimate.label || 'Expected delivery date not available yet',
    window:
      backendEstimate.window ||
      'Delivery estimate will appear after order confirmation.',
    isLusaka: Boolean(backendEstimate.isLusaka),
    businessDays: backendEstimate.businessDays,
    skipDays: backendEstimate.skipDays || ['Sunday'],
  }
}

function getFallbackExpectedDeliveryDetails(order: CustomerOrder): DeliveryDetails {
  const startDate = getDeliveryStartDate(order)

  if (!startDate) {
    return {
      expectedDate: null,
      label: 'Expected delivery date not available yet',
      window: 'Delivery estimate will appear after order confirmation.',
      isLusaka: isLusakaOrder(order),
      businessDays: isLusakaOrder(order) ? 0 : 3,
      skipDays: ['Sunday'],
    }
  }

  const lusaka = isLusakaOrder(order)
  const normalizedStartDate = moveToNextDeliveryDay(startDate)

  if (lusaka) {
    return {
      expectedDate: normalizedStartDate.toISOString(),
      label: formatDeliveryDate(normalizedStartDate),
      window: 'Same delivery business day in Lusaka, Monday to Saturday.',
      isLusaka: true,
      businessDays: 0,
      skipDays: ['Sunday'],
    }
  }

  const expectedDate = addDeliveryBusinessDays(normalizedStartDate, 3)

  return {
    expectedDate: expectedDate.toISOString(),
    label: formatDeliveryDate(expectedDate),
    window:
      'Estimated 3 delivery business days outside Lusaka, Monday to Saturday.',
    isLusaka: false,
    businessDays: 3,
    skipDays: ['Sunday'],
  }
}

function getExpectedDeliveryDetails(order: CustomerOrder): DeliveryDetails {
  return (
    getBackendDeliveryDetails(order) ||
    getFallbackExpectedDeliveryDetails(order)
  )
}

function getStatusStyles(status?: string) {
  const value = normalizeOrderStatus(status)

  if (value === 'processing') {
    return {
      icon: <PackageCheck className="h-5 w-5 text-blue-700" />,
      badge: 'bg-blue-50 text-blue-700 border-blue-100',
      title: 'Your order is being processed',
    }
  }

  if (value === 'shipped') {
    return {
      icon: <Truck className="h-5 w-5 text-purple-700" />,
      badge: 'bg-purple-50 text-purple-700 border-purple-100',
      title: 'Your order has been shipped',
    }
  }

  if (value === 'out-for-delivery' || value === 'outfordelivery') {
    return {
      icon: <Truck className="h-5 w-5 text-orange-700" />,
      badge: 'bg-orange-50 text-orange-700 border-orange-100',
      title: 'Your order is out for delivery',
    }
  }

  if (value === 'delivered' || value === 'completed') {
    return {
      icon: <CheckCircle2 className="h-5 w-5 text-green-700" />,
      badge: 'bg-green-50 text-green-700 border-green-100',
      title: 'Your order has been delivered',
    }
  }

  if (value === 'pending' || value === 'on-hold') {
    return {
      icon: <Clock className="h-5 w-5 text-yellow-700" />,
      badge: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      title: 'Your order is waiting',
    }
  }

  if (value === 'failed' || value === 'cancelled' || value === 'refunded') {
    return {
      icon: <AlertCircle className="h-5 w-5 text-red-700" />,
      badge: 'bg-red-50 text-red-700 border-red-100',
      title: 'Your order needs attention',
    }
  }

  return {
    icon: <PackageCheck className="h-5 w-5 text-gray-700" />,
    badge: 'bg-gray-50 text-gray-700 border-gray-100',
    title: 'Order found',
  }
}

function getProgressSteps(order: CustomerOrder) {
  const status = normalizeOrderStatus(order.status)

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
        ? 'Payment is confirmed or order is approved.'
        : 'Waiting for payment confirmation.',
      done: paid,
    },
    {
      label: 'Processing',
      description:
        currentRank >= 2
          ? 'DigitalHood is preparing your order.'
          : 'Your order will move here after confirmation.',
      done: currentRank >= 2,
    },
    {
      label: 'Shipped',
      description:
        currentRank >= 3
          ? 'Your order has left the seller or DigitalHood dispatch point.'
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

function getItemMetaText(item: CustomerOrderItem) {
  const meta = item.meta || []

  const usefulMeta = meta
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

  return usefulMeta
}

export default function TrackOrderPage() {
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [order, setOrder] = useState<CustomerOrder | null>(null)

  const handleLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage('')
    setOrder(null)

    if (!email.trim()) {
      setErrorMessage('Please enter the email address used for the order.')
      return
    }

    if (!orderNumber.trim()) {
      setErrorMessage('Please enter your order number.')
      return
    }

    setIsLoading(true)

    try {
      const response = await lookupCustomerOrder({
        email: email.trim(),
        orderNumber: orderNumber.trim(),
      })

      setOrder(response.order)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not find that order. Please check your details and try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const statusStyles = order ? getStatusStyles(order.status) : null
  const progressSteps = order ? getProgressSteps(order) : []
  const deliveryDetails = order ? getExpectedDeliveryDetails(order) : null
  const orderStoreGroups = groupOrderItemsByStore(order?.items || [])

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

            <span className="font-medium text-dh-primary">
              Track Order
            </span>
          </nav>

          <div className="mx-auto max-w-5xl">
            <section className="mb-8 overflow-hidden rounded-3xl bg-white">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-6 sm:p-8 lg:p-10">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-dh-secondary/15 px-4 py-2 text-sm font-semibold text-dh-primary">
                    <PackageCheck className="h-4 w-4" />
                    DigitalHood Order Tracking
                  </div>

                  <h1 className="font-display text-3xl font-bold text-dh-primary lg:text-4xl">
                    Track your order
                  </h1>

                  <p className="mt-3 max-w-2xl text-dh-dark-gray">
                    Enter the email address used at checkout and your order number
                    to see payment, processing, shipping, delivery, and expected
                    delivery details.
                  </p>

                  <form onSubmit={handleLookup} className="mt-8 grid gap-4">
                    <div>
                      <Label htmlFor="orderEmail">Email address</Label>

                      <div className="relative mt-1">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                        <Input
                          id="orderEmail"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          placeholder="you@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="orderNumber">Order number</Label>

                      <div className="relative mt-1">
                        <ReceiptText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                        <Input
                          id="orderNumber"
                          value={orderNumber}
                          onChange={(event) =>
                            setOrderNumber(event.target.value)
                          }
                          placeholder="e.g. 1234 or #1234"
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {errorMessage && (
                      <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                        <div className="flex gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                          <p>{errorMessage}</p>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 rounded-xl bg-dh-primary text-white hover:bg-dh-secondary disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {isLoading ? (
                        'Checking order...'
                      ) : (
                        <>
                          <Search className="mr-2 h-5 w-5" />
                          Track Order
                        </>
                      )}
                    </Button>
                  </form>
                </div>

                <div className="bg-dh-primary p-6 text-white sm:p-8 lg:p-10">
                  <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
                    <ShieldCheck className="mb-4 h-10 w-10 text-dh-secondary" />

                    <h2 className="font-display text-xl font-bold">
                      Buyer confidence
                    </h2>

                    <p className="mt-2 text-sm text-white/80">
                      DigitalHood tracks order status from checkout to payment
                      confirmation, dispatch, and delivery.
                    </p>

                    <div className="mt-6 grid gap-4 text-sm">
                      <div className="flex gap-3">
                        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                        <div>
                          <p className="font-semibold">Payment visibility</p>
                          <p className="text-white/70">
                            See whether your order is awaiting payment,
                            processing, shipped, or delivered.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                        <div>
                          <p className="font-semibold">Delivery tracking</p>
                          <p className="text-white/70">
                            View shipping progress and expected delivery dates.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                        <div>
                          <p className="font-semibold">Smart delivery dates</p>
                          <p className="text-white/70">
                            Delivery estimates count Monday to Saturday and skip Sundays.
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />
                        <div>
                          <p className="font-semibold">Order items</p>
                          <p className="text-white/70">
                            Confirm the products and quantities in your order.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {order && statusStyles && deliveryDetails && (
              <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl bg-white p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-dh-dark-gray">
                          Order #{order.number || order.id}
                        </p>

                        <h2 className="font-display mt-1 text-2xl font-bold text-dh-primary">
                          {statusStyles.title}
                        </h2>
                      </div>

                      <div
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles.badge}`}
                      >
                        {statusStyles.icon}
                        {order.statusLabel || order.status}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-2xl bg-dh-gray p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-dh-dark-gray">
                          Order total
                        </p>
                        <p className="mt-1 font-display text-xl font-bold text-dh-primary">
                          {formatPrice(order.total, order.currency)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-dh-gray p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-dh-dark-gray">
                          Payment
                        </p>
                        <p className="mt-1 font-semibold text-dh-primary">
                          {order.paymentMethodTitle || 'Not specified'}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-dh-gray p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-dh-dark-gray">
                          Created
                        </p>
                        <p className="mt-1 font-semibold text-dh-primary">
                          {formatDate(order.dateCreated)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-dh-secondary/15 p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-dh-dark-gray">
                          Expected delivery
                        </p>
                        <p className="mt-1 font-semibold text-dh-primary">
                          {deliveryDetails.label}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-dh-light-gray bg-white p-4">
                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />

                        <div>
                          <p className="font-semibold text-dh-primary">
                            Expected delivery date
                          </p>

                          <p className="mt-1 text-sm text-dh-dark-gray">
                            {deliveryDetails.label}
                          </p>

                          <p className="mt-1 text-xs text-dh-dark-gray">
                            {deliveryDetails.window}
                          </p>

                          <p className="mt-2 text-xs text-dh-dark-gray">
                            Delivery business days are counted Monday to Saturday.
                            Sundays are skipped automatically.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <h3 className="font-display mb-4 text-lg font-bold text-dh-primary">
                        Order progress
                      </h3>

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
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-6 sm:p-8">
                    <h3 className="font-display mb-5 text-lg font-bold text-dh-primary">
                      Items in this order
                    </h3>

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

                              return (
                                <article
                                  key={item.id}
                                  className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 p-3"
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
                  </div>
                </div>

                <aside className="space-y-6">
                  <div className="rounded-3xl bg-white p-6">
                    <h3 className="font-display mb-4 text-lg font-bold text-dh-primary">
                      Delivery details
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div className="flex gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />

                        <div>
                          <p className="font-semibold text-dh-primary">
                            Delivery address
                          </p>

                          <p className="text-dh-dark-gray">
                            {order.shipping?.address1 || 'Address not available'}
                          </p>

                          {order.shipping?.address2 && (
                            <p className="text-dh-dark-gray">
                              {order.shipping.address2}
                            </p>
                          )}

                          <p className="text-dh-dark-gray">
                            {[order.shipping?.city, order.shipping?.province]
                              .filter(Boolean)
                              .join(', ') || 'Location not available'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Truck className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />

                        <div>
                          <p className="font-semibold text-dh-primary">
                            Shipping method
                          </p>

                          {(order.shippingLines || []).length > 0 ? (
                            (order.shippingLines || []).map((line) => (
                              <p
                                key={line.id || line.methodTitle}
                                className="text-dh-dark-gray"
                              >
                                {line.methodTitle || 'Delivery'} ·{' '}
                                {formatPrice(line.total, order.currency)}
                              </p>
                            ))
                          ) : (
                            <p className="text-dh-dark-gray">
                              Delivery details are being prepared.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-dh-secondary" />

                        <div>
                          <p className="font-semibold text-dh-primary">
                            Expected delivery
                          </p>

                          <p className="text-dh-dark-gray">
                            {deliveryDetails.label}
                          </p>

                          <p className="mt-1 text-xs text-dh-dark-gray">
                            {deliveryDetails.isLusaka
                              ? 'Lusaka same-day delivery runs Monday to Saturday.'
                              : 'Outside Lusaka deliveries are counted Monday to Saturday.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-white p-6">
                    <h3 className="font-display mb-4 text-lg font-bold text-dh-primary">
                      Order case
                    </h3>

                    <p className="text-sm text-dh-dark-gray">
                      Open a case for this order if there is an issue with payment,
                      delivery, product condition, or return/refund support.
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
                          Case window ends: {formatDate(order.caseEligibility.deadline)}
                        </p>
                      )}
                    </div>

                    {order.caseEligibility?.canOpenCase ? (
                      <Link
                        to={buildOrderSupportUrl(order)}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-dh-primary px-5 py-3 text-sm font-semibold text-white hover:bg-dh-secondary"
                      >
                        Open Order Case
                      </Link>
                    ) : (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-dh-dark-gray">
                        {order.caseEligibility?.reason || 'Order cases are not available for this order right now.'}
                      </div>
                    )}
                  </div>
                </aside>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
