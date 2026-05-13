let storeNonce = localStorage.getItem('dh_store_nonce');

const API_BASE_URL = '/api/wc/store';
const NONCE_URL = '/api/digitalhood/v1/store-nonce';

async function getStoreNonce() {
  if (storeNonce) return storeNonce;

  const response = await fetch(NONCE_URL, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Could not fetch WooCommerce Store API nonce');
  }

  const data = await response.json();

  storeNonce = data.nonce;
  localStorage.setItem('dh_store_nonce', data.nonce);

  return data.nonce;
}

export async function wcStoreFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isWriteRequest =
    options.method && options.method.toUpperCase() !== 'GET';

  const nonce = isWriteRequest ? await getStoreNonce() : storeNonce;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(nonce ? { Nonce: nonce } : {}),
      ...options.headers,
    },
  });

  const newNonce = response.headers.get('Nonce');

  if (newNonce) {
    storeNonce = newNonce;
    localStorage.setItem('dh_store_nonce', newNonce);
  }

  if (!response.ok) {
    const errorText = await response.text();

    console.error('WooCommerce Store API Error:', errorText);

    localStorage.removeItem('dh_store_nonce');
    storeNonce = null;

    throw new Error(
      errorText || `WooCommerce request failed: ${response.status}`
    );
  }

  return response.json();
}
