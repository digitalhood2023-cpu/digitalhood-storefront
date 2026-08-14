import {
  getAccountToken,
  updateCustomerMarketplaceState,
  type CustomerMarketplaceState,
} from '@/api/account'

export const CART_STORAGE_KEY = 'digitalhood-cart'
export const WISHLIST_STORAGE_KEY = 'digitalhood-wishlist'
export const RECENTLY_VIEWED_STORAGE_KEY = 'digitalhood_recently_viewed'
export const GLOBAL_SEARCH_STORAGE_KEY = 'digitalhood-shop-searches'
export const STORE_SEARCH_STORAGE_PREFIX = 'digitalhood-store-searches:'
export const ACCOUNT_STATE_CLEARED_EVENT = 'digitalhood:account-state-cleared'
export const SEARCH_HISTORY_CHANGED_EVENT = 'digitalhood:search-history-changed'

const MAX_GLOBAL_SEARCHES = 20
const MAX_STORE_SEARCHES = 5

type SearchState = Pick<
  CustomerMarketplaceState,
  'recentSearches' | 'storeSearches'
>

let accountCustomerId = ''
let accountSearchState: SearchState = {
  recentSearches: [],
  storeSearches: {},
}
let searchSyncTimer: number | null = null

function cleanSearches(values: unknown, limit: number) {
  if (!Array.isArray(values)) return []

  return Array.from(
    new Set(
      values
        .map((value) => String(value || '').trim().slice(0, 80))
        .filter((value) => value.length >= 2)
    )
  ).slice(0, limit)
}

function cleanStoreKey(value: string) {
  return String(value || '').trim().toLowerCase().slice(0, 180)
}

function emitSearchHistoryChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SEARCH_HISTORY_CHANGED_EVENT))
}

function scheduleAccountSearchSync() {
  if (
    typeof window === 'undefined' ||
    !accountCustomerId ||
    !getAccountToken()
  ) {
    return
  }

  if (searchSyncTimer !== null) {
    window.clearTimeout(searchSyncTimer)
  }

  searchSyncTimer = window.setTimeout(() => {
    searchSyncTimer = null

    updateCustomerMarketplaceState({
      recentSearches: accountSearchState.recentSearches,
      storeSearches: accountSearchState.storeSearches,
    }).catch(() => {
      // Search remains available in memory until the next account sync.
    })
  }, 350)
}

export function readGuestSearchState(): SearchState {
  if (typeof window === 'undefined') {
    return { recentSearches: [], storeSearches: {} }
  }

  let recentSearches: string[] = []
  const storeSearches: Record<string, string[]> = {}

  try {
    recentSearches = cleanSearches(
      JSON.parse(window.localStorage.getItem(GLOBAL_SEARCH_STORAGE_KEY) || '[]'),
      MAX_GLOBAL_SEARCHES
    )
  } catch {
    recentSearches = []
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)

    if (!key?.startsWith(STORE_SEARCH_STORAGE_PREFIX)) continue

    const sellerKey = cleanStoreKey(key.slice(STORE_SEARCH_STORAGE_PREFIX.length))

    if (!sellerKey) continue

    try {
      storeSearches[sellerKey] = cleanSearches(
        JSON.parse(window.localStorage.getItem(key) || '[]'),
        MAX_STORE_SEARCHES
      )
    } catch {
      storeSearches[sellerKey] = []
    }
  }

  return { recentSearches, storeSearches }
}

export function clearMarketplacePersonalBrowserState() {
  if (typeof window === 'undefined') return

  const keysToRemove = [
    CART_STORAGE_KEY,
    WISHLIST_STORAGE_KEY,
    RECENTLY_VIEWED_STORAGE_KEY,
    'digitalhood-recently-viewed',
    GLOBAL_SEARCH_STORAGE_KEY,
    'digitalhood-search-history',
  ]

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)

    if (key?.startsWith(STORE_SEARCH_STORAGE_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  for (const key of new Set(keysToRemove)) {
    window.localStorage.removeItem(key)
  }

  window.dispatchEvent(new CustomEvent(ACCOUNT_STATE_CLEARED_EVENT))
  emitSearchHistoryChanged()
}

export function configureAccountSearchState(
  customerId: string,
  state: Partial<SearchState> = {}
) {
  accountCustomerId = String(customerId || '')
  accountSearchState = {
    recentSearches: cleanSearches(state.recentSearches, MAX_GLOBAL_SEARCHES),
    storeSearches: Object.fromEntries(
      Object.entries(state.storeSearches || {})
        .map(([key, values]) => [
          cleanStoreKey(key),
          cleanSearches(values, MAX_STORE_SEARCHES),
        ])
        .filter(([key]) => Boolean(key))
    ),
  }

  emitSearchHistoryChanged()
}

export function clearAccountSearchState() {
  accountCustomerId = ''
  accountSearchState = { recentSearches: [], storeSearches: {} }

  if (typeof window !== 'undefined' && searchSyncTimer !== null) {
    window.clearTimeout(searchSyncTimer)
  }

  searchSyncTimer = null
  emitSearchHistoryChanged()
}

export function readMarketplaceSearchHistory(sellerKey = '') {
  const normalizedSellerKey = cleanStoreKey(sellerKey)

  if (getAccountToken()) {
    return normalizedSellerKey
      ? accountSearchState.storeSearches[normalizedSellerKey] || []
      : accountSearchState.recentSearches
  }

  const guestState = readGuestSearchState()

  return normalizedSellerKey
    ? guestState.storeSearches[normalizedSellerKey] || []
    : guestState.recentSearches
}

export function saveMarketplaceSearch(value: string, sellerKey = '') {
  const cleaned = String(value || '').trim().slice(0, 80)

  if (cleaned.length < 2) return

  const normalizedSellerKey = cleanStoreKey(sellerKey)

  if (getAccountToken()) {
    if (!accountCustomerId) {
      return
    }

    if (normalizedSellerKey) {
      accountSearchState = {
        ...accountSearchState,
        storeSearches: {
          ...accountSearchState.storeSearches,
          [normalizedSellerKey]: cleanSearches(
            [
              cleaned,
              ...(accountSearchState.storeSearches[normalizedSellerKey] || []).filter(
                (item) => item.toLowerCase() !== cleaned.toLowerCase()
              ),
            ],
            MAX_STORE_SEARCHES
          ),
        },
      }
    } else {
      accountSearchState = {
        ...accountSearchState,
        recentSearches: cleanSearches(
          [
            cleaned,
            ...accountSearchState.recentSearches.filter(
              (item) => item.toLowerCase() !== cleaned.toLowerCase()
            ),
          ],
          MAX_GLOBAL_SEARCHES
        ),
      }
    }

    emitSearchHistoryChanged()
    scheduleAccountSearchSync()
    return
  }

  if (typeof window === 'undefined') return

  const previous = readMarketplaceSearchHistory(normalizedSellerKey)
  const next = cleanSearches(
    [
      cleaned,
      ...previous.filter((item) => item.toLowerCase() !== cleaned.toLowerCase()),
    ],
    normalizedSellerKey ? MAX_STORE_SEARCHES : MAX_GLOBAL_SEARCHES
  )

  const storageKey = normalizedSellerKey
    ? `${STORE_SEARCH_STORAGE_PREFIX}${normalizedSellerKey}`
    : GLOBAL_SEARCH_STORAGE_KEY

  window.localStorage.setItem(storageKey, JSON.stringify(next))
  emitSearchHistoryChanged()
}
