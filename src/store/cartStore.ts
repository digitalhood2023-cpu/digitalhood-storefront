import { create } from 'zustand'

export type StockTone = 'success' | 'warning' | 'danger' | 'muted'

type VariationAttributes =
  | Record<string, string>
  | {
      name?: string
      option?: string
      value?: string
    }[]

export type CartProduct = {
  id: number
  productId?: number
  variationId?: number
  variation_id?: number
  variationLabel?: string
  variation_label?: string
  variationAttributes?: VariationAttributes
  attributes?: VariationAttributes

  name: string
  slug?: string
  type?: string
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

  purchasable?: boolean
  inStock?: boolean
  stock_status?: string
  stockStatus?: string
  stock_quantity?: number | null
  stockQuantity?: number | null
  manage_stock?: boolean
  manageStock?: boolean
  stock_label?: string
  stockLabel?: string
  stock_tone?: StockTone | string
  stockTone?: StockTone | string
  can_add_to_cart?: boolean
  canAddToCart?: boolean

  seller?: {
    id?: string
    customerId?: string | number
    storeName?: string
    key?: string
    url?: string
    verified?: boolean
    avatarUrl?: string
    profilePhotoUrl?: string
    feedbackText?: string
  } | null
  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
  sellerAvatarUrl?: string
  sellerFeedbackText?: string

  selectedVariation?: CartProduct | null
}

export type CartItem = {
  id: number
  productId: number
  variationId?: number
  variationLabel?: string
  name: string
  slug?: string
  price: number
  regularPrice: number
  image: string
  quantity: number

  stockStatus?: string
  stockQuantity?: number | null
  stockLabel?: string
  stockTone?: StockTone
  canAddToCart?: boolean

  sellerStoreName?: string
  sellerKey?: string
  sellerUrl?: string
  sellerVerified?: boolean
  sellerCustomerId?: string | number
  sellerAvatarUrl?: string
  sellerFeedbackText?: string
}

type CartStore = {
  items: CartItem[]

  addItem: (product: CartProduct, quantity?: number) => boolean
  removeItem: (productId: number) => void
  increaseQuantity: (productId: number) => void
  decreaseQuantity: (productId: number) => void
  clearCart: () => void
  replaceItems: (items: CartItem[]) => void

  getCartCount: () => number
  getSubtotal: () => number
}

const normalizePrice = (price: number | string | undefined): number => {
  if (price === undefined || price === null || price === '') return 0

  const numericPrice = typeof price === 'string' ? Number(price) : price

  return Number.isNaN(numericPrice) ? 0 : numericPrice
}

const normalizeStockTone = (tone?: string): StockTone => {
  if (
    tone === 'success' ||
    tone === 'warning' ||
    tone === 'danger' ||
    tone === 'muted'
  ) {
    return tone
  }

  return 'muted'
}

const getStockStatus = (product: CartProduct): string => {
  return (
    product.stock_status ||
    product.stockStatus ||
    (product.inStock === false ? 'outofstock' : 'instock')
  )
}

const getStockQuantity = (product: CartProduct): number | null => {
  const value = product.stock_quantity ?? product.stockQuantity

  if (value === null || value === undefined) {
    return null
  }

  const quantity = Number(value)

  return Number.isNaN(quantity) ? null : quantity
}

const getManageStock = (product: CartProduct): boolean => {
  return Boolean(product.manage_stock ?? product.manageStock ?? false)
}

const getCanAddToCart = (product: CartProduct): boolean => {
  if (product.can_add_to_cart !== undefined) {
    return Boolean(product.can_add_to_cart)
  }

  if (product.canAddToCart !== undefined) {
    return Boolean(product.canAddToCart)
  }

  if (product.purchasable === false) {
    return false
  }

  const stockStatus = getStockStatus(product)
  const stockQuantity = getStockQuantity(product)
  const manageStock = getManageStock(product)

  if (stockStatus === 'outofstock') {
    return false
  }

  if (manageStock && stockQuantity !== null && stockQuantity <= 0) {
    return false
  }

  return true
}

const getStockLabel = (product: CartProduct): string => {
  if (product.stock_label || product.stockLabel) {
    return product.stock_label || product.stockLabel || 'Unavailable'
  }

  if (product.purchasable === false) {
    return 'Unavailable'
  }

  const stockStatus = getStockStatus(product)
  const stockQuantity = getStockQuantity(product)
  const manageStock = getManageStock(product)

  if (stockStatus === 'outofstock') {
    return 'Out of stock'
  }

  if (stockStatus === 'onbackorder') {
    return 'Available on backorder'
  }

  if (manageStock && stockQuantity !== null) {
    if (stockQuantity <= 0) {
      return 'Out of stock'
    }

    if (stockQuantity <= 3) {
      return `Almost sold out - ${stockQuantity} left`
    }

    if (stockQuantity <= 10) {
      return `Only ${stockQuantity} left`
    }
  }

  return 'In stock'
}

const getStockTone = (product: CartProduct): StockTone => {
  if (product.stock_tone || product.stockTone) {
    return normalizeStockTone(product.stock_tone || product.stockTone)
  }

  if (!getCanAddToCart(product)) {
    return 'danger'
  }

  const stockStatus = getStockStatus(product)
  const stockQuantity = getStockQuantity(product)
  const manageStock = getManageStock(product)

  if (stockStatus === 'onbackorder') {
    return 'warning'
  }

  if (manageStock && stockQuantity !== null && stockQuantity <= 10) {
    return 'warning'
  }

  return 'success'
}

const getCartItemId = (product: CartProduct): number => {
  return Number(product.variationId || product.variation_id || product.id)
}

const getProductId = (product: CartProduct): number => {
  return Number(product.productId || product.id)
}

const getVariationId = (product: CartProduct): number | undefined => {
  const variationId = product.variationId || product.variation_id

  return variationId ? Number(variationId) : undefined
}

const getVariationLabelFromAttributes = (
  attributes?: VariationAttributes
): string => {
  if (!attributes) return ''

  if (Array.isArray(attributes)) {
    return attributes
      .map((attribute) => attribute.option || attribute.value || attribute.name || '')
      .filter(Boolean)
      .join(' / ')
  }

  return Object.values(attributes)
    .filter(Boolean)
    .join(' / ')
}

const getSellerInfo = (product: CartProduct) => {
  const storeName =
    product.sellerStoreName ||
    product.seller?.storeName ||
    'DigitalHood'

  const sellerKey =
    product.sellerKey ||
    product.seller?.key ||
    (storeName.toLowerCase() === 'digitalhood'
      ? 'digitalhood'
      : '')

  const sellerUrl =
    product.sellerUrl ||
    product.seller?.url ||
    (sellerKey ? `/seller/${encodeURIComponent(sellerKey)}` : '/seller/digitalhood')

  const isDigitalHood =
    sellerKey === 'digitalhood' ||
    storeName.toLowerCase() === 'digitalhood'

  return {
    sellerStoreName: storeName,
    sellerKey,
    sellerUrl,
    sellerVerified: Boolean(product.sellerVerified || product.seller?.verified || isDigitalHood),
    sellerCustomerId: product.sellerCustomerId || product.seller?.customerId || '',
    sellerAvatarUrl:
      product.sellerAvatarUrl ||
      product.seller?.avatarUrl ||
      product.seller?.profilePhotoUrl ||
      (isDigitalHood ? '/logo.jpg' : ''),
    sellerFeedbackText:
      product.sellerFeedbackText ||
      product.seller?.feedbackText ||
      (isDigitalHood ? '100% positive' : 'New seller'),
  }
}

const getVariationLabel = (product: CartProduct): string => {
  if (product.variationLabel || product.variation_label) {
    return product.variationLabel || product.variation_label || ''
  }

  if (
    product.selectedVariation?.variationLabel ||
    product.selectedVariation?.variation_label
  ) {
    return (
      product.selectedVariation.variationLabel ||
      product.selectedVariation.variation_label ||
      ''
    )
  }

  const selectedVariationAttributes =
    product.selectedVariation?.variationAttributes ||
    product.selectedVariation?.attributes

  const selectedVariationLabel =
    getVariationLabelFromAttributes(selectedVariationAttributes)

  if (selectedVariationLabel) return selectedVariationLabel

  return getVariationLabelFromAttributes(
    product.variationAttributes || product.attributes
  )
}

export const useCartStore = create<CartStore>()(
  (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const selectedProduct = product.selectedVariation || product

        if (!getCanAddToCart(selectedProduct)) {
          alert(getStockLabel(selectedProduct))
          return false
        }

        const items = get().items

        const cartItemId = getCartItemId(product)
        const productId = getProductId(product)
        const variationId = getVariationId(product)
        const variationLabel = getVariationLabel(product)
        const sellerInfo = getSellerInfo(product)

        const existingItem = items.find((item) => item.id === cartItemId)

        const safeQuantity = Math.max(1, Number(quantity || 1))

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === cartItemId
                ? {
                    ...item,
                    quantity: item.quantity + safeQuantity,
                    variationLabel: item.variationLabel || variationLabel,
                    sellerStoreName: item.sellerStoreName || sellerInfo.sellerStoreName,
                    sellerKey: item.sellerKey || sellerInfo.sellerKey,
                    sellerUrl: item.sellerUrl || sellerInfo.sellerUrl,
                    sellerVerified: item.sellerVerified || sellerInfo.sellerVerified,
                    sellerCustomerId: item.sellerCustomerId || sellerInfo.sellerCustomerId,
                    sellerAvatarUrl: item.sellerAvatarUrl || sellerInfo.sellerAvatarUrl,
                    sellerFeedbackText: item.sellerFeedbackText || sellerInfo.sellerFeedbackText,
                  }
                : item
            ),
          })

          return true
        }

        const price = normalizePrice(
          selectedProduct.prices?.price ?? selectedProduct.price ?? product.price
        )

        const regularPrice = normalizePrice(
          selectedProduct.prices?.regular_price ??
            selectedProduct.regular_price ??
            product.prices?.regular_price ??
            product.regular_price ??
            selectedProduct.price ??
            product.price
        )

        set({
          items: [
            ...items,
            {
              id: cartItemId,
              productId,
              variationId,
              variationLabel,
              name: product.name,
              slug: product.slug,
              price,
              regularPrice,
              image:
                selectedProduct.images?.[0]?.src ||
                product.images?.[0]?.src ||
                selectedProduct.image ||
                product.image ||
                '',
              quantity: safeQuantity,
              stockStatus: getStockStatus(selectedProduct),
              stockQuantity: getStockQuantity(selectedProduct),
              stockLabel: getStockLabel(selectedProduct),
              stockTone: getStockTone(selectedProduct),
              canAddToCart: getCanAddToCart(selectedProduct),
              sellerStoreName: sellerInfo.sellerStoreName,
              sellerKey: sellerInfo.sellerKey,
              sellerUrl: sellerInfo.sellerUrl,
              sellerVerified: sellerInfo.sellerVerified,
              sellerCustomerId: sellerInfo.sellerCustomerId,
              sellerAvatarUrl: sellerInfo.sellerAvatarUrl,
              sellerFeedbackText: sellerInfo.sellerFeedbackText,
            },
          ],
        })

        return true
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((item) => item.id !== productId),
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

      replaceItems: (items) => {
        set({ items: Array.isArray(items) ? items : [] })
      },

      getCartCount: () => {
        return get().items.reduce(
          (total, item) => total + item.quantity,
          0
        )
      },

      getSubtotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        )
      },
    })
)