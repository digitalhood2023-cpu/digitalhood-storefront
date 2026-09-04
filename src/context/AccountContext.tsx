import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  clearCachedAccountCustomer,
  clearAccountToken,
  getCachedAccountCustomer,
  getAccountToken,
  getCurrentCustomer,
  isAccountUnauthorizedError,
  logoutCustomerAccount,
  setCachedAccountCustomer,
  setAccountToken,
  type AccountCustomer,
} from '@/api/account'
import { clearMarketplacePersonalBrowserState } from '@/lib/marketplaceBrowserState'
import { clearOfflineAccountQueue } from '@/lib/networkResilience'
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
  const [customer, setCustomer] = useState<AccountCustomer | null>(() =>
    getAccountToken() ? getCachedAccountCustomer() : null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const clearError = useCallback(() => {
    setError('')
  }, [])

  const setSession = useCallback((token: string, nextCustomer: AccountCustomer) => {
    setAccountToken(token)
    setCachedAccountCustomer(nextCustomer)
    setCustomer(nextCustomer)
    setError('')
  }, [])

  const updateCustomerInState = useCallback((nextCustomer: AccountCustomer) => {
    setCachedAccountCustomer(nextCustomer)
    setCustomer(nextCustomer)
    setError('')
  }, [])

  const refreshCustomer = useCallback(async () => {
    const token = getAccountToken()

    if (!token) {
      void clearOfflineAccountQueue()
      setCustomer(null)
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await getCurrentCustomer()
      if (response.token) {
        setAccountToken(response.token)
      }
      setCachedAccountCustomer(response.customer)
      setCustomer(response.customer)
      setError('')
      return response.customer
    } catch (requestError) {
      if (isAccountUnauthorizedError(requestError)) {
        clearAccountToken()
        clearCachedAccountCustomer()
        useCartStore.getState().clearCart()
        clearMarketplacePersonalBrowserState()
        void clearOfflineAccountQueue()
        setCustomer(null)
      }

      setError(
        isAccountUnauthorizedError(requestError)
          ? 'Your session has expired. Please sign in again.'
          : requestError instanceof Error
          ? requestError.message
          : 'We could not refresh your account. Your saved session is still active.'
      )

      return isAccountUnauthorizedError(requestError)
        ? null
        : getCachedAccountCustomer()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    setIsLoading(true)
    setError('')
    useCartStore.getState().clearCart()
    clearMarketplacePersonalBrowserState()
    clearCachedAccountCustomer()
    setCustomer(null)

    try {
      await logoutCustomerAccount()
    } catch {
      clearAccountToken()
      clearCachedAccountCustomer()
    } finally {
      useCartStore.getState().clearCart()
      clearMarketplacePersonalBrowserState()
      void clearOfflineAccountQueue()
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
