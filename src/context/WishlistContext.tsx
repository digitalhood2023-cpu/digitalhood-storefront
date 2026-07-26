import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  addCustomerWishlistItem,
  getCustomerWishlist,
  removeCustomerWishlistItem,
} from '@/api/account'

import { useAccount } from '@/context/AccountContext'
import type { Product } from '@/types'

interface WishlistContextType {
  items: Product[]
  addToWishlist: (product: Product) => void
  removeFromWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleWishlist: (product: Product) => void
  refreshWishlist: () => Promise<void>
  isSyncing: boolean
  isWishlistDrawerOpen: boolean
  openWishlistDrawer: () => void
  closeWishlistDrawer: () => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined
)

function normalizeId(productId: string | number) {
  return String(productId)
}

function dedupeProducts(items: Product[]) {
  const map = new Map<string, Product>()

  for (const item of items) {
    if (!item?.id) continue

    map.set(normalizeId(item.id), item)
  }

  return Array.from(map.values())
}

function getProductId(product: Product | string | number) {
  if (typeof product === 'string' || typeof product === 'number') {
    return normalizeId(product)
  }

  return normalizeId(product.id)
}

function accountProductToWishlistProduct(product: any): Product {
  const image =
    product.image ||
    product.images?.[0]?.src ||
    product.images?.[0]?.url ||
    product.images?.[0] ||
    '/logo.jpg'

  const categories = Array.isArray(product.categories) ? product.categories : []
  const firstCategory = categories[0]

  return {
    id: String(product.id),
    name: product.name || 'Product',
    price: Number(product.price || 0),
    originalPrice:
      product.originalPrice !== undefined
        ? Number(product.originalPrice)
        : product.regular_price !== undefined
          ? Number(product.regular_price)
          : undefined,
    image: String(image || '/logo.jpg'),
    images: Array.isArray(product.images)
      ? product.images
          .map((item: any) => {
            if (typeof item === 'string') return item
            return item?.src || item?.url || ''
          })
          .filter(Boolean)
      : undefined,
    rating: Number(product.rating || product.average_rating || 0),
    reviews: Number(product.reviews || product.review_count || product.rating_count || 0),
    category:
      product.category ||
      firstCategory?.name ||
      firstCategory?.slug ||
      '',
    inStock:
      product.inStock !== undefined
        ? Boolean(product.inStock)
        : product.stockStatus
          ? product.stockStatus !== 'outofstock'
          : product.stock_status !== 'outofstock',
    stockCount:
      product.stockCount !== undefined
        ? Number(product.stockCount)
        : product.stock_quantity !== undefined && product.stock_quantity !== null
          ? Number(product.stock_quantity)
          : undefined,
    badge: product.badge || product.stock_label || undefined,
    description: product.description || product.short_description || undefined,
    sku: product.sku || undefined,
    brand: product.brand || undefined,
    condition: product.condition || undefined,
  }
}

function normalizeBackendWishlistProducts(products: any[]): Product[] {
  return (products || []).map(accountProductToWishlistProduct)
}


export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, customer } = useAccount()

  const [items, setItems] = useState<Product[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [isWishlistDrawerOpen, setIsWishlistDrawerOpen] = useState(false)

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated || !customer?.id) {
      setItems([])
      return
    }

    setIsSyncing(true)

    try {
      const response = await getCustomerWishlist()
      setItems(
        dedupeProducts(
          normalizeBackendWishlistProducts(response.products || [])
        )
      )
    } catch (error) {
      console.error(error)
    } finally {
      setIsSyncing(false)
    }
  }, [customer?.id, isAuthenticated])

  useEffect(() => {
    setItems([])
    setIsWishlistDrawerOpen(false)

    if (!isAuthenticated || !customer?.id) return

    let mounted = true
    setIsSyncing(true)

    getCustomerWishlist()
      .then((response) => {
        if (!mounted) return
        setItems((current) =>
          dedupeProducts([
            ...current,
            ...normalizeBackendWishlistProducts(response.products || []),
          ])
        )
      })
      .catch((error) => {
        if (mounted) console.error(error)
      })
      .finally(() => {
        if (mounted) setIsSyncing(false)
      })

    return () => {
      mounted = false
    }
  }, [customer?.id, isAuthenticated])

  const addToWishlist = useCallback(
    (product: Product) => {
      const productId = getProductId(product)

      setItems((prev) => {
        if (prev.some((item) => normalizeId(item.id) === productId)) {
          return prev
        }

        return dedupeProducts([...prev, product])
      })

      if (isAuthenticated) {
        addCustomerWishlistItem(Number(productId)).catch((error: unknown) => {
          console.error(error)
        })
      }
    },
    [isAuthenticated]
  )

  const removeFromWishlist = useCallback(
    (productId: string) => {
      const normalizedProductId = normalizeId(productId)

      setItems((prev) =>
        prev.filter((item) => normalizeId(item.id) !== normalizedProductId)
      )

      if (isAuthenticated) {
        removeCustomerWishlistItem(Number(normalizedProductId)).catch(
          (error: unknown) => {
            console.error(error)
          }
        )
      }
    },
    [isAuthenticated]
  )

  const openWishlistDrawer = useCallback(() => {
    setIsWishlistDrawerOpen(true)
  }, [])

  const closeWishlistDrawer = useCallback(() => {
    setIsWishlistDrawerOpen(false)
  }, [])

  const itemIds = useMemo(() => {
    return new Set(items.map((item) => normalizeId(item.id)))
  }, [items])

  const isInWishlist = useCallback(
    (productId: string) => {
      return itemIds.has(normalizeId(productId))
    },
    [itemIds]
  )

  const toggleWishlist = useCallback(
    (product: Product) => {
      const productId = getProductId(product)

      if (isInWishlist(productId)) {
        removeFromWishlist(productId)
      } else {
        addToWishlist(product)
      }
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  )

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        refreshWishlist,
        isSyncing,
        isWishlistDrawerOpen,
        openWishlistDrawer,
        closeWishlistDrawer,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)

  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }

  return context
}
