import type { CartItem } from '@/store/cartStore'
import { getMarketplaceOrigin } from '@/lib/sellerDomains'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

const HANDOFF_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SELLER_CHECKOUT_SESSION_KEY = 'digitalhood_seller_checkout_session_v1'
const SELLER_CHECKOUT_SESSION_TTL_MS = 60 * 60 * 1000

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.success === false) {
    throw new Error(
      payload?.error ||
        'Secure checkout could not be opened. Please try again.'
    )
  }

  return payload
}

export async function createSellerCheckoutHandoff(items: CartItem[]) {
  const response = await fetch(
    `${PAYMENTS_API_URL}/api/public/storefront-checkout-handoffs`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: items.map((item) => ({
          productId: item.productId,
          variationId: item.variationId || 0,
          quantity: item.quantity,
        })),
      }),
    }
  )
  const payload = await parseResponse(response)
  const handoffId = String(payload?.handoffId || '')

  if (!HANDOFF_ID_PATTERN.test(handoffId)) {
    throw new Error('The secure checkout response was invalid.')
  }

  return { handoffId, expiresAt: payload.expiresAt as string | undefined }
}

export function submitSellerCheckoutHandoff(handoffId: string) {
  if (!HANDOFF_ID_PATTERN.test(handoffId)) {
    throw new Error('The secure checkout link is invalid.')
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = new URL('/checkout/store-handoff', getMarketplaceOrigin()).toString()
  form.style.display = 'none'

  const input = document.createElement('input')
  input.type = 'hidden'
  input.name = 'handoffId'
  input.value = handoffId
  form.appendChild(input)
  document.body.appendChild(form)
  form.submit()
}

export type SellerCheckoutHandoff = {
  success: true
  handoff: {
    id: string
    hostname: string
    expiresAt?: string
  }
  seller: {
    id: string
    key: string
    storeName: string
    profilePhotoUrl?: string
  }
  items: CartItem[]
  returnUrl: string
}

export function rememberSellerCheckoutHandoff(handoff: SellerCheckoutHandoff) {
  try {
    window.sessionStorage.setItem(
      SELLER_CHECKOUT_SESSION_KEY,
      JSON.stringify({ storedAt: Date.now(), handoff })
    )
  } catch {
    // The in-memory checkout remains usable when storage is unavailable.
  }
}

export function readRememberedSellerCheckoutHandoff() {
  try {
    const raw = window.sessionStorage.getItem(SELLER_CHECKOUT_SESSION_KEY)
    const value = raw ? JSON.parse(raw) : null

    if (
      !value?.handoff?.success ||
      !Array.isArray(value.handoff.items) ||
      Date.now() - Number(value.storedAt || 0) > SELLER_CHECKOUT_SESSION_TTL_MS
    ) {
      window.sessionStorage.removeItem(SELLER_CHECKOUT_SESSION_KEY)
      return null
    }

    return value.handoff as SellerCheckoutHandoff
  } catch {
    return null
  }
}

export function clearRememberedSellerCheckoutHandoff() {
  try {
    window.sessionStorage.removeItem(SELLER_CHECKOUT_SESSION_KEY)
  } catch {
    // No action is required when storage is unavailable.
  }
}

export async function consumeSellerCheckoutHandoff() {
  const response = await fetch('/api/checkout/store-handoff', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (response.status === 404) return null
  return (await parseResponse(response)) as SellerCheckoutHandoff
}
