let storeNonce = localStorage.getItem('dh_store_nonce');

const API_BASE_URL = '/api/wc/store';

async function refreshStoreNonce() {
  const response = await fetch(`${API_BASE_URL}/cart`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const nonce = response.headers.get('Nonce');

  if (nonce) {
    storeNonce = nonce;
    localStorage.setItem('dh_store_nonce', nonce);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Could not refresh WooCommerce nonce');
  }

  return storeNonce;
}

export async function wcStoreFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method?.toUpperCase() || 'GET';
  const isWriteRequest = method !== 'GET';

  if (isWriteRequest && !storeNonce) {
    await refreshStoreNonce();
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(storeNonce ? { Nonce: storeNonce } : {}),
      ...options.headers,
    },
  });

  let newNonce = response.headers.get('Nonce');

  if (newNonce) {
    storeNonce = newNonce;
    localStorage.setItem('dh_store_nonce', newNonce);
  }

  if (!response.ok && response.status === 401) {
    localStorage.removeItem('dh_store_nonce');
    storeNonce = null;

    await refreshStoreNonce();

    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(storeNonce ? { Nonce: storeNonce } : {}),
        ...options.headers,
      },
    });

    newNonce = response.headers.get('Nonce');

    if (newNonce) {
      storeNonce = newNonce;
      localStorage.setItem('dh_store_nonce', newNonce);
    }
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