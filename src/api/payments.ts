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
}

type CreateOrderLineItem = {
  productId: number
  variationId?: number
  quantity: number
}

type CreateOrderPayload = {
  paymentMethod: 'mobile' | 'cod' | 'card' | 'lenco' | 'stripe'
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
  }
}

type CreatePaymentIntentPayload = {
  amount: number
  currency?: string
  orderId: number | string
  customerEmail?: string
  customerName?: string
}

type CreatePaymentIntentResponse = {
  clientSecret: string
  paymentIntentId: string
}

type VerifyStripePaymentResponse = {
  success: boolean
  status: string
  orderId: string | null
}

async function paymentsFetch<T>(
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

export function verifyStripePayment(paymentIntentId: string) {
  return paymentsFetch<VerifyStripePaymentResponse>(
    '/verify-stripe-payment',
    {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    }
  )
}
