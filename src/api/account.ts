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

export type SavedCustomerAddress = {
  id: string
  label: string
  fullName: string
  phone: string
  address1: string
  address2?: string
  city: string
  province: string
  postcode?: string
  country?: string
  isDefault?: boolean
  createdAt?: string
  updatedAt?: string
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
  savedAddresses?: SavedCustomerAddress[]
  defaultAddressId?: string
}

export type AccountDeliveryEstimate = {
  expectedDate?: string
  label?: string
  window?: string
  isLusaka?: boolean
  businessDays?: number
  skipDays?: string[]
}

export type AccountOrderCaseEligibility = {
  canOpenCase: boolean
  reasonCode?: string
  reason?: string
  caseWindowDays?: number
  opensAt?: string | null
  deadline?: string | null
  deliveredAt?: string | null
  final?: boolean
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
  caseEligibility?: AccountOrderCaseEligibility
  dateCompleted?: string | null
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

export type AccountOrderCaseReasonOption = {
  value: string
  label: string
}

export type AccountOrderCaseAttachment = {
  id?: string
  type?: string
  url: string
  path?: string
  filename?: string
  originalName?: string
  mimeType?: string
  size?: number
  uploadedAt?: string
}

export type AccountOrderCase = {
  caseNumber: string
  type: string
  status: string
  priority?: string
  subject?: string
  message?: string
  source?: string
  reason?: string
  reasonLabel?: string
  itemId?: string | number | null
  itemName?: string
  attachments?: AccountOrderCaseAttachment[]
  canReply?: boolean
  awaitingCustomerResponse?: boolean
  replyState?:
    | 'waiting_for_support'
    | 'customer_may_reply'
    | 'case_closed'
    | string
  order?: {
    orderId?: string | number | null
    orderNumber?: string | null
    status?: string
    statusLabel?: string
    total?: string
    currency?: string
  }
  messages?: Array<{
    id?: string
    message: string
    createdAt?: string
    author?: string
    authorName?: string
    sender?: string
    senderName?: string
    senderType?: string
    direction?: string
    role?: string
    attachments?: AccountOrderCaseAttachment[]
    [key: string]: unknown
  }>
  createdAt?: string
  updatedAt?: string
  resolvedAt?: string | null
}

export type AccountOrderCasesResponse = {
  success: boolean
  cases: AccountOrderCase[]
  count: number
  existingCase?: AccountOrderCase | null
  canCreateCase?: boolean
  eligibility?: AccountOrderCaseEligibility
  reasonOptions?: AccountOrderCaseReasonOption[]
}

export type CreateAccountOrderCaseResponse = {
  success: boolean
  caseNumber: string
  case: AccountOrderCase
}

export type ReplyToAccountOrderCaseResponse = {
  success: boolean
  message?: string
  case: AccountOrderCase
  reply?: {
    id?: string
    direction?: string
    message: string
    attachments?: AccountOrderCaseAttachment[]
    createdAt?: string
  }
  email?: {
    adminSent?: boolean
    error?: string
  }
}

export type WishlistResponse = {
  success: boolean
  productIds: number[]
  products: AccountProduct[]
}

export type SavedAddressesResponse = {
  success: boolean
  addresses: SavedCustomerAddress[]
  defaultAddressId?: string
  customer?: AccountCustomer
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

export async function getCustomerSavedAddresses() {
  return accountFetch<SavedAddressesResponse>('/api/account/addresses')
}

export async function addCustomerSavedAddress(
  address: Omit<SavedCustomerAddress, 'id' | 'createdAt' | 'updatedAt'>
) {
  return accountFetch<SavedAddressesResponse>('/api/account/addresses', {
    method: 'POST',
    body: JSON.stringify(address),
  })
}

export async function updateCustomerSavedAddress(
  addressId: string,
  address: Partial<SavedCustomerAddress>
) {
  return accountFetch<SavedAddressesResponse>(
    `/api/account/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(address),
    }
  )
}

export async function setDefaultCustomerSavedAddress(addressId: string) {
  return accountFetch<SavedAddressesResponse>(
    `/api/account/addresses/${encodeURIComponent(addressId)}/default`,
    {
      method: 'PUT',
    }
  )
}

export async function deleteCustomerSavedAddress(addressId: string) {
  return accountFetch<SavedAddressesResponse>(
    `/api/account/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'DELETE',
    }
  )
}

export async function getCustomerOrders(limit?: number) {
  const query =
    typeof limit === 'number'
      ? `?limit=${encodeURIComponent(String(limit))}`
      : ''

  return accountFetch<OrdersResponse>(
    `/api/account/orders${query}`
  )
}

export async function getCustomerOrder(orderId: string | number) {
  return accountFetch<OrderResponse>(`/api/account/orders/${orderId}`)
}

export async function getCustomerOrderCases(
  orderId: string | number
) {
  return accountFetch<AccountOrderCasesResponse>(
    `/api/account/orders/${encodeURIComponent(String(orderId))}/cases`
  )
}

export async function getAllCustomerOrderCases() {
  return accountFetch<AccountOrderCasesResponse>(
    '/api/account/order-cases'
  )
}

export async function createCustomerOrderCase(
  orderId: string | number,
  payload: {
    reason: string
    description: string
    itemId?: string | number
    photos?: File[]
    pageUrl?: string
  }
) {
  const token = getAccountToken()
  const formData = new FormData()

  formData.append('reason', payload.reason)
  formData.append('description', payload.description)

  if (payload.itemId !== undefined && payload.itemId !== null) {
    formData.append('itemId', String(payload.itemId))
  }

  if (payload.pageUrl) {
    formData.append('pageUrl', payload.pageUrl)
  }

  for (const photo of payload.photos || []) {
    formData.append('photos', photo)
  }

  const response = await fetch(
    `${PAYMENTS_API_URL}/api/account/orders/${encodeURIComponent(String(orderId))}/cases`,
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }
  )

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
      `Order case request failed with status ${response.status}`
    )
  }

  return data as CreateAccountOrderCaseResponse
}

export async function replyToCustomerOrderCase(
  caseNumber: string,
  payload: {
    message: string
    photos?: File[]
  }
) {
  const token = getAccountToken()
  const formData = new FormData()

  formData.append('message', payload.message)

  for (const photo of payload.photos || []) {
    formData.append('photos', photo)
  }

  const response = await fetch(
    `${PAYMENTS_API_URL}/api/account/order-cases/${encodeURIComponent(
      caseNumber
    )}/replies`,
    {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    }
  )

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
        `Case reply failed with status ${response.status}`
    )
  }

  return data as ReplyToAccountOrderCaseResponse
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
export type RecentlyViewedResponse = {
  success: boolean
  productIds: number[]
  products: AccountProduct[]
}

export async function getCustomerRecentlyViewed() {
  return accountFetch<RecentlyViewedResponse>('/api/account/recently-viewed')
}

export async function addCustomerRecentlyViewedItem(productId: number) {
  return accountFetch<RecentlyViewedResponse>('/api/account/recently-viewed', {
    method: 'POST',
    body: JSON.stringify({ productId }),
  })
}

export async function removeCustomerRecentlyViewedItem(productId: number) {
  return accountFetch<RecentlyViewedResponse>(
    `/api/account/recently-viewed/${productId}`,
    {
      method: 'DELETE',
    }
  )
}

export async function removeCustomerRecentlyViewedItems(productIds: number[]) {
  return accountFetch<RecentlyViewedResponse>('/api/account/recently-viewed', {
    method: 'DELETE',
    body: JSON.stringify({ productIds }),
  })
}
