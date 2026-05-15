import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';
import type { CartItem, Product } from '@/types';

type MarketplaceStockTone = 'success' | 'warning' | 'danger' | 'muted';

type MarketplaceStockBadge = {
  label: string;
  tone: MarketplaceStockTone;
  canAddToCart: boolean;
};

type ProductLike = Product & {
  type?: string;
  stock_status?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  purchasable?: boolean;
  stock_label?: string;
  stock_tone?: MarketplaceStockTone | string;
  can_add_to_cart?: boolean;
  variation_id?: number | string;
  variationId?: number | string;
  selectedVariation?: ProductLike | null;
  price?: number | string;
};

type CartItemLike = CartItem & {
  selectedVariation?: ProductLike | null;
  variation_id?: number | string;
  variationId?: number | string;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (
    product: Product,
    quantity?: number,
    variant?: string,
    selectedVariation?: ProductLike | null
  ) => boolean;
  removeFromCart: (productId: string, variant?: string) => void;
  updateQuantity: (productId: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getStockBadge(item?: ProductLike | null): MarketplaceStockBadge {
  if (!item) {
    return {
      label: 'Unavailable',
      tone: 'muted',
      canAddToCart: false,
    };
  }

  if (item.can_add_to_cart === false) {
    return {
      label: item.stock_label || 'Unavailable',
      tone: normalizeTone(item.stock_tone),
      canAddToCart: false,
    };
  }

  if (item.stock_label) {
    return {
      label: item.stock_label,
      tone: normalizeTone(item.stock_tone),
      canAddToCart: item.can_add_to_cart ?? true,
    };
  }

  if (item.purchasable === false) {
    return {
      label: 'Unavailable',
      tone: 'muted',
      canAddToCart: false,
    };
  }

  if (item.stock_status === 'outofstock') {
    return {
      label: 'Out of stock',
      tone: 'danger',
      canAddToCart: false,
    };
  }

  if (item.stock_status === 'onbackorder') {
    return {
      label: 'Available on backorder',
      tone: 'warning',
      canAddToCart: true,
    };
  }

  if (
    item.manage_stock &&
    item.stock_quantity !== null &&
    item.stock_quantity !== undefined
  ) {
    const quantity = Number(item.stock_quantity);

    if (Number.isNaN(quantity) || quantity <= 0) {
      return {
        label: 'Out of stock',
        tone: 'danger',
        canAddToCart: false,
      };
    }

    if (quantity <= 3) {
      return {
        label: `Almost sold out - ${quantity} left`,
        tone: 'warning',
        canAddToCart: true,
      };
    }

    if (quantity <= 10) {
      return {
        label: `Only ${quantity} left`,
        tone: 'warning',
        canAddToCart: true,
      };
    }
  }

  if (item.stock_status === 'instock' || !item.stock_status) {
    return {
      label: 'In stock',
      tone: 'success',
      canAddToCart: true,
    };
  }

  return {
    label: 'Check availability',
    tone: 'muted',
    canAddToCart: false,
  };
}

function normalizeTone(tone?: string): MarketplaceStockTone {
  if (
    tone === 'success' ||
    tone === 'warning' ||
    tone === 'danger' ||
    tone === 'muted'
  ) {
    return tone;
  }

  return 'muted';
}

function canAddProductToCart(
  product: ProductLike,
  selectedVariation?: ProductLike | null
): boolean {
  if (!product) return false;

  if (product.type === 'variable') {
    if (!selectedVariation) return false;
    return getStockBadge(selectedVariation).canAddToCart;
  }

  return getStockBadge(product).canAddToCart;
}

function getVariationId(
  product: ProductLike,
  selectedVariation?: ProductLike | null
): string {
  const variationId =
    selectedVariation?.id ||
    selectedVariation?.variation_id ||
    selectedVariation?.variationId ||
    product.variation_id ||
    product.variationId ||
    '';

  return String(variationId || '');
}

function getCartItemKey(
  productId: string,
  variant?: string,
  variationId?: string
): string {
  return `${productId}::${variant || ''}::${variationId || ''}`;
}

function getItemKey(item: CartItemLike): string {
  const product = item.product as ProductLike;
  const productId = String(product.id);
  const variationId = String(
    item.selectedVariation?.id ||
      item.variation_id ||
      item.variationId ||
      product.selectedVariation?.id ||
      product.variation_id ||
      product.variationId ||
      ''
  );

  return getCartItemKey(productId, item.variant, variationId);
}

function getProductPrice(product: ProductLike): number {
  const price = Number(product.price || 0);
  return Number.isNaN(price) ? 0 : price;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback(
    (
      product: Product,
      quantity = 1,
      variant?: string,
      selectedVariation?: ProductLike | null
    ) => {
      const normalizedProduct = product as ProductLike;
      const normalizedVariation = selectedVariation || null;
      const stockItem = normalizedVariation || normalizedProduct;
      const stockBadge = getStockBadge(stockItem);

      if (!canAddProductToCart(normalizedProduct, normalizedVariation)) {
        alert(stockBadge.label || 'This product is currently unavailable.');
        return false;
      }

      const safeQuantity = Math.max(1, Number(quantity || 1));
      const productId = String(normalizedProduct.id);
      const variationId = getVariationId(normalizedProduct, normalizedVariation);
      const incomingKey = getCartItemKey(productId, variant, variationId);

      setItems((prev) => {
        const existingItem = prev.find((item) => {
          return getItemKey(item as CartItemLike) === incomingKey;
        });

        if (existingItem) {
          return prev.map((item) => {
            if (getItemKey(item as CartItemLike) !== incomingKey) {
              return item;
            }

            return {
              ...item,
              quantity: item.quantity + safeQuantity,
            };
          });
        }

        const productForCart: ProductLike = {
          ...normalizedProduct,
          price: normalizedVariation?.price || normalizedProduct.price,
          stock_status:
            normalizedVariation?.stock_status || normalizedProduct.stock_status,
          stock_quantity:
            normalizedVariation?.stock_quantity ??
            normalizedProduct.stock_quantity,
          stock_label:
            normalizedVariation?.stock_label || normalizedProduct.stock_label,
          stock_tone:
            normalizedVariation?.stock_tone || normalizedProduct.stock_tone,
          can_add_to_cart:
            normalizedVariation?.can_add_to_cart ??
            normalizedProduct.can_add_to_cart,
          variation_id: variationId || undefined,
          variationId: variationId || undefined,
          selectedVariation: normalizedVariation,
        };

        const newItem = {
          product: productForCart as Product,
          quantity: safeQuantity,
          variant,
          selectedVariation: normalizedVariation,
          variation_id: variationId || undefined,
          variationId: variationId || undefined,
        } as CartItem;

        return [...prev, newItem];
      });

      return true;
    },
    []
  );

  const removeFromCart = useCallback((productId: string, variant?: string) => {
    setItems((prev) =>
      prev.filter((item) => {
        const itemProductId = String(item.product.id);

        if (variant === undefined) {
          return itemProductId !== String(productId);
        }

        return !(itemProductId === String(productId) && item.variant === variant);
      })
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number, variant?: string) => {
      if (quantity <= 0) {
        removeFromCart(productId, variant);
        return;
      }

      setItems((prev) =>
        prev.map((item) => {
          const itemProductId = String(item.product.id);

          if (variant === undefined && itemProductId === String(productId)) {
            return { ...item, quantity };
          }

          if (itemProductId === String(productId) && item.variant === variant) {
            return { ...item, quantity };
          }

          return item;
        })
      );
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalPrice = items.reduce((sum, item) => {
    const product = item.product as ProductLike;
    return sum + getProductPrice(product) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
