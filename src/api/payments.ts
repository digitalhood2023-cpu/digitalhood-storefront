import { getAccountToken } from '@/api/account'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

type AddressPayload = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  state: string
  postcode: string
  country: string
  email?: string
  phone: string
  latitude?: number | null
  longitude?: number | null
  locationAccuracy?: number | null
  mapUrl?: string
}

type CreateOrderLineItem = {
  productId: number
  variationId?: number
  quantity: number
}

type CreateOrderPayload = {
  paymentMethod: 'mobile' | 'cod' | 'card' | 'lenco' | 'stripe'
  clientCheckoutId: string
  resumeCheckout?: boolean
  customer?: Record<string, unknown>
  billing: AddressPayload
  shipping: AddressPayload
  lineItems: CreateOrderLineItem[]
  shippingLines?: Array<{
    method_id: string
    method_title: string
    total: string
  }>
  couponLines?: Array<{
    code: string
  }>
  customerNote?: string
}

type CreateOrderResponse = {
  success: boolean
  order: {
    id: number
    number?: string
    status?: string
    currency?: string
    total?: string
    payment_method?: string
    payment_method_title?: string
    transaction_id?: string
    date_created?: string
    checkout_payment_url?: string
    deliveryEstimate?: {
      expectedDate?: string
      label?: string
      window?: string
    }
    recoveryAccess?: {
      token: string
      expiresAt?: string | null
      url: string
    } | null
  }
}

type CreatePaymentIntentPayload = {
  amount: number
  currency?: string
  orderId: number | string
  customerEmail?: string
  customerName?: string
  recoveryToken?: string
  clientAttemptId?: string
}

type CreatePaymentIntentResponse = {
  clientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
}

type VerifyStripePaymentResponse = {
  success: boolean
  status: string
  orderId: string | null
  paid?: boolean
  failed?: boolean
  pending?: boolean
  terminal?: boolean
}

async function paymentsFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accountToken = getAccountToken()

  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
      ...(options.headers || {}),
    },
  })

  let data: unknown = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorData = data as {
      details?: string
      error?: string
      message?: string
    } | null
    const message =
      errorData?.details ||
      errorData?.error ||
      errorData?.message ||
      `Payments API request failed with status ${response.status}`

    throw new Error(message)
  }

  return data as T
}

export function createDigitalHoodOrder(payload: CreateOrderPayload) {
  return paymentsFetch<CreateOrderResponse>('/api/create-order', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function createStripePaymentIntent(
  payload: CreatePaymentIntentPayload
) {
  return paymentsFetch<CreatePaymentIntentResponse>(
    '/create-payment-intent',
    {
      method: 'POST',
      body: JSON.stringify({
        currency: 'zmw',
        ...payload,
      }),
    }
  )
}

export function verifyStripePayment(
  paymentIntentId: string,
  recoveryToken = ''
) {
  return paymentsFetch<VerifyStripePaymentResponse>(
    '/verify-stripe-payment',
    {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId, recoveryToken }),
    }
  )
}
