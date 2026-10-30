import type { Location } from 'react-router-dom'
import type { ChatProductIntent } from '@/api/chat'

export type ChatDrawerRouteState = {
  chatDrawer?: boolean
  chatTriggerId?: string
  backgroundLocation?: Location
  drawerProduct?: ChatProductIntent
  pendingProduct?: ChatProductIntent
  pendingOrder?: unknown
}

// History state is presentation only; the message API still authenticates and
// authorizes the actual conversation. Direct links retain the full inbox view.
export function getChatDrawerBackground(location: Pick<Location,'pathname'|'state'>): Location | null {
  const state = location.state as ChatDrawerRouteState | null
  const background = state?.backgroundLocation
  if (!state?.chatDrawer || !/^\/account\/messages\/[a-zA-Z0-9_-]{1,128}$/.test(location.pathname) || !background || !/^\/product\/[^?#\s]+$/.test(background.pathname)) return null
  if (typeof background.search !== 'string' || typeof background.hash !== 'string' || typeof background.key !== 'string') return null
  return {...background,state:null}
}

export function productChatDrawerState(location: Location, product: ChatProductIntent, chatTriggerId?: string): ChatDrawerRouteState {
  return {chatDrawer:true,chatTriggerId,backgroundLocation:{...location,state:null},drawerProduct:product,pendingProduct:product}
}
