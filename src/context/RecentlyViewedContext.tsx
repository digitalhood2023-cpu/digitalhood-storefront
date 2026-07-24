import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import type { Product } from '@/types'

import { useAccount } from '@/context/AccountContext'

import {
  addCustomerRecentlyViewedItem,
  getCustomerRecentlyViewed,
  removeCustomerRecentlyViewedItem,
  removeCustomerRecentlyViewedItems,
  type AccountProduct,
} from '@/api/account'

export type RecentlyViewedProduct = Product & {
  slug?: string
}

interface RecentlyViewedContextType {
  items: RecentlyViewedProduct[]
  addToRecentlyViewed: (product: RecentlyViewedProduct) => void
  removeRecentlyViewed: (productId: string | number) => void
  removeSelectedRecentlyViewed: (productIds: Array<string | number>) => void
  clearRecentlyViewed: () => void
  hasItems: boolean
}

const RecentlyViewedContext =
  createContext<RecentlyViewedContextType | undefined>(undefined)

const MAX_ITEMS = 50

function accountProductToRecentlyViewed(product: AccountProduct): RecentlyViewedProduct {
  return {
    id: String(product.id),
    name: product.name,
    slug: product.slug || String(product.id),
    price: Number(product.price || 0),
    originalPrice: product.regular_price ? Number(product.regular_price) : undefined,
    image: product.images?.[0]?.src || '/logo.jpg',
    rating: 0,
    reviews: 0,
    category: 'Marketplace',
    inStock: product.stock_status !== 'outofstock',
  }
}

function dedupeItems(items: RecentlyViewedProduct[]) {
  const map = new Map<string, RecentlyViewedProduct>()

  for (const item of items) {
    if (!item?.id) continue
    map.set(String(item.id), item)
  }

  return Array.from(map.values()).slice(0, MAX_ITEMS)
}

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const { customer, isAuthenticated } = useAccount()
  const [items, setItems] = useState<RecentlyViewedProduct[]>([])

  useEffect(() => {
    setItems([])

    if (!isAuthenticated || !customer?.id) return

    let mounted = true

    getCustomerRecentlyViewed()
      .then((response) => {
        if (!mounted) return
        setItems(
          dedupeItems(
            (response.products || []).map(accountProductToRecentlyViewed)
          )
        )
      })
      .catch((error) => {
        if (mounted) {
          console.error('[Recently Viewed] Unable to load account history.', error)
        }
      })

    return () => {
      mounted = false
    }
  }, [customer?.id, isAuthenticated])

  const addToRecentlyViewed = useCallback((product: RecentlyViewedProduct) => {
    setItems((prev) => {
      const next = dedupeItems([product, ...prev.filter((item) => item.id !== product.id)])
      return next
    })

    if (isAuthenticated) {
      addCustomerRecentlyViewedItem(Number(product.id)).catch(() => {
        // The in-memory view remains available during a temporary API failure.
      })
    }
  }, [isAuthenticated])

  const removeRecentlyViewed = useCallback((productId: string | number) => {
    setItems((prev) => prev.filter((item) => String(item.id) !== String(productId)))

    if (isAuthenticated) {
      removeCustomerRecentlyViewedItem(Number(productId)).catch(() => {
        // The in-memory removal remains applied during a temporary API failure.
      })
    }
  }, [isAuthenticated])

  const removeSelectedRecentlyViewed = useCallback(
    (productIds: Array<string | number>) => {
      const ids = productIds.map(String)

      setItems((prev) => prev.filter((item) => !ids.includes(String(item.id))))

      if (isAuthenticated) {
        removeCustomerRecentlyViewedItems(productIds.map(Number).filter(Boolean)).catch(() => {
          // The in-memory removal remains applied during a temporary API failure.
        })
      }
    },
    [isAuthenticated]
  )

  const clearRecentlyViewed = useCallback(() => {
    const productIds = items.map((item) => Number(item.id)).filter(Boolean)

    setItems([])

    if (isAuthenticated) {
      removeCustomerRecentlyViewedItems(productIds).catch(() => {
        // The in-memory clear remains applied during a temporary API failure.
      })
    }
  }, [isAuthenticated, items])

  const hasItems = items.length > 0

  return (
    <RecentlyViewedContext.Provider
      value={{
        items,
        addToRecentlyViewed,
        removeRecentlyViewed,
        removeSelectedRecentlyViewed,
        clearRecentlyViewed,
        hasItems,
      }}
    >
      {children}
    </RecentlyViewedContext.Provider>
  )
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext)

  if (context === undefined) {
    throw new Error('useRecentlyViewed must be used within a RecentlyViewedProvider')
  }

  return context
}
