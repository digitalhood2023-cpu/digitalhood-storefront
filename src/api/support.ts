const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'

export type SupportCaseType =
  | 'GENERAL_CONTACT'
  | 'ORDER_SUPPORT'
  | 'PAYMENT_SUPPORT'
  | 'DELIVERY_SUPPORT'
  | 'RETURN_REFUND'
  | 'WARRANTY_CLAIM'
  | 'SELLER_SUPPORT'
  | 'PRODUCT_INQUIRY'
  | 'QUOTE_REQUEST'
  | 'BUSINESS_INQUIRY'
  | 'TECHNICAL_ISSUE'
  | 'FRAUD_REPORT'

export type CreateSupportCasePayload = {
  type: SupportCaseType
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  orderNumber?: string
  orderId?: string
  pageUrl?: string
  startedAt?: number
  companyWebsite?: string
  caseDetails?: Record<string, string>
  'cf-turnstile-response': string
}

export type PublicSupportCase = {
  caseNumber: string
  type: string
  status: string
  priority: string
  subject: string
  message: string
  customer?: {
    name?: string
  }
  order?: {
    orderId?: string | number | null
    orderNumber?: string | null
  }
  messages?: Array<{
    id?: string
    direction?: string
    message: string
    createdAt?: string
  }>
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string | null
}

async function supportRequest<T>(path: string, options: RequestInit = {}) {
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
    throw new Error(data?.details || data?.error || data?.message || `Request failed with status ${response.status}`)
  }

  return data as T
}

export async function createSupportCase(payload: CreateSupportCasePayload) {
  return supportRequest<{
    success: boolean
    caseNumber: string
    case?: {
      caseNumber: string
      status: string
      priority: string
      createdAt: string
    }
    email?: {
      customerSent?: boolean
      adminSent?: boolean
    }
  }>('/api/support/cases', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function lookupSupportCase(payload: {
  caseNumber: string
  email: string
}) {
  return supportRequest<{
    success: boolean
    case: PublicSupportCase
  }>('/api/support/cases/lookup', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
