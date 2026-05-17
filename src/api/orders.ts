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

  let data: any = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      data?.details ||
      data?.error ||
      data?.message ||
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