import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
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

        set({
          items: [
            ...items,
            {
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(
                product.prices?.price ||
                  product.price ||
                  0
              ),
              regularPrice: Number(
                product.prices?.regular_price ||
                  product.regular_price ||
                  0
              ),
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
                  quantity: Math.max(
                    1,
                    item.quantity - 1
                  ),
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
