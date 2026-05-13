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

export type CheckoutPayload = {
  billing_address: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    email: string;
    phone: string;
  };
  shipping_address: {
    first_name: string;
    last_name: string;
    company: string;
    address_1: string;
    address_2: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    phone: string;
  };
  payment_method: string;
  payment_data: Array<{
    key: string;
    value: string | boolean;
  }>;
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
    body: JSON.stringify({ key }),
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

export function submitCheckout(payload: CheckoutPayload) {
  return wcStoreFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}