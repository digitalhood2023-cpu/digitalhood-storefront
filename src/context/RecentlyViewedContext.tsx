import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import type { Product } from '@/types'

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

const STORAGE_KEY = 'digitalhood_recently_viewed'
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

function readLocalItems() {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []

    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function saveLocalItems(items: RecentlyViewedProduct[]) {
  if (typeof window === 'undefined') return

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
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
  const [items, setItems] = useState<RecentlyViewedProduct[]>(readLocalItems)

  useEffect(() => {
    saveLocalItems(items)
  }, [items])

  useEffect(() => {
    let mounted = true

    getCustomerRecentlyViewed()
      .then((response) => {
        if (!mounted) return

        const backendItems = (response.products || []).map(accountProductToRecentlyViewed)

        setItems((current) => dedupeItems([...backendItems, ...current]))
      })
      .catch(() => {
        // Guest users or signed-out users continue with local history.
      })

    return () => {
      mounted = false
    }
  }, [])

  const addToRecentlyViewed = useCallback((product: RecentlyViewedProduct) => {
    setItems((prev) => {
      const next = dedupeItems([product, ...prev.filter((item) => item.id !== product.id)])
      return next
    })

    addCustomerRecentlyViewedItem(Number(product.id)).catch(() => {
      // Local history still works for guests/offline sessions.
    })
  }, [])

  const removeRecentlyViewed = useCallback((productId: string | number) => {
    setItems((prev) => prev.filter((item) => String(item.id) !== String(productId)))

    removeCustomerRecentlyViewedItem(Number(productId)).catch(() => {
      // Local delete still works.
    })
  }, [])

  const removeSelectedRecentlyViewed = useCallback(
    (productIds: Array<string | number>) => {
      const ids = productIds.map(String)

      setItems((prev) => prev.filter((item) => !ids.includes(String(item.id))))

      removeCustomerRecentlyViewedItems(productIds.map(Number).filter(Boolean)).catch(() => {
        // Local delete still works.
      })
    },
    []
  )

  const clearRecentlyViewed = useCallback(() => {
    const productIds = items.map((item) => Number(item.id)).filter(Boolean)

    setItems([])
    localStorage.removeItem(STORAGE_KEY)

    removeCustomerRecentlyViewedItems(productIds).catch(() => {
      // Local clear still works.
    })
  }, [items])

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
