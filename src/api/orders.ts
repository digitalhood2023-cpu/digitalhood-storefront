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
  reasonCode?: string
  message?: string
  deadline?: string | null
  remainingSeconds?: number
  windowHours?: number
}

export type CustomerOrderMarketplaceState = {
  key: string
  category: 'in-progress' | 'shipped' | 'delivered' | 'closed' | string
  label: string
  trackable: boolean
  closed: boolean
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
  paymentMethod?: string
  paymentMethodTitle?: string
  transactionId?: string
  customerNote?: string
  deliveryEstimate?: CustomerOrderDeliveryEstimate
  caseEligibility?: CustomerOrderCaseEligibility
  paymentRetry?: CustomerOrderPaymentRetry
  marketplaceState?: CustomerOrderMarketplaceState
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
