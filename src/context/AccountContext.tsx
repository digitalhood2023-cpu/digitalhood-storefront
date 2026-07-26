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
  clearLegacyCustomerBrowserData,
  getAccountToken,
  getCurrentCustomer,
  logoutCustomerAccount,
  saveCustomerCart,
  setAccountToken,
  type AccountCustomer,
} from '@/api/account'

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
    clearLegacyCustomerBrowserData()
    useCartStore.getState().replaceItems([])
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
      clearLegacyCustomerBrowserData()
      useCartStore.getState().replaceItems([])
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
      clearLegacyCustomerBrowserData()
      useCartStore.getState().replaceItems([])
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

    try {
      if (customer?.id) {
        await saveCustomerCart(useCartStore.getState().items)
      }
    } catch {
      // Logout must continue even if the final cart save is unavailable.
    }

    try {
      await logoutCustomerAccount()
    } catch {
      clearAccountToken()
    } finally {
      clearLegacyCustomerBrowserData()
      useCartStore.getState().replaceItems([])
      setCustomer(null)
      setIsLoading(false)
    }
  }, [customer?.id])

  useEffect(() => {
    clearLegacyCustomerBrowserData()
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
