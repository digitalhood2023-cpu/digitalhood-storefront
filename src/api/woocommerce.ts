const API_BASE_URL =
  import.meta.env.VITE_WC_STORE_API_URL ||
  'https://digitalhood.info/wp-json/wc/store';

export async function wcStoreFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `WooCommerce request failed: ${response.status}`);
  }

  return response.json();
}
