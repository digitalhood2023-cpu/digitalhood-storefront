import { getAccountToken } from '@/api/account'

const RECOVERY_API_URL =
  import.meta.env.VITE_PAYMENT_RECOVERY_API_URL ||
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

export type PaymentRecoveryOrder = {
  id: number
  number: string
  status: string
  statusLabel?: string
  currency: string
  total: number
  eligible: boolean
  eligibilityCode: string
  allowedMethods: Array<'card' | 'mobile'>
  billingPhone?: string
  recoveryStartedAt?: string
  recoveryExpiresAt?: string
  recoveryRemainingSeconds?: number
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

export type MobileRecoveryResponse = {
  success: boolean
  orderId: number
  reference: string
  transactionId?: string | null
  status: string
  paid?: boolean
  failed?: boolean
  terminal?: boolean
  pending?: boolean
  code?: string
  message?: string
  amount: number
  currency: string
}

export type MobileRecoveryVerificationResponse = {
  success: boolean
  paid: boolean
  failed: boolean
  terminal: boolean
  pending: boolean
  code: string
  status: string
  message: string
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
    const error = new Error(
      data?.details ||
        data?.error ||
        data?.message ||
        `Payment request failed with status ${response.status}`
    ) as Error & { code?: string; failed?: boolean; terminal?: boolean }
    error.code = data?.code
    error.failed = Boolean(data?.failed)
    error.terminal = Boolean(data?.terminal)
    throw error
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
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({}),
    }
  )
}

export function createRecoveryMobilePayment(
  orderId: string | number,
  payload: { phone: string; operator?: 'mtn' | 'airtel' }
) {
  return recoveryFetch<MobileRecoveryResponse>(
    `/api/account/orders/${encodeURIComponent(
      String(orderId)
    )}/payment-recovery/lenco`,
    { method: 'POST', body: JSON.stringify(payload) }
  )
}

export const createRecoveryLencoPayment = createRecoveryMobilePayment

export function verifyRecoveryMobilePayment(
  orderId: string | number,
  reference: string
) {
  return recoveryFetch<MobileRecoveryVerificationResponse>(
    `/api/account/orders/${encodeURIComponent(
      String(orderId)
    )}/payment-recovery/lenco/verify`,
    { method: 'POST', body: JSON.stringify({ reference }) }
  )
}

export const verifyRecoveryLencoPayment = verifyRecoveryMobilePayment
