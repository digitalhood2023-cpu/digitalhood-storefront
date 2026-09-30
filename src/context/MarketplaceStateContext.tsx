import { useEffect, useRef } from 'react'

import {
  getCustomerMarketplaceState,
  updateCustomerMarketplaceState,
  type AccountMarketplaceCartItem,
  type CustomerMarketplaceState,
} from '@/api/account'
import { useAccount } from '@/context/AccountContext'
import {
  CART_STORAGE_KEY,
  GLOBAL_SEARCH_STORAGE_KEY,
  STORE_SEARCH_STORAGE_PREFIX,
  clearAccountSearchState,
  configureAccountSearchState,
  readGuestSearchState,
} from '@/lib/marketplaceBrowserState'
import { useCartStore, type CartItem } from '@/store/cartStore'

function dedupeSearches(values: string[], limit: number) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const cleaned = String(value || '').trim().slice(0, 80)
    const comparable = cleaned.toLowerCase()

    if (cleaned.length < 2 || seen.has(comparable)) continue

    seen.add(comparable)
    result.push(cleaned)

    if (result.length >= limit) break
  }

  return result
}

function mergeStoreSearches(
  account: Record<string, string[]> = {},
  guest: Record<string, string[]> = {}
) {
  const result: Record<string, string[]> = {}

  for (const key of new Set([...Object.keys(account), ...Object.keys(guest)])) {
    result[key] = dedupeSearches(
      [...(guest[key] || []), ...(account[key] || [])],
      5
    )
  }

  return result
}

function normalizeCartItems(items: AccountMarketplaceCartItem[] = []): CartItem[] {
  return items
    .filter((item) => Number(item?.id) > 0 && Number(item?.productId) > 0)
    .map((item) => {
      const requested = Math.max(1, Math.min(99, Number(item.quantity || 1)))
      const stockQuantity = Number(item.stockQuantity)
      const stockLimit = item.stockStatus !== 'onbackorder' && Number.isFinite(stockQuantity) && item.stockQuantity !== null && item.stockQuantity !== undefined
        ? Math.max(0, Math.floor(stockQuantity))
        : null
      return {
        ...item,
        id: Number(item.id),
        productId: Number(item.productId),
        variationId: item.variationId ? Number(item.variationId) : undefined,
        price: Math.max(0, Number(item.price || 0)),
        regularPrice: Math.max(0, Number(item.regularPrice || item.price || 0)),
        quantity: stockLimit !== null && stockLimit > 0 ? Math.min(requested, stockLimit) : requested,
      }
    })
    .slice(0, 100)
}

function mergeCartItems(accountItems: CartItem[], guestItems: CartItem[]) {
  const byId = new Map<number, CartItem>()

  for (const item of [...accountItems, ...guestItems]) {
    const existing = byId.get(item.id)

    const merged = existing
      ? { ...existing, ...item, quantity: Math.max(existing.quantity, item.quantity) }
      : item
    const stockQuantity = Number(merged.stockQuantity)
    const stockLimit = merged.stockStatus !== 'onbackorder' && Number.isFinite(stockQuantity) && merged.stockQuantity !== null && merged.stockQuantity !== undefined
      ? Math.max(0, Math.floor(stockQuantity))
      : null
    byId.set(merged.id, {
      ...merged,
      quantity: stockLimit !== null && stockLimit > 0
        ? Math.min(merged.quantity, stockLimit)
        : merged.quantity,
    })
  }

  return Array.from(byId.values()).slice(0, 100)
}

function clearGuestCartAndSearchStorage() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(CART_STORAGE_KEY)
  window.localStorage.removeItem(GLOBAL_SEARCH_STORAGE_KEY)

  const storeKeys: string[] = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)

    if (key?.startsWith(STORE_SEARCH_STORAGE_PREFIX)) {
      storeKeys.push(key)
    }
  }

  for (const key of storeKeys) {
    window.localStorage.removeItem(key)
  }
}

export function MarketplaceStateProvider({ children }: { children: React.ReactNode }) {
  const { customer, isAuthenticated, isLoading: isAccountLoading } = useAccount()
  const cartItems = useCartStore((state) => state.items)
  const replaceCartItems = useCartStore((state) => state.replaceItems)
  const clearCart = useCartStore((state) => state.clearCart)
  const readyCustomerIdRef = useRef('')
  const previousCustomerIdRef = useRef('')
  const wasAuthenticatedRef = useRef(false)
  const cartSyncTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (isAccountLoading) return

    const customerId = customer?.id ? String(customer.id) : ''

    if (!isAuthenticated || !customerId) {
      if (wasAuthenticatedRef.current) {
        clearCart()
      }

      wasAuthenticatedRef.current = false
      previousCustomerIdRef.current = ''
      readyCustomerIdRef.current = ''
      clearAccountSearchState()
      return
    }

    const switchingAccounts = Boolean(
      previousCustomerIdRef.current && previousCustomerIdRef.current !== customerId
    )
    const guestCartItems = switchingAccounts ? [] : useCartStore.getState().items
    const guestSearchState = switchingAccounts
      ? { recentSearches: [], storeSearches: {} }
      : readGuestSearchState()

    previousCustomerIdRef.current = customerId
    wasAuthenticatedRef.current = true
    readyCustomerIdRef.current = ''
    clearGuestCartAndSearchStorage()

    let active = true

    async function hydrateAccountState() {
      try {
        const response = await getCustomerMarketplaceState()
        const accountState = response.state
        const mergedCart = mergeCartItems(
          normalizeCartItems(accountState.cartItems),
          guestCartItems
        )
        const mergedState: CustomerMarketplaceState = {
          cartItems: mergedCart,
          recentSearches: dedupeSearches(
            [...guestSearchState.recentSearches, ...(accountState.recentSearches || [])],
            20
          ),
          storeSearches: mergeStoreSearches(
            accountState.storeSearches,
            guestSearchState.storeSearches
          ),
          updatedAt: accountState.updatedAt,
        }

        if (!active) return

        replaceCartItems(mergedCart)
        configureAccountSearchState(customerId, mergedState)
        readyCustomerIdRef.current = customerId

        if (
          guestCartItems.length > 0 ||
          guestSearchState.recentSearches.length > 0 ||
          Object.keys(guestSearchState.storeSearches).length > 0
        ) {
          await updateCustomerMarketplaceState(mergedState)
        }
      } catch {
        if (!active) return

        replaceCartItems(guestCartItems)
        configureAccountSearchState(customerId, guestSearchState)
        readyCustomerIdRef.current = customerId
      }
    }

    void hydrateAccountState()

    return () => {
      active = false
    }
  }, [
    clearCart,
    customer?.id,
    isAccountLoading,
    isAuthenticated,
    replaceCartItems,
  ])

  useEffect(() => {
    const customerId = customer?.id ? String(customer.id) : ''

    if (
      !isAuthenticated ||
      !customerId ||
      readyCustomerIdRef.current !== customerId
    ) {
      return
    }

    if (cartSyncTimerRef.current !== null) {
      window.clearTimeout(cartSyncTimerRef.current)
    }

    cartSyncTimerRef.current = window.setTimeout(() => {
      cartSyncTimerRef.current = null

      updateCustomerMarketplaceState({
        cartItems,
      }).catch(() => {
        // Keep the in-memory cart usable and retry on the next cart change.
      })
    }, 400)

    return () => {
      if (cartSyncTimerRef.current !== null) {
        window.clearTimeout(cartSyncTimerRef.current)
      }
    }
  }, [cartItems, customer?.id, isAuthenticated])

  return children
}
