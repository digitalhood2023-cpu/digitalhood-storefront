import { useEffect, useState } from 'react'
import { getPublicFeedback } from '@/api/feedback'

export default function SellerChatFeedback({ sellerKey }: { sellerKey: string }) {
  const [result, setResult] = useState<{ key: string; percent: number | null; empty: boolean } | null>(null)
  useEffect(() => {
    if (!sellerKey) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    getPublicFeedback('sellers', sellerKey, 1, controller.signal).then(({ summary }) => {
      if (controller.signal.aborted) return
      const percent = summary?.positivePercent
      const known = summary?.count > 0 && typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100
      setResult({ key: sellerKey, percent: known ? Math.round(percent) : null, empty: summary?.count === 0 })
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key: sellerKey, percent: null, empty: false })
    }).finally(() => window.clearTimeout(timeout))
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [sellerKey])
  const current = result?.key === sellerKey ? result : null
  const label = current?.percent != null ? `${current.percent}% positive seller feedback` : current?.empty ? 'No seller feedback yet' : 'Seller feedback unavailable'
  return <span className="dh-chat-feedback" aria-label={label} title={label}>{current?.percent != null ? current.percent : '—'}%</span>
}
