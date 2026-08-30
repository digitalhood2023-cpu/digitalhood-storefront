const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

const ACCOUNT_TOKEN_KEY = 'digitalhood_customer_token'
const ACCOUNT_CUSTOMER_CACHE_KEY = 'digitalhood_customer_snapshot'

type AccountErrorPayload = {
  details?: string
  error?: string
  message?: string
}

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
  latitude?: number | null
  longitude?: number | null
  locationAccuracy?: number | null
  mapUrl?: string
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
  latitude?: number | null
  longitude?: number | null
  locationAccuracy?: number | null
  mapUrl?: string
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

export type AccountOrderPaymentRetry = {
  eligible: boolean
  method?: 'card' | 'mobile' | null
  availableMethods?: Array<'card' | 'mobile'>
  switchAllowed?: boolean
  lifecycle?: 'awaiting-verification' | 'pay-now' | 'paid' | 'closed' | 'expired' | 'cash-on-delivery' | 'unavailable' | string
  reasonCode?: string
  message?: string
  verificationDeadline?: string | null
  verificationRemainingSeconds?: number
  recoveryStartedAt?: string | null
  deadline?: string | null
  remainingSeconds?: number
  windowHours?: number
}

export type AccountOrderInventoryReservation = {
  state: 'reserved' | 'released' | 'committed' | 'unavailable' | string
  reserved: boolean
  reservedAt?: string | null
  releasesAt?: string | null
  releasedAt?: string | null
  message?: string
}

export type AccountOrderMarketplaceState = {
  key: string
  category: 'in-progress' | 'shipped' | 'delivered' | 'closed' | string
  label: string
  trackable: boolean
  closed: boolean
}

export type AccountOrderDeliveryTracking = {
  key: 'preparing' | 'shipped' | 'out-for-delivery' | 'delivered' | 'delayed' | 'closed' | string
  label: string
  message: string
  expectedDate?: string | null
  expectedLabel?: string | null
  deliveredAt?: string | null
  delayed: boolean
  live: boolean
  lastUpdatedAt?: string | null
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

export type AccountOrderFeeLine = {
  id?: number
  name?: string
  total?: string
  tax?: string
}

export type AccountOrderCouponLine = {
  id?: number
  code?: string
  discount?: string
  discountTax?: string
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
  discountTotal?: string
  shippingTotal?: string
  taxTotal?: string
  paymentMethod?: string
  paymentMethodTitle?: string
  transactionId?: string
  customerNote?: string
  deliveryEstimate?: AccountDeliveryEstimate
  caseEligibility?: AccountOrderCaseEligibility
  paymentRetry?: AccountOrderPaymentRetry
  inventoryReservation?: AccountOrderInventoryReservation
  marketplaceState?: AccountOrderMarketplaceState
  deliveryTracking?: AccountOrderDeliveryTracking
  dateCompleted?: string | null
  billing?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
  shipping?: AccountAddress
  shippingLines?: AccountOrderShippingLine[]
  feeLines?: AccountOrderFeeLine[]
  couponLines?: AccountOrderCouponLine[]
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
  image?: string
  imageThumb?: string
  imageCard?: string
  imageMedium?: string
  imageLarge?: string
  imageOriginal?: string
  images?: Array<
    | string
    | {
        id?: number
        src?: string
        url?: string
        alt?: string
      }
  >
}

export type AccountNotificationCategory =
  | 'orders'
  | 'payments'
  | 'delivery'
  | 'messages'
  | 'support'
  | 'account'
  | 'offers'
  | 'marketplace'

export type AccountNotification = {
  id: string
  category: AccountNotificationCategory
  type: string
  title: string
  body: string
  actionUrl?: string | null
  imageUrl?: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string | null
  updatedAt?: string | null
  readAt?: string | null
  archivedAt?: string | null
  expiresAt?: string | null
}

export type AccountNotificationSummary = {
  unread: number
  orders?: number
  payments?: number
  delivery?: number
  messages?: number
  support?: number
  account?: number
  offers?: number
  marketplace?: number
  latestAt?: string | null
}

export type AccountNotificationPreferences = {
  inAppEnabled: boolean
  emailEnabled: boolean
  orderUpdates: boolean
  paymentUpdates: boolean
  deliveryUpdates: boolean
  messageUpdates: boolean
  supportUpdates: boolean
  accountUpdates: boolean
  offers: boolean
  marketplaceNews: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  updatedAt?: string | null
}

export type AccountNotificationsResponse = {
  success: boolean
  notifications: AccountNotification[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasMore: boolean
  }
  summary: AccountNotificationSummary
  preferences: AccountNotificationPreferences
}

export type AuthResponse = {
  success: boolean
  token: string
  customer: AccountCustomer
}

export type CustomerResponse = {
  success: boolean
  token?: string
  customer: AccountCustomer
}

export type OrdersResponse = {
  success: boolean
  orders: AccountOrder[]
  count?: number
  limit?: number
  page?: number
  perPage?: number
  total?: number
  totalPages?: number
  counts?: {
    all: number
    inProgress: number
    pending: number
    processing: number
    shipped: number
    shippedExact?: number
    outForDelivery: number
    delivered: number
    closed?: number
  }
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

export type AccountMarketplaceCartItem = {
  id: number
  productId: number
  variationId?: number
  variationLabel?: string
  name: string
  slug?: string
  price: number
  regularPrice: number
  image: string
  quantity: number
  stockStatus?: string
  stockQuantity?: number | null
  stockLabel?: string
  stockTone?: 'success' | 'warning' | 'danger' | 'muted'
  canAddToCart?: boolean
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
  sellerAvatarUrl?: string
  sellerFeedbackText?: string
}

export type CustomerMarketplaceState = {
  cartItems: AccountMarketplaceCartItem[]
  recentSearches: string[]
  storeSearches: Record<string, string[]>
  updatedAt?: string
}

export type CustomerMarketplaceStateResponse = {
  success: boolean
  state: CustomerMarketplaceState
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

  if (getAccountToken() !== token) clearCustomerOrderMemoryCache()
  localStorage.setItem(ACCOUNT_TOKEN_KEY, token)
}

export function clearAccountToken() {
  if (typeof window === 'undefined') return

  clearCustomerOrderMemoryCache()
  localStorage.removeItem(ACCOUNT_TOKEN_KEY)
}

export function getCachedAccountCustomer() {
  if (typeof window === 'undefined') return null

  try {
    const rawCustomer = localStorage.getItem(ACCOUNT_CUSTOMER_CACHE_KEY)
    return rawCustomer ? (JSON.parse(rawCustomer) as AccountCustomer) : null
  } catch {
    localStorage.removeItem(ACCOUNT_CUSTOMER_CACHE_KEY)
    return null
  }
}

export function setCachedAccountCustomer(customer: AccountCustomer) {
  if (typeof window === 'undefined') return

  localStorage.setItem(ACCOUNT_CUSTOMER_CACHE_KEY, JSON.stringify(customer))
}

export function clearCachedAccountCustomer() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(ACCOUNT_CUSTOMER_CACHE_KEY)
}

export class AccountRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AccountRequestError'
    this.status = status
  }
}

export function isAccountUnauthorizedError(error: unknown) {
  return error instanceof AccountRequestError && error.status === 401
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

  let data: AccountErrorPayload | T | null = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      (data as AccountErrorPayload | null)?.details ||
      (data as AccountErrorPayload | null)?.error ||
      (data as AccountErrorPayload | null)?.message ||
      `Account request failed with status ${response.status}`

    throw new AccountRequestError(message, response.status)
  }

  return data as T
}

type AccountMemoryCacheEntry = {
  expiresAt: number
  value: unknown
}

const customerOrderMemoryCache = new Map<string, AccountMemoryCacheEntry>()
const customerOrderInflight = new Map<string, Promise<unknown>>()
const CUSTOMER_ORDER_MEMORY_CACHE_MAX_ENTRIES = 60
let customerOrderCacheScope = ''

export function clearCustomerOrderMemoryCache() {
  customerOrderMemoryCache.clear()
  customerOrderInflight.clear()
  customerOrderCacheScope = ''
}

function syncCustomerOrderCacheScope(token: string) {
  if (customerOrderCacheScope === token) return

  customerOrderMemoryCache.clear()
  customerOrderInflight.clear()
  customerOrderCacheScope = token
}

function setCustomerOrderMemoryCache(
  path: string,
  entry: AccountMemoryCacheEntry
) {
  if (customerOrderMemoryCache.has(path)) {
    customerOrderMemoryCache.delete(path)
  }

  while (
    customerOrderMemoryCache.size >= CUSTOMER_ORDER_MEMORY_CACHE_MAX_ENTRIES
  ) {
    const oldestPath = customerOrderMemoryCache.keys().next().value
    if (!oldestPath) break
    customerOrderMemoryCache.delete(oldestPath)
  }

  customerOrderMemoryCache.set(path, entry)
}

async function accountCachedGet<T>(path: string, ttlMs: number): Promise<T> {
  const token = getAccountToken()
  syncCustomerOrderCacheScope(token)

  const cached = customerOrderMemoryCache.get(path)
  if (cached && cached.expiresAt > Date.now()) {
    setCustomerOrderMemoryCache(path, cached)
    return cached.value as T
  }
  if (cached) customerOrderMemoryCache.delete(path)

  const activeRequest = customerOrderInflight.get(path)
  if (activeRequest) return activeRequest as Promise<T>

  const request = accountFetch<T>(path)
    .then((value) => {
      if (getAccountToken() === token && customerOrderCacheScope === token) {
        setCustomerOrderMemoryCache(path, {
          expiresAt: Date.now() + ttlMs,
          value,
        })
      }

      return value
    })
    .finally(() => {
      if (customerOrderInflight.get(path) === request) {
        customerOrderInflight.delete(path)
      }
    })

  customerOrderInflight.set(path, request)
  return request
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

export async function requestCustomerPasswordReset(email: string) {
  return accountFetch<{ success: boolean; message: string }>(
    '/api/auth/forgot-password',
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    }
  )
}

export async function resetCustomerPassword(payload: {
  token: string
  password: string
}) {
  return accountFetch<{ success: boolean; message: string }>(
    '/api/auth/reset-password',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
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

export type CustomerOrdersQuery = {
  page?: number
  perPage?: number
  category?: 'all' | 'in-progress' | 'shipped' | 'delivered'
  status?:
    | 'all'
    | 'pending'
    | 'processing'
    | 'shipped'
    | 'out-for-delivery'
    | 'delivered'
  search?: string
}

export async function getCustomerOrders(
  options?: number | CustomerOrdersQuery
) {
  const params = new URLSearchParams()

  if (typeof options === 'number') {
    params.set('limit', String(options))
  } else if (options) {
    if (options.page) params.set('page', String(options.page))
    if (options.perPage) params.set('perPage', String(options.perPage))
    if (options.category && options.category !== 'all') {
      params.set('category', options.category)
    }
    if (options.status && options.status !== 'all') {
      params.set('status', options.status)
    }
    if (options.search?.trim()) params.set('search', options.search.trim())
  }

  const query = params.size ? `?${params.toString()}` : ''

  return accountCachedGet<OrdersResponse>(`/api/account/orders${query}`, 15_000)
}

export type CustomerOrderPaymentRetryResponse = {
  success: boolean
  mode: 'card' | 'mobile'
  selectedMethod?: 'card' | 'mobile'
  previousMethod?: 'card' | 'mobile' | null
  switched?: boolean
  orderId: number
  amount: number
  currency: string
  deadline?: string | null
  verificationDeadline?: string | null
  clientSecret?: string
  paymentIntentId?: string
  reference?: string
  transactionId?: string | null
  status?: string
  message?: string
  paid?: boolean
  failed?: boolean
  pending?: boolean
  terminal?: boolean
  reused?: boolean
}

export type CustomerOrderPaymentVerificationResponse = {
  success: boolean
  paid: boolean
  failed: boolean
  pending: boolean
  terminal: boolean
  status: string
  reference?: string
  paymentIntentId?: string
  orderId: number
  transactionId?: string | null
}

export async function startCustomerOrderPaymentRetry(
  orderId: string | number,
  payload: {
    paymentMethod?: 'card' | 'mobile'
    phone?: string
    operator?: string
    clientAttemptId: string
  }
) {
  const response = await accountFetch<CustomerOrderPaymentRetryResponse>(
    `/api/account/orders/${encodeURIComponent(String(orderId))}/payment-retry`,
    { method: 'POST', body: JSON.stringify(payload) }
  )
  clearCustomerOrderMemoryCache()
  return response
}

export async function verifyCustomerOrderPaymentRetry(
  orderId: string | number,
  payment: { reference: string } | { paymentIntentId: string }
) {
  const response = await accountFetch<CustomerOrderPaymentVerificationResponse>(
    `/api/account/orders/${encodeURIComponent(String(orderId))}/payment-retry/verify`,
    { method: 'POST', body: JSON.stringify(payment) }
  )
  clearCustomerOrderMemoryCache()
  return response
}

export async function getCustomerOrder(orderId: string | number) {
  return accountCachedGet<OrderResponse>(`/api/account/orders/${orderId}`, 3_000)
}

export async function getCustomerOrderCases(
  orderId: string | number
) {
  return accountCachedGet<AccountOrderCasesResponse>(
    `/api/account/orders/${encodeURIComponent(String(orderId))}/cases`,
    5_000
  )
}

export async function getAllCustomerOrderCases() {
  return accountCachedGet<AccountOrderCasesResponse>(
    '/api/account/order-cases',
    5_000
  )
}

export async function createCustomerOrderCase(
  orderId: string | number,
  payload: {
    reason: string
    description: string
    itemId?: string | number
    evidence?: File[]
    /** @deprecated Use evidence. Retained for older callers. */
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

  for (const file of payload.evidence || payload.photos || []) {
    formData.append('photos', file)
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

  let data: AccountErrorPayload | AccountOrderCase | null = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(
      (data as AccountErrorPayload | null)?.details ||
      (data as AccountErrorPayload | null)?.error ||
      (data as AccountErrorPayload | null)?.message ||
      `Order case request failed with status ${response.status}`
    )
  }

  clearCustomerOrderMemoryCache()
  return data as CreateAccountOrderCaseResponse
}

export async function replyToCustomerOrderCase(
  caseNumber: string,
  payload: {
    message: string
    evidence?: File[]
    /** @deprecated Use evidence. Retained for older callers. */
    photos?: File[]
  }
) {
  const token = getAccountToken()
  const formData = new FormData()

  formData.append('message', payload.message)

  for (const file of payload.evidence || payload.photos || []) {
    formData.append('photos', file)
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

  let data: AccountErrorPayload | AccountOrderCase | null = null

  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(
      (data as AccountErrorPayload | null)?.details ||
        (data as AccountErrorPayload | null)?.error ||
        (data as AccountErrorPayload | null)?.message ||
        `Case reply failed with status ${response.status}`
    )
  }

  clearCustomerOrderMemoryCache()
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

export async function getCustomerNotifications(options: {
  page?: number
  limit?: number
  filter?: 'all' | 'unread' | AccountNotificationCategory
} = {}) {
  const params = new URLSearchParams({
    page: String(options.page || 1),
    limit: String(options.limit || 15),
    filter: options.filter || 'all',
  })

  return accountFetch<AccountNotificationsResponse>(
    `/api/account/notifications?${params.toString()}`
  )
}

export async function getCustomerNotificationSummary() {
  return accountFetch<{
    success: boolean
    summary: AccountNotificationSummary
  }>('/api/account/notifications/summary')
}

export async function updateCustomerNotification(
  notificationId: string,
  update: { read?: boolean; archived?: boolean }
) {
  return accountFetch<{
    success: boolean
    notification: AccountNotification
  }>(
    `/api/account/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(update),
    }
  )
}

export async function markAllCustomerNotificationsRead() {
  return accountFetch<{ success: boolean; updated: number }>(
    '/api/account/notifications/mark-all-read',
    { method: 'POST' }
  )
}

export async function getCustomerNotificationPreferences() {
  return accountFetch<{
    success: boolean
    preferences: AccountNotificationPreferences
  }>('/api/account/notification-preferences')
}

export async function updateCustomerNotificationPreferences(
  preferences: Partial<AccountNotificationPreferences>
) {
  return accountFetch<{
    success: boolean
    preferences: AccountNotificationPreferences
  }>('/api/account/notification-preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
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

export async function getCustomerMarketplaceState() {
  return accountFetch<CustomerMarketplaceStateResponse>(
    '/api/account/marketplace-state'
  )
}

export async function updateCustomerMarketplaceState(
  state: Partial<CustomerMarketplaceState>
) {
  return accountFetch<CustomerMarketplaceStateResponse>(
    '/api/account/marketplace-state',
    {
      method: 'PUT',
      body: JSON.stringify(state),
    }
  )
}
