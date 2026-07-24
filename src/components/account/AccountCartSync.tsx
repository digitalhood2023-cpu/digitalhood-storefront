import { useEffect } from 'react'

import {
  clearLegacyCustomerBrowserData,
  getCustomerCart,
  saveCustomerCart,
} from '@/api/account'
import { useAccount } from '@/context/AccountContext'
import { useCartStore } from '@/store/cartStore'

export default function AccountCartSync() {
  const { customer, isAuthenticated, isLoading } = useAccount()

  useEffect(() => {
    clearLegacyCustomerBrowserData()

    let active = true
    let hydrated = false
    let unsubscribe = () => {}
    let saveQueue = Promise.resolve()

    useCartStore.getState().replaceItems([])

    if (isLoading || !isAuthenticated || !customer?.id) {
      return () => {
        active = false
      }
    }

    const customerId = String(customer.id)

    getCustomerCart()
      .then((response) => {
        if (!active || String(customer.id) !== customerId) return

        useCartStore.getState().replaceItems(response.items || [])
        hydrated = true

        unsubscribe = useCartStore.subscribe((state, previousState) => {
          if (!active || !hydrated || state.items === previousState.items) return

          const snapshot = state.items.map((item) => ({ ...item }))
          saveQueue = saveQueue
            .catch(() => undefined)
            .then(async () => {
              if (!active) return
              await saveCustomerCart(snapshot)
            })
            .catch((error) => {
              console.error('[Account Cart] Unable to save cart.', error)
            })
        })
      })
      .catch((error) => {
        if (!active) return
        hydrated = true
        console.error('[Account Cart] Unable to load cart.', error)
      })

    return () => {
      active = false
      hydrated = false
      unsubscribe()
      useCartStore.getState().replaceItems([])
    }
  }, [customer?.id, isAuthenticated, isLoading])

  return null
}
