const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

export type LencoMobileMoneyPayload = {
  amount: number
  phone: string
  operator: 'mtn' | 'airtel'
  reference: string
  orderId?: number | string
  customerName?: string
  customerEmail?: string
}

export type LencoPaymentState = {
  paid?: boolean
  failed?: boolean
  pending?: boolean
  terminal?: boolean
  failureCode?: string | null
  status?: string
  message?: string
}

export type LencoMobileMoneyResponse = LencoPaymentState & {
  success?: boolean
  reference?: string
  orderId?: string | number
  transactionId?: string
}

type LencoErrorResponse = {
  details?: string
  error?: string
  message?: string
}

export type LencoVerificationResponse = LencoPaymentState & {
  success: boolean
  paid: boolean
  status: string
  orderId?: string | number
  reference?: string
  transactionId?: string
}

async function lencoFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(() => controller.abort(), 12_000)
  let response: Response

  try {
    response = await fetch(`${PAYMENTS_API_URL}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        'The Mobile Money service took too long to respond. Please check your phone before trying again.'
      )
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }

  let data: T | LencoErrorResponse | null = null

  try {
    data = (await response.json()) as T | LencoErrorResponse
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorData = data as LencoErrorResponse | null
    const message =
      errorData?.details ||
      errorData?.error ||
      errorData?.message ||
      `Lenco request failed with status ${response.status}`

    throw new Error(message)
  }

  return data as T
}

export async function initiateLencoMobileMoney(
  payload: LencoMobileMoneyPayload
) {
  return lencoFetch<LencoMobileMoneyResponse>('/api/lenco/mobile-money', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function verifyLencoMobileMoney(reference: string) {
  return lencoFetch<LencoVerificationResponse>('/api/lenco/verify', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  })
}

export function detectMobileMoneyOperator(phone: string): 'mtn' | 'airtel' {
  const cleaned = phone.replace(/\D/g, '')

  if (
    cleaned.startsWith('26096') ||
    cleaned.startsWith('26076') ||
    cleaned.startsWith('096') ||
    cleaned.startsWith('076') ||
    cleaned.startsWith('96') ||
    cleaned.startsWith('76')
  ) {
    return 'mtn'
  }

  if (
    cleaned.startsWith('26097') ||
    cleaned.startsWith('26077') ||
    cleaned.startsWith('097') ||
    cleaned.startsWith('077') ||
    cleaned.startsWith('97') ||
    cleaned.startsWith('77')
  ) {
    return 'airtel'
  }

  return 'mtn'
}