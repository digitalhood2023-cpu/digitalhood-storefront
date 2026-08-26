const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

export type CustomerOrderItemMeta = {
  key?: string
  value?: unknown
  displayKey?: string
  displayValue?: string
}

export type CustomerOrderItem = {
  id: number
  productId?: number
  variationId?: number
  name: string
  quantity: number
  subtotal?: string
  total?: string
  sku?: string
  image?: string
  meta?: CustomerOrderItemMeta[]
}

export type CustomerOrderShippingLine = {
  id?: number
  methodTitle?: string
  total?: string
}

export type CustomerOrderFeeLine = {
  id?: number
  name?: string
  total?: string
  tax?: string
}

export type CustomerOrderCouponLine = {
  id?: number
  code?: string
  discount?: string
  discountTax?: string
}

export type CustomerOrderDeliveryEstimate = {
  expectedDate?: string
  label?: string
  window?: string
  isLusaka?: boolean
  businessDays?: number
  skipDays?: string[]
}

export type CustomerOrderCaseEligibility = {
  canOpenCase: boolean
  reasonCode?: string
  reason?: string
  caseWindowDays?: number
  opensAt?: string | null
  deadline?: string | null
  deliveredAt?: string | null
  final?: boolean
}

export type CustomerOrderPaymentRetry = {
  eligible: boolean
  method?: 'card' | 'mobile' | null
  lifecycle?: 'awaiting-verification' | 'pay-now' | 'paid' | 'closed' | 'expired' | 'cash-on-delivery' | 'unavailable' | string
  reasonCode?: string
  message?: string
  verificationDeadline?: string | null
  verificationRemainingSeconds?: number
  recoveryStartedAt?: string | null
  deadline?: string | null
  remainingSeconds?: number
  windowHours?: number
}

export type CustomerOrderInventoryReservation = {
  state: 'reserved' | 'released' | 'committed' | 'unavailable' | string
  reserved: boolean
  reservedAt?: string | null
  releasesAt?: string | null
  releasedAt?: string | null
  message?: string
}

export type CustomerOrderRecoveryAccess = {
  token: string
  expiresAt?: string | null
  url?: string
}

export type CustomerOrderMarketplaceState = {
  key: string
  category: 'in-progress' | 'shipped' | 'delivered' | 'closed' | string
  label: string
  trackable: boolean
  closed: boolean
}

export type CustomerOrderDeliveryTracking = {
  key: 'preparing' | 'shipped' | 'out-for-delivery' | 'delivered' | 'delayed' | 'closed' | string
  label: string
  message: string
  expectedDate?: string | null
  expectedLabel?: string | null
  deliveredAt?: string | null
  delayed: boolean
  live: boolean
  lastUpdatedAt?: string | null
}

export type CustomerOrder = {
  id: number
  number: string
  status: string
  statusLabel: string
  dateCreated?: string
  datePaid?: string | null
  currency?: string
  total?: string
  subtotal?: string
  discountTotal?: string
  shippingTotal?: string
  taxTotal?: string
  paymentMethod?: string
  paymentMethodTitle?: string
  transactionId?: string
  customerNote?: string
  deliveryEstimate?: CustomerOrderDeliveryEstimate
  caseEligibility?: CustomerOrderCaseEligibility
  paymentRetry?: CustomerOrderPaymentRetry
  inventoryReservation?: CustomerOrderInventoryReservation
  recoveryAccess?: CustomerOrderRecoveryAccess | null
  marketplaceState?: CustomerOrderMarketplaceState
  deliveryTracking?: CustomerOrderDeliveryTracking
  dateCompleted?: string | null
  billing?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  shipping?: {
    firstName?: string
    lastName?: string
    address1?: string
    address2?: string
    city?: string
    province?: string
    postcode?: string
    country?: string
  }
  shippingLines?: CustomerOrderShippingLine[]
  feeLines?: CustomerOrderFeeLine[]
  couponLines?: CustomerOrderCouponLine[]
  items?: CustomerOrderItem[]
}

export type LookupOrderResponse = {
  success: boolean
  order: CustomerOrder
}

type OrderErrorPayload = {
  details?: string
  error?: string
  message?: string
}

async function ordersFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  let data: T | OrderErrorPayload | null = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      (data as OrderErrorPayload | null)?.details ||
      (data as OrderErrorPayload | null)?.error ||
      (data as OrderErrorPayload | null)?.message ||
      `Order request failed with status ${response.status}`

    throw new Error(message)
  }

  return data as T
}

export function lookupCustomerOrder({
  email,
  orderNumber,
}: {
  email: string
  orderNumber: string
}) {
  return ordersFetch<LookupOrderResponse>('/api/orders/lookup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      orderNumber,
    }),
  })
}
