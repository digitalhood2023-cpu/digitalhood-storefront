let cartToken = localStorage.getItem('dh_cart_token');

const API_BASE_URL =
  import.meta.env.VITE_WC_STORE_API_URL ||
  'https://digitalhood.info/wp-json/wc/store';

export async function wcStoreFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(cartToken ? { 'Cart-Token': cartToken } : {}),
      ...options.headers,
    },
  });

  // Save WooCommerce cart session token
  const newCartToken = response.headers.get('Cart-Token');

  if (newCartToken) {
    cartToken = newCartToken;
    localStorage.setItem('dh_cart_token', newCartToken);
  }

  if (!response.ok) {
    const errorText = await response.text();

    console.error('WooCommerce Store API Error:', errorText);

    throw new Error(
      errorText || `WooCommerce request failed: ${response.status}`
    );
  }

  return response.json();
}
