import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { Product } from '@/types'
import { useAccount } from '@/context/AccountContext'

import {
  addCustomerRecentlyViewedItem,
  getAccountToken,
  getCustomerRecentlyViewed,
  removeCustomerRecentlyViewedItem,
  removeCustomerRecentlyViewedItems,
  type AccountProduct,
} from '@/api/account'
import {
  ACCOUNT_STATE_CLEARED_EVENT,
  RECENTLY_VIEWED_STORAGE_KEY,
} from '@/lib/marketplaceBrowserState'
import { getFastProductImage } from '@/lib/productImages'

export type RecentlyViewedProduct = Product & {
  slug?: string
  imageThumb?: string
  imageCard?: string
  imageMedium?: string
  imageLarge?: string
  imageOriginal?: string
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
  const images = (product.images || [])
    .map((image) =>
      typeof image === 'string'
        ? image
        : image?.src || image?.url || ''
    )
    .filter(Boolean)
  const imageFields = {
    image: product.image,
    imageThumb: product.imageThumb,
    imageCard: product.imageCard,
    imageMedium: product.imageMedium,
    imageLarge: product.imageLarge,
    imageOriginal: product.imageOriginal,
    images,
  }

  return {
    id: String(product.id),
    name: product.name,
    slug: product.slug || String(product.id),
    price: Number(product.price || 0),
    originalPrice: product.regular_price ? Number(product.regular_price) : undefined,
    image: getFastProductImage(imageFields, 'card'),
    images,
    imageThumb: product.imageThumb,
    imageCard: product.imageCard,
    imageMedium: product.imageMedium,
    imageLarge: product.imageLarge,
    imageOriginal: product.imageOriginal,
    rating: 0,
    reviews: 0,
    category: 'Marketplace',
    inStock: product.stock_status !== 'outofstock',
  }
}

function readLocalItems() {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : []

    return Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

function saveLocalItems(items: RecentlyViewedProduct[]) {
  if (typeof window === 'undefined') return

  if (items.length === 0) {
    localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY)
    return
  }

  localStorage.setItem(
    RECENTLY_VIEWED_STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_ITEMS))
  )
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
  const { isAuthenticated, isLoading: isAccountLoading, customer } = useAccount()
  const [items, setItems] = useState<RecentlyViewedProduct[]>(() =>
    getAccountToken() ? [] : readLocalItems()
  )
  const previousCustomerIdRef = useRef('')
  const wasAuthenticatedRef = useRef(false)

  useEffect(() => {
    if (isAccountLoading) return

    const customerId = customer?.id ? String(customer.id) : ''

    if (!isAuthenticated || !customerId) {
      if (wasAuthenticatedRef.current) {
        localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY)
        setItems([])
      }

      wasAuthenticatedRef.current = false
      previousCustomerIdRef.current = ''
      return
    }

    const isSwitchingAccounts = Boolean(
      previousCustomerIdRef.current &&
        previousCustomerIdRef.current !== customerId
    )

    previousCustomerIdRef.current = customerId
    wasAuthenticatedRef.current = true

    let mounted = true

    async function syncRecentlyViewed() {
      try {
        const localItems = isSwitchingAccounts ? [] : readLocalItems()
        const response = await getCustomerRecentlyViewed()
        const backendIds = new Set((response.productIds || []).map(String))

        for (const product of [...localItems].reverse()) {
          if (!backendIds.has(String(product.id))) {
            await addCustomerRecentlyViewedItem(Number(product.id))
          }
        }

        const updatedResponse =
          localItems.length > 0 ? await getCustomerRecentlyViewed() : response
        const backendItems = (updatedResponse.products || []).map(
          accountProductToRecentlyViewed
        )

        if (mounted) {
          setItems(dedupeItems([...backendItems, ...localItems]))
        }
      } catch {
        // Keep the local copy available if account synchronization is offline.
      }
    }

    syncRecentlyViewed()

    return () => {
      mounted = false
    }
  }, [customer?.id, isAccountLoading, isAuthenticated])

  useEffect(() => {
    if (isAccountLoading) return

    if (isAuthenticated) {
      localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY)
      return
    }

    saveLocalItems(items)
  }, [isAccountLoading, isAuthenticated, items])

  useEffect(() => {
    const clearItems = () => setItems([])

    window.addEventListener(ACCOUNT_STATE_CLEARED_EVENT, clearItems)

    return () => {
      window.removeEventListener(ACCOUNT_STATE_CLEARED_EVENT, clearItems)
    }
  }, [])

  const addToRecentlyViewed = useCallback((product: RecentlyViewedProduct) => {
    setItems((prev) => {
      const next = dedupeItems([product, ...prev.filter((item) => item.id !== product.id)])
      return next
    })

    if (isAuthenticated) {
      addCustomerRecentlyViewedItem(Number(product.id)).catch(() => {
        // Local history still works while account synchronization is offline.
      })
    }
  }, [isAuthenticated])

  const removeRecentlyViewed = useCallback((productId: string | number) => {
    setItems((prev) => prev.filter((item) => String(item.id) !== String(productId)))

    if (isAuthenticated) {
      removeCustomerRecentlyViewedItem(Number(productId)).catch(() => {
        // Local delete still works.
      })
    }
  }, [isAuthenticated])

  const removeSelectedRecentlyViewed = useCallback(
    (productIds: Array<string | number>) => {
      const ids = productIds.map(String)

      setItems((prev) => prev.filter((item) => !ids.includes(String(item.id))))

      if (isAuthenticated) {
        removeCustomerRecentlyViewedItems(productIds.map(Number).filter(Boolean)).catch(() => {
          // Local delete still works.
        })
      }
    },
    [isAuthenticated]
  )

  const clearRecentlyViewed = useCallback(() => {
    const productIds = items.map((item) => Number(item.id)).filter(Boolean)

    setItems([])
    localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY)

    if (isAuthenticated) {
      removeCustomerRecentlyViewedItems(productIds).catch(() => {
        // Local clear still works.
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
