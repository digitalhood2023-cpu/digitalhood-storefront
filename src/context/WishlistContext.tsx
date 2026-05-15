import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { Product } from '@/types'

interface WishlistContextType {
  items: Product[]
  addToWishlist: (product: Product) => void
  removeFromWishlist: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleWishlist: (product: Product) => void
}

const WISHLIST_STORAGE_KEY = 'digitalhood-wishlist'

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

function normalizeId(productId: string | number) {
  return String(productId)
}

function loadStoredWishlist(): Product[] {
  if (typeof window === 'undefined') return []

  try {
    const saved = window.localStorage.getItem(WISHLIST_STORAGE_KEY)

    if (!saved) return []

    const parsed = JSON.parse(saved)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>(() => loadStoredWishlist())

  useEffect(() => {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addToWishlist = useCallback((product: Product) => {
    setItems((prev) => {
      const productId = normalizeId(product.id)

      if (prev.find((item) => normalizeId(item.id) === productId)) {
        return prev
      }

      return [...prev, product]
    })
  }, [])

  const removeFromWishlist = useCallback((productId: string) => {
    setItems((prev) =>
      prev.filter((item) => normalizeId(item.id) !== normalizeId(productId))
    )
  }, [])

  const isInWishlist = useCallback(
    (productId: string) => {
      return items.some(
        (item) => normalizeId(item.id) === normalizeId(productId)
      )
    },
    [items]
  )

  const toggleWishlist = useCallback(
    (product: Product) => {
      const productId = normalizeId(product.id)

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