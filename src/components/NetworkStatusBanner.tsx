import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

import { applyNetworkPreferences, isLowDataConnection } from '@/lib/networkResilience'

export default function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [lowData, setLowData] = useState(() => isLowDataConnection())

  useEffect(() => {
    const update = () => {
      applyNetworkPreferences()
      setOnline(navigator.onLine)
      setLowData(isLowDataConnection())
    }
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    window.addEventListener('digitalhood:data-saver-change', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      window.removeEventListener('digitalhood:data-saver-change', update)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[120] mx-auto flex max-w-md items-center gap-2 rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-medium text-white shadow-2xl"
    >
      <WifiOff className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
      <span>
        You’re offline. Public pages may use saved data; secure actions will wait for a connection.
        {lowData ? ' Data Saver is active.' : ''}
      </span>
    </div>
  )
}
