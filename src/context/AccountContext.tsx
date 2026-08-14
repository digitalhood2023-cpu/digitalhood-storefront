import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  clearAccountToken,
  getAccountToken,
  getCurrentCustomer,
  logoutCustomerAccount,
  setAccountToken,
  type AccountCustomer,
} from '@/api/account'
import { clearMarketplacePersonalBrowserState } from '@/lib/marketplaceBrowserState'
import { useCartStore } from '@/store/cartStore'

type AccountContextValue = {
  customer: AccountCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string
  setSession: (token: string, customer: AccountCustomer) => void
  refreshCustomer: () => Promise<AccountCustomer | null>
  updateCustomerInState: (customer: AccountCustomer) => void
  logout: () => Promise<void>
  clearError: () => void
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<AccountCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const setSession = useCallback((token: string, nextCustomer: AccountCustomer) => {
    setAccountToken(token)
    setCustomer(nextCustomer)
    setError('')
  }, [])

  const updateCustomerInState = useCallback((nextCustomer: AccountCustomer) => {
    setCustomer(nextCustomer)
    setError('')
  }, [])

  const refreshCustomer = useCallback(async () => {
    const token = getAccountToken()

    if (!token) {
      setCustomer(null)
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await getCurrentCustomer()
      setCustomer(response.customer)
      return response.customer
    } catch (requestError) {
      clearAccountToken()
      useCartStore.getState().clearCart()
      clearMarketplacePersonalBrowserState()
      setCustomer(null)

      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Your session has expired. Please sign in again.'
      )

      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError('')
    useCartStore.getState().clearCart()
    clearMarketplacePersonalBrowserState()
    setCustomer(null)

    try {
      await logoutCustomerAccount()
    } catch {
      clearAccountToken()
    } finally {
      useCartStore.getState().clearCart()
      clearMarketplacePersonalBrowserState()
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCustomer()
  }, [refreshCustomer])

  const value = useMemo<AccountContextValue>(
    () => ({
      customer,
      isAuthenticated: Boolean(customer),
      isLoading,
      error,
      setSession,
      refreshCustomer,
      updateCustomerInState,
      logout,
      clearError,
    }),
    [
      customer,
      isLoading,
      error,
      setSession,
      refreshCustomer,
      updateCustomerInState,
      logout,
      clearError,
    ]
  )

  return (
    <AccountContext.Provider value={value}>
      {children}
    </AccountContext.Provider>
  )
}

export function useAccount() {
  const context = useContext(AccountContext)

  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider')
  }

  return context
}
