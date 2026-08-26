import type { AccountOrder } from '@/api/account'
import type { CustomerOrder } from '@/api/orders'

export type TrackableOrder = AccountOrder | CustomerOrder
export type TrackingCategory = 'all' | 'in-progress' | 'shipped' | 'delivered'

export function normalizeTrackingStatus(status?: string) {
  return String(status || '')
    .toLowerCase()
    .replace(/^wc-/, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

export function getTrackingState(order: TrackableOrder) {
  if (order.marketplaceState) return order.marketplaceState

  const status = normalizeTrackingStatus(order.status)
  const paidOrConfirmed = Boolean(order.datePaid) ||
    ['processing', 'shipped', 'out-for-delivery', 'delivered', 'completed'].includes(status)
  const retryEligible = Boolean(order.paymentRetry?.eligible)

  if (order.paymentRetry?.lifecycle === 'awaiting-verification') {
    return {
      key: 'awaiting-payment',
      category: 'in-progress',
      label: 'Awaiting payment',
      trackable: false,
      closed: false,
    }
  }

  if (retryEligible) {
    return {
      key: 'pay-now',
      category: 'in-progress',
      label: 'Pay now',
      trackable: false,
      closed: false,
    }
  }

  if (
    ['cancelled', 'canceled', 'failed', 'refunded', 'trash'].includes(status) ||
    order.paymentRetry?.reasonCode === 'PAYMENT_WINDOW_EXPIRED'
  ) {
    return {
      key: 'closed',
      category: 'closed',
      label: 'Closed',
      trackable: false,
      closed: true,
    }
  }

  if (['delivered', 'completed'].includes(status)) {
    return {
      key: 'delivered', category: 'delivered', label: 'Delivered', trackable: true, closed: false,
    }
  }

  if (['shipped', 'out-for-delivery', 'outfordelivery'].includes(status)) {
    return {
      key: status === 'shipped' ? 'shipped' : 'out-for-delivery',
      category: 'shipped',
      label: status === 'shipped' ? 'Shipped' : 'Out for delivery',
      trackable: true,
      closed: false,
    }
  }

  return {
    key: 'in-progress',
    category: 'in-progress',
    label: paidOrConfirmed ? 'In progress' : order.statusLabel || 'In progress',
    trackable: paidOrConfirmed,
    closed: false,
  }
}

export function formatOrderMoney(amount?: string | number, currency = 'ZMW') {
  const value = Number(amount || 0)

  return currency === 'ZMW'
    ? `K${value.toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatOrderDate(value?: string | null, withTime = false) {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    ...(withTime ? { timeStyle: 'short' as const } : {}),
  }).format(parsed)
}
