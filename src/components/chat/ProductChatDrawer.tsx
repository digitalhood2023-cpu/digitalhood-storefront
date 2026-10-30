import { lazy, Suspense, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Loader2, Maximize2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ChatDrawerRouteState } from '@/lib/chatDrawerRoute'
import './product-chat-drawer.css'

const AccountMessagesPage = lazy(() => import('@/pages/AccountMessagesPage'))
export type ChatCloseState = { busy: boolean; attachments: boolean }

export default function ProductChatDrawer() {
  const location = useLocation(), navigate = useNavigate()
  const [closeState,setCloseState] = useState<ChatCloseState>({busy:false,attachments:false})
  const [notice,setNotice] = useState('')
  function canLeave() {
    if (closeState.busy) { setNotice('Please let the current send or photo preparation finish before leaving.'); return false }
    return !closeState.attachments || window.confirm('Leave this chat and discard unsent attachments, failed sends or an unfinished reply/edit? Ordinary text drafts are kept in this tab; original files are unchanged.')
  }
  function close() { if (canLeave()) navigate(-1) }
  function expand() {
    if (!canLeave()) return
    const state = location.state as ChatDrawerRouteState | null
    navigate(location.pathname,{replace:true,state:{...state,chatDrawer:false,backgroundLocation:undefined}})
  }
  return <Dialog.Root open onOpenChange={open => { if (!open) close() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="dh-seller-chat-overlay" />
      <Dialog.Content className="dh-seller-chat-drawer" data-seller-chat-drawer
        onEscapeKeyDown={event => { if (document.querySelector('[data-seller-chat-drawer] [role="dialog"]')) event.preventDefault() }}>
        <div className="dh-seller-chat-heading">
          <div><Dialog.Title>Message seller</Dialog.Title><Dialog.Description>Keep shopping while you talk. Nothing is sent until you choose Send.</Dialog.Description></div>
          <button type="button" onClick={expand} disabled={closeState.busy} aria-label="Open full messages inbox" title="Open full inbox"><Maximize2 aria-hidden="true" /></button>
          <button type="button" onClick={close} disabled={closeState.busy} aria-label="Close seller chat"><X aria-hidden="true" /></button>
        </div>
        {notice && <p role="status" className="dh-seller-chat-notice">{notice}</p>}
        <Suspense fallback={<div className="dh-seller-chat-loading" role="status"><Loader2 className="animate-spin" />Opening your conversation…</div>}>
          <AccountMessagesPage embedded onCloseStateChange={setCloseState} />
        </Suspense>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
