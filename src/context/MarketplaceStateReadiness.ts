import { createContext, useContext } from 'react'

export const MarketplaceStateReadyContext = createContext(false)

export function useMarketplaceStateReady() {
  return useContext(MarketplaceStateReadyContext)
}
