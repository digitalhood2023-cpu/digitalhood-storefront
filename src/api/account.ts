const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

const ACCOUNT_TOKEN_KEY = 'digitalhood_customer_token'

export type AccountAddress = {
  firstName?: string
  lastName?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  postcode?: string
  country?: string
  email?: string
  phone?: string
}

export type AccountCustomer = {
  id: number
  email: string
  firstName?: string
  lastName?: string
  username?: string
  dateCreated?: string
  dateModified?: string
  avatarUrl?: string
  billing?: AccountAddress
  shipping?: AccountAddress
  wishlistProductIds?: number[]
}

export type AccountDeliveryEstimate = {
  expectedDate?: string
  label?: string
  window?: string
  isLusaka?: boolean
  businessDays?: number
  skipDays?: string[]
}

export type AccountOrderItemMeta = {
  key?: string
  value?: unknown
  displayKey?: string
  displayValue?: string
}

export type AccountOrderItem = {
  id: number
  productId?: number
  variationId?: number
  name: string
  quantity: number
  subtotal?: string
  total?: string
  sku?: string
  image?: string
  meta?: AccountOrderItemMeta[]
}

export type AccountOrderShippingLine = {
  id?: number
  methodTitle?: string
  total?: string
}

export type AccountOrder = {
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
  deliveryEstimate?: AccountDeliveryEstimate
  billing?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  shipping?: AccountAddress
  shippingLines?: AccountOrderShippingLine[]
  items?: AccountOrderItem[]
}

export type AccountProduct = {
  id: number
  name: string
  slug?: string
  type?: string
  price?: string
  regular_price?: string
  sale_price?: string
  on_sale?: boolean
  stock_status?: string
  stock_quantity?: number | null
  stock_label?: string
  stock_tone?: string
  can_add_to_cart?: boolean
  images?: Array<{
    id?: number
    src?: string
    alt?: string
  }>
}

export type AuthResponse = {
  success: boolean
  token: string
  customer: AccountCustomer
}

export type CustomerResponse = {
  success: boolean
  customer: AccountCustomer
}

export type OrdersResponse = {
  success: boolean
  orders: AccountOrder[]
}

export type OrderResponse = {
  success: boolean
  order: AccountOrder
}

export type WishlistResponse = {
  success: boolean
  productIds: number[]
  products: AccountProduct[]
}

export function getAccountToken() {
  if (typeof window === 'undefined') return ''

  return localStorage.getItem(ACCOUNT_TOKEN_KEY) || ''
}

export function setAccountToken(token: string) {
  if (typeof window === 'undefined') return

  localStorage.setItem(ACCOUNT_TOKEN_KEY, token)
}

export function clearAccountToken() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(ACCOUNT_TOKEN_KEY)
}

async function accountFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccountToken()

  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
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
    const message =
      data?.details ||
      data?.error ||
      data?.message ||
      `Account request failed with status ${response.status}`

    throw new Error(message)
  }

  return data as T
}

export async function registerCustomerAccount(payload: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  phone?: string
  billing?: AccountAddress
  shipping?: AccountAddress
}) {
  const response = await accountFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  setAccountToken(response.token)

  return response
}

export async function loginCustomerAccount(payload: {
  email: string
  password: string
}) {
  const response = await accountFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  setAccountToken(response.token)

  return response
}

export async function loginCustomerWithGoogle(credential: string) {
  const response = await accountFetch<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  })

  setAccountToken(response.token)

  return response
}

export async function getCurrentCustomer() {
  return accountFetch<CustomerResponse>('/api/auth/me')
}

export async function updateCustomerProfile(payload: {
  firstName?: string
  lastName?: string
  phone?: string
  billing?: AccountAddress
  shipping?: AccountAddress
}) {
  return accountFetch<CustomerResponse>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateCustomerAddresses(payload: {
  billing?: AccountAddress
  shipping?: AccountAddress
}) {
  return accountFetch<CustomerResponse>('/api/account/addresses', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function getCustomerOrders() {
  return accountFetch<OrdersResponse>('/api/account/orders')
}

export async function getCustomerOrder(orderId: string | number) {
  return accountFetch<OrderResponse>(`/api/account/orders/${orderId}`)
}

export async function getCustomerWishlist() {
  return accountFetch<WishlistResponse>('/api/account/wishlist')
}

export async function addCustomerWishlistItem(productId: number) {
  return accountFetch<WishlistResponse>('/api/account/wishlist', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })
}

export async function removeCustomerWishlistItem(productId: number) {
  return accountFetch<WishlistResponse>(
    `/api/account/wishlist/${productId}`,
    {
      method: 'DELETE',
    }
  )
}

export async function logoutCustomerAccount() {
  try {
    await accountFetch('/api/auth/logout', {
      method: 'POST',
    })
  } finally {
    clearAccountToken()
  }
}
