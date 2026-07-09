import type { SupportCaseType } from '@/api/support'

type OrderLike = {
  id?: string | number
  number?: string | number
  orderNumber?: string | number
  status?: string
  statusSlug?: string
  paymentMethodTitle?: string
}

function cleanValue(value: unknown) {
  return String(value || '').trim()
}

export function getOrderSupportType(order: OrderLike = {}): SupportCaseType {
  const status = cleanValue(order.status || order.statusSlug).toLowerCase()

  if (status === 'failed' || status === 'cancelled') {
    return 'PAYMENT_SUPPORT'
  }

  if (status === 'refunded') {
    return 'RETURN_REFUND'
  }

  if (status === 'out-for-delivery' || status === 'outfordelivery' || status === 'shipped' || status === 'delivered') {
    return 'DELIVERY_SUPPORT'
  }

  return 'ORDER_SUPPORT'
}

export function buildMarketplaceSupportUrl({
  type = 'ORDER_SUPPORT',
  orderNumber = '',
  subject = '',
  message = '',
  mode = 'create',
}: {
  type?: SupportCaseType
  orderNumber?: string | number
  subject?: string
  message?: string
  mode?: 'create' | 'track'
}) {
  const params = new URLSearchParams()

  params.set('mode', mode)
  params.set('type', type)

  if (orderNumber) {
    params.set('orderNumber', cleanValue(orderNumber))
  }

  if (subject) {
    params.set('subject', subject)
  }

  if (message) {
    params.set('message', message)
  }

  return `/support?${params.toString()}`
}

export function buildOrderSupportUrl(order: OrderLike = {}) {
  const orderNumber = cleanValue(order.number || order.orderNumber || order.id)
  const type = getOrderSupportType(order)
  const status = cleanValue(order.status || order.statusSlug)
  const readableOrder = orderNumber ? `#${orderNumber}` : 'this order'

  const subject =
    type === 'PAYMENT_SUPPORT'
      ? `Payment support for order ${readableOrder}`
      : type === 'RETURN_REFUND'
        ? `Return or refund support for order ${readableOrder}`
        : type === 'DELIVERY_SUPPORT'
          ? `Delivery support for order ${readableOrder}`
          : `Support for order ${readableOrder}`

  const message = [
    orderNumber ? `Order number: ${orderNumber}` : '',
    status ? `Current order status: ${status}` : '',
    order.paymentMethodTitle ? `Payment method: ${order.paymentMethodTitle}` : '',
    '',
    'Please explain what you need help with for this order.',
  ]
    .filter(Boolean)
    .join('\n')

  return buildMarketplaceSupportUrl({
    type,
    orderNumber,
    subject,
    message,
  })
}
