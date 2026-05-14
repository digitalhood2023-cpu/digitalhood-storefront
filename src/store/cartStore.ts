import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartProduct = {
  id: number
  name: string
  slug?: string
  price?: number | string
  regular_price?: number | string
  prices?: {
    price?: number | string
    regular_price?: number | string
  }
  images?: {
    src: string
  }[]
  image?: string
}

export type CartItem = {
  id: number
  name: string
  slug?: string
  price: number
  regularPrice: number
  image: string
  quantity: number
}

type CartStore = {
  items: CartItem[]

  addItem: (product: CartProduct, quantity?: number) => void
  removeItem: (productId: number) => void
  increaseQuantity: (productId: number) => void
  decreaseQuantity: (productId: number) => void
  clearCart: () => void

  getCartCount: () => number
  getSubtotal: () => number
}

const normalizePrice = (price: number | string | undefined): number => {
  if (!price) return 0

  const numericPrice =
    typeof price === 'string' ? Number(price) : price

  return Number.isNaN(numericPrice) ? 0 : numericPrice
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items
        const existingItem = items.find(
          (item) => item.id === product.id
        )

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + quantity,
                  }
                : item
            ),
          })

          return
        }

        const price = normalizePrice(
          product.prices?.price ?? product.price
        )

        const regularPrice = normalizePrice(
          product.prices?.regular_price ??
            product.regular_price ??
            product.price
        )

        set({
          items: [
            ...items,
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price,
              regularPrice,
              image:
                product.images?.[0]?.src ||
                product.image ||
                '',
              quantity,
            },
          ],
        })
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(
            (item) => item.id !== productId
          ),
        })
      },

      increaseQuantity: (productId) => {
        set({
          items: get().items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          ),
        })
      },

      decreaseQuantity: (productId) => {
        set({
          items: get().items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity: Math.max(1, item.quantity - 1),
                }
              : item
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      getCartCount: () => {
        return get().items.reduce(
          (total, item) => total + item.quantity,
          0
        )
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) =>
            total + item.price * item.quantity,
          0
        )
      },
    }),
    {
      name: 'digitalhood-cart',
    }
  )
)
