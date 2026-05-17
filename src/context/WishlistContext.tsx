import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { Product } from '@/types'

import { useAccount } from '@/context/AccountContext'

import {
  addCustomerWishlistItem,
  getCustomerWishlist,
  removeCustomerWishlistItem,
  type AccountProduct,
} from '@/api/account'

interface WishlistContextType {
  items: Product[]
  isLoading: boolean
  isSyncing: boolean
  error: string
  addToWishlist: (product: Product) => Promise<void>
  removeFromWishlist: (productId: string | number) => Promise<void>
  isInWishlist: (productId: string | number) => boolean
  toggleWishlist: (product: Product) => Promise<void>
  refreshWishlist: () => Promise<void>
  clearWishlistError: () => void
}

const WISHLIST_STORAGE_KEY = 'digitalhood-wishlist'

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

function normalizeId(productId: string | number) {
  return String(productId)
}

function getNumericProductId(productId: string | number) {
  return Number(productId)
}

function dedupeProducts(products: Product[]) {
  const map = new Map<string, Product>()

  products.forEach((product) => {
    if (!product?.id) return

    map.set(normalizeId(product.id), product)
  })

  return Array.from(map.values())
}

function getProductImage(product: AccountProduct) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0]?.src || ''
  }

  return ''
}

function normalizeAccountProduct(product: AccountProduct): Product {
  const image = getProductImage(product)

  const normalizedProduct = {
    ...product,
    id: String(product.id),
    name: product.name,
    slug: product.slug || String(product.id),
    price: product.price || '0',
    regularPrice: product.regular_price || product.price || '0',
    salePrice: product.sale_price || '',
    image,
    images: product.images || [],
    stockStatus: product.stock_status,
    stockLabel: product.stock_label,
    stockTone: product.stock_tone,
    canAddToCart: product.can_add_to_cart !== false,
  }

  return normalizedProduct as unknown as Product
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

function saveStoredWishlist(items: Product[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage failures so wishlist UI does not break.
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, customer } = useAccount()

  const [items, setItems] = useState<Product[]>(() => loadStoredWishlist())
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')

  const lastCustomerIdRef = useRef<number | null>(null)
  const hasMergedLocalWishlistRef = useRef(false)

  const clearWishlistError = useCallback(() => {
    setError('')
  }, [])

  const replaceWishlistFromAccountProducts = useCallback(
    (products: AccountProduct[]) => {
      const normalizedProducts = products.map(normalizeAccountProduct)
      const deduped = dedupeProducts(normalizedProducts)

      setItems(deduped)
      saveStoredWishlist(deduped)
    },
    []
  )

  const refreshWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      const localItems = loadStoredWishlist()
      setItems(localItems)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await getCustomerWishlist()
      replaceWishlistFromAccountProducts(response.products || [])
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load your wishlist right now.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, replaceWishlistFromAccountProducts])

  useEffect(() => {
    if (!isAuthenticated) {
      lastCustomerIdRef.current = null
      hasMergedLocalWishlistRef.current = false

      const localItems = loadStoredWishlist()
      setItems(localItems)
      return
    }

    if (!customer?.id) return

    const customerChanged = lastCustomerIdRef.current !== customer.id

    if (customerChanged) {
      lastCustomerIdRef.current = customer.id
      hasMergedLocalWishlistRef.current = false
    }

    let mounted = true

    async function loadAndMergeWishlist() {
      setIsLoading(true)
      setError('')

      try {
        const localItems = loadStoredWishlist()
        const response = await getCustomerWishlist()

        let accountProducts = (response.products || []).map(normalizeAccountProduct)

        if (!hasMergedLocalWishlistRef.current && localItems.length > 0) {
          hasMergedLocalWishlistRef.current = true

          const accountProductIds = new Set(
            accountProducts.map((product) => normalizeId(product.id))
          )

          const localProductsToSync = localItems.filter((product) => {
            return product?.id && !accountProductIds.has(normalizeId(product.id))
          })

          for (const product of localProductsToSync) {
            try {
              await addCustomerWishlistItem(getNumericProductId(product.id))
              accountProducts = dedupeProducts([...accountProducts, product])
            } catch {
              accountProducts = dedupeProducts([...accountProducts, product])
            }
          }

          const refreshedResponse = await getCustomerWishlist()

          accountProducts = refreshedResponse.products?.length
            ? refreshedResponse.products.map(normalizeAccountProduct)
            : accountProducts
        }

        if (mounted) {
          const deduped = dedupeProducts(accountProducts)
          setItems(deduped)
          saveStoredWishlist(deduped)
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Unable to sync your wishlist right now.'
          )

          const localItems = loadStoredWishlist()
          setItems(localItems)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    loadAndMergeWishlist()

    return () => {
      mounted = false
    }
  }, [customer?.id, isAuthenticated])

  useEffect(() => {
    saveStoredWishlist(items)
  }, [items])

  const addToWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return

      const productId = normalizeId(product.id)

      setError('')

      setItems((prev) => {
        if (prev.find((item) => normalizeId(item.id) === productId)) {
          return prev
        }

        return dedupeProducts([...prev, product])
      })

      if (!isAuthenticated) return

      setIsSyncing(true)

      try {
        const response = await addCustomerWishlistItem(
          getNumericProductId(product.id)
        )

        if (response.products?.length) {
          replaceWishlistFromAccountProducts(response.products)
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to save this item to your wishlist.'
        )
      } finally {
        setIsSyncing(false)
      }
    },
    [isAuthenticated, replaceWishlistFromAccountProducts]
  )

  const removeFromWishlist = useCallback(
    async (productId: string | number) => {
      const normalizedProductId = normalizeId(productId)

      setError('')

      const previousItems = items

      setItems((prev) =>
        prev.filter((item) => normalizeId(item.id) !== normalizedProductId)
      )

      if (!isAuthenticated) return

      setIsSyncing(true)

      try {
        const response = await removeCustomerWishlistItem(
          getNumericProductId(productId)
        )

        if (response.products) {
          replaceWishlistFromAccountProducts(response.products)
        }
      } catch (requestError) {
        setItems(previousItems)

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to remove this item from your wishlist.'
        )
      } finally {
        setIsSyncing(false)
      }
    },
    [isAuthenticated, items, replaceWishlistFromAccountProducts]
  )

  const isInWishlist = useCallback(
    (productId: string | number) => {
      return items.some(
        (item) => normalizeId(item.id) === normalizeId(productId)
      )
    },
    [items]
  )

  const toggleWishlist = useCallback(
    async (product: Product) => {
      if (!product?.id) return

      const productId = normalizeId(product.id)

      if (isInWishlist(productId)) {
        await removeFromWishlist(productId)
      } else {
        await addToWishlist(product)
      }
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  )

  const value = useMemo<WishlistContextType>(
    () => ({
      items,
      isLoading,
      isSyncing,
      error,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      refreshWishlist,
      clearWishlistError,
    }),
    [
      items,
      isLoading,
      isSyncing,
      error,
      addToWishlist,
      removeFromWishlist,
      isInWishlist,
      toggleWishlist,
      refreshWishlist,
      clearWishlistError,
    ]
  )

  return (
    <WishlistContext.Provider value={value}>
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