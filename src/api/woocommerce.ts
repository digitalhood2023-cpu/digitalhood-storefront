let storeNonce: string | null = localStorage.getItem('dh_store_nonce');

const API_BASE_URL = '/api/wc/store';

function buildHeaders(options: RequestInit = {}): HeadersInit {
  const headers = new Headers(options.headers);

  headers.set('Content-Type', 'application/json');

  if (storeNonce) {
    headers.set('Nonce', storeNonce);
  }

  return headers;
}

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
    headers: buildHeaders(options),
  });

  const newNonce = response.headers.get('Nonce');

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
      headers: buildHeaders(options),
    });

    const retryNonce = response.headers.get('Nonce');

    if (retryNonce) {
      storeNonce = retryNonce;
      localStorage.setItem('dh_store_nonce', retryNonce);
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