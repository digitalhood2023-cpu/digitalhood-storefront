import { getAccountToken } from '@/api/account'
import type {
  AccountOrder,
  CustomerOrderPaymentRetryResponse,
  CustomerOrderPaymentVerificationResponse,
} from '@/api/account'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

type RecoveryOrderResponse = {
  success: boolean
  order: AccountOrder
}

async function recoveryFetch<T>(
  path: string,
  recoveryToken: string,
  options: RequestInit = {}
) {
  const accountToken = getAccountToken()
  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accountToken ? { Authorization: `Bearer ${accountToken}` } : {}),
      ...(recoveryToken
        ? { 'x-digitalhood-payment-recovery-token': recoveryToken }
        : {}),
      ...(options.headers || {}),
    },
  })

  let data: Record<string, unknown> | null = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      (typeof data?.details === 'string' && data.details) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data?.message === 'string' && data.message) ||
      `Payment recovery request failed with status ${response.status}`
    throw new Error(message)
  }

  return data as T
}

export function getOrderPaymentRecovery(
  orderId: string | number,
  recoveryToken = ''
) {
  return recoveryFetch<RecoveryOrderResponse>(
    `/api/orders/${encodeURIComponent(String(orderId))}/payment-recovery`,
    recoveryToken
  )
}

export function startOrderPaymentRecovery(
  orderId: string | number,
  payload: {
    phone?: string
    operator?: string
    clientAttemptId: string
  },
  recoveryToken = ''
) {
  return recoveryFetch<CustomerOrderPaymentRetryResponse>(
    `/api/orders/${encodeURIComponent(String(orderId))}/payment-recovery`,
    recoveryToken,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}

export function verifyOrderPaymentRecovery(
  orderId: string | number,
  payment: { reference: string } | { paymentIntentId: string },
  recoveryToken = ''
) {
  return recoveryFetch<CustomerOrderPaymentVerificationResponse>(
    `/api/orders/${encodeURIComponent(String(orderId))}/payment-recovery/verify`,
    recoveryToken,
    {
      method: 'POST',
      body: JSON.stringify(payment),
    }
  )
}
