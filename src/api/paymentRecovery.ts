import { getAccountToken } from '@/api/account'

const RECOVERY_API_URL =
  import.meta.env.VITE_PAYMENT_RECOVERY_API_URL ||
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

export type PaymentRecoveryOrder = {
  id: number
  number: string
  status: string
  currency: string
  total: number
  paymentMethod: string
  eligible: boolean
  eligibilityCode: string
  allowedMethods: Array<'stripe' | 'lenco'>
  billingPhone?: string
}

export type PaymentRecoveryDetailsResponse = {
  success: boolean
  order: PaymentRecoveryOrder
}

export type StripeRecoveryResponse = {
  success: boolean
  orderId: number
  clientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
}

export type LencoRecoveryResponse = {
  success: boolean
  orderId: number
  reference: string
  transactionId?: string | null
  status: string
  amount: number
  currency: string
  message?: string
}

export type LencoRecoveryVerificationResponse = {
  success: boolean
  paid: boolean
  status: string
  reference: string
  transactionId?: string | null
  orderId: number
}

async function recoveryFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccountToken()
  const response = await fetch(`${RECOVERY_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    throw new Error(
      data?.details ||
        data?.error ||
        data?.message ||
        `Payment recovery request failed with status ${response.status}`
    )
  }

  return data as T
}

export function getPaymentRecoveryDetails(orderId: string | number) {
  return recoveryFetch<PaymentRecoveryDetailsResponse>(
    `/api/account/orders/${encodeURIComponent(String(orderId))}/payment-recovery`
  )
}

export function createRecoveryStripeIntent(orderId: string | number) {
  const idempotencyKey = `recovery-${orderId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`

  return recoveryFetch<StripeRecoveryResponse>(
    `/api/account/orders/${encodeURIComponent(
      String(orderId)
    )}/payment-recovery/stripe`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({}),
    }
  )
}

export function createRecoveryLencoPayment(
  orderId: string | number,
  payload: {
    phone: string
    operator?: 'mtn' | 'airtel'
  }
) {
  return recoveryFetch<LencoRecoveryResponse>(
    `/api/account/orders/${encodeURIComponent(
      String(orderId)
    )}/payment-recovery/lenco`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function verifyRecoveryLencoPayment(
  orderId: string | number,
  reference: string
) {
  return recoveryFetch<LencoRecoveryVerificationResponse>(
    `/api/account/orders/${encodeURIComponent(
      String(orderId)
    )}/payment-recovery/lenco/verify`,
    {
      method: 'POST',
      body: JSON.stringify({ reference }),
    }
  )
}
