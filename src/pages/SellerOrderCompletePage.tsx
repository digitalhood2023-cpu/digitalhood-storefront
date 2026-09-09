import { useEffect } from 'react'

import { useCartStore } from '@/store/cartStore'

export const SELLER_ORDER_COMPLETE_NOTICE = 'digitalhood_seller_order_complete_notice'

export default function SellerOrderCompletePage() {
  useEffect(() => {
    const itemIds = new URLSearchParams(window.location.search)
      .get('items')
      ?.split(',')
      .map((value) => Number(value))
      .filter((value) => Number.isSafeInteger(value) && value > 0)
      .slice(0, 50) || []

    for (const itemId of itemIds) {
      useCartStore.getState().removeItem(itemId)
    }

    try {
      window.sessionStorage.setItem(SELLER_ORDER_COMPLETE_NOTICE, '1')
    } catch {
      // The redirect still succeeds when session storage is unavailable.
    }

    window.location.replace('/')
  }, [])

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-black text-[#26248c]">Returning to your store…</p>
      </div>
    </div>
  )
}
