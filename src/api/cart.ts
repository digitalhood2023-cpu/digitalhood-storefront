import { wcStoreFetch } from './woocommerce';

export type CartItem = {
  key: string;
  id: number;
  name: string;
  quantity: number;
  prices?: {
    price: string;
    currency_code: string;
    currency_symbol: string;
  };
  images?: Array<{
    src: string;
    alt: string;
  }>;
};

export type Cart = {
  items: CartItem[];
  items_count: number;
  totals?: {
    total_price: string;
    currency_code: string;
    currency_symbol: string;
  };
};

export function getCart() {
  return wcStoreFetch<Cart>('/cart');
}

export function addCartItem(productId: number, quantity = 1) {
  return wcStoreFetch<Cart>('/cart/add-item', {
    method: 'POST',
    body: JSON.stringify({
      id: productId,
      quantity: String(quantity),
    }),
  });
}

export function removeCartItem(key: string) {
  return wcStoreFetch<Cart>('/cart/remove-item', {
    method: 'POST',
    body: JSON.stringify({
      key,
    }),
  });
}

export function updateCartItem(key: string, quantity: number) {
  return wcStoreFetch<Cart>('/cart/update-item', {
    method: 'POST',
    body: JSON.stringify({
      key,
      quantity: String(quantity),
    }),
  });
}
